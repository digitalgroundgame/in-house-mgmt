import logging
import os

from django.db import transaction
from rest_framework import status
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from dggcrm.contacts.models import Contact, Tag, TagAssignments
from dggcrm.events.models import StagedEvent, StagedEventParticipation

from .client import get_discord_client
from .permissions import CanRecordAttendance
from .serializers import RecordAttendanceSerializer

logger = logging.getLogger(__name__)


def _int_to_hex(color_int: int) -> str:
    """Convert Discord role color integer to hex string."""
    return f"#{color_int:06x}"


class SyncMembershipTagsView(APIView):
    """
    POST /api/discord/sync-membership/

    Fetches all Discord guild members and syncs membership tags for contacts.
    Also fetches Discord roles and syncs them as tags with assignments.
    Requires authentication.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        client = get_discord_client()
        if not client:
            return Response({"error": "Discord bot not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        roles = client.fetch_all_roles()
        members = client.fetch_all_members_with_roles()
        member_ids = {m["id"] for m in members}

        role_id_to_tag = {}

        with transaction.atomic():
            # Upsert tags from Discord roles (name + color)
            for role in roles:
                discord_role_id = role["id"]
                role_name = role["name"]
                role_color = _int_to_hex(role["color"])

                tag, created = Tag.objects.update_or_create(
                    name=role_name,
                    defaults={"color": role_color},
                )
                role_id_to_tag[discord_role_id] = tag

            # Get or create the membership tag (e.g., "DGG Discord")
            membership_tag_name = os.environ.get("DISCORD_MEMBERSHIP_TAG", "DGG Discord")
            membership_tag, _ = Tag.objects.get_or_create(name=membership_tag_name)

            existing_contacts = {c.discord_id: c for c in Contact.objects.exclude(discord_id="")}

            created = 0
            updated = 0
            added = 0
            role_tags_added = 0

            tag_assignments_to_add = []
            existing_tag_assignment_keys = set(TagAssignments.objects.values_list("contact_id", "tag_id"))

            # Track which role assignments should exist after sync
            expected_role_assignments: set[tuple[int, int]] = set()

            for member in members:
                discord_id = member["id"]
                display_name = member["display_name"]
                member_role_ids = set(member.get("role_ids", []))

                contact = existing_contacts.get(discord_id)
                if not contact:
                    contact = Contact(discord_id=discord_id, full_name=display_name)
                    contact.save()
                    existing_contacts[discord_id] = contact
                    created += 1
                else:
                    if contact.full_name != display_name:
                        contact.full_name = display_name
                        contact.save(update_fields=["full_name"])
                        updated += 1

                # Add membership tag if missing
                has_membership_tag = (contact.id, membership_tag.id) in existing_tag_assignment_keys
                if not has_membership_tag:
                    tag_assignments_to_add.append(TagAssignments(contact=contact, tag=membership_tag))
                    added += 1

                # Add role tags and track expected assignments
                for role_id in member_role_ids:
                    tag = role_id_to_tag.get(role_id)
                    if tag:
                        expected_role_assignments.add((contact.id, tag.id))
                        assignment_key = (contact.id, tag.id)
                        if assignment_key not in existing_tag_assignment_keys:
                            tag_assignments_to_add.append(TagAssignments(contact=contact, tag=tag))
                            role_tags_added += 1

            TagAssignments.objects.bulk_create(tag_assignments_to_add, ignore_conflicts=True)

            # Remove membership tags for contacts who left the guild
            contacts_to_remove = Contact.objects.exclude(discord_id__in=member_ids)
            removed, _ = TagAssignments.objects.filter(tag=membership_tag, contact__in=contacts_to_remove).delete()

            # Remove role tags for members who no longer have those roles
            existing_role_tags = set(role_id_to_tag.values())
            role_tags_removed = 0
            if existing_role_tags:
                for assignment in TagAssignments.objects.filter(tag__in=existing_role_tags):
                    if (assignment.contact_id, assignment.tag_id) not in expected_role_assignments:
                        assignment.delete()
                        role_tags_removed += 1

        logger.info(
            f"Sync complete: created={created}, updated={updated}, "
            f"tags_added={added}, role_tags_added={role_tags_added}, "
            f"tags_removed={removed}, role_tags_removed={role_tags_removed}"
        )

        return Response(
            {
                "members_fetched": len(member_ids),
                "roles_fetched": len(roles),
                "contacts": {
                    "created": created,
                    "updated": updated,
                },
                "membership_tags": {
                    "added": added,
                    "removed": removed,
                },
                "role_tags": {
                    "added": role_tags_added,
                    "removed": role_tags_removed,
                },
            }
        )


class RecordAttendanceView(APIView):
    """
    POST /api/discord/record-attendance/

    Stages attendance from the Discord bot. Creates or updates a
    StagedEvent row keyed by discord_event_id; replaces its participants
    with the payload's list. All participants are staged regardless of
    whether a matching Contact exists; the response flags those without
    a Contact so the bot can DM the organizer.

    Idempotent: retries with the same payload are safe. Participants
    already promoted into EventParticipation (imported_at is not null)
    are preserved across retries — their imported_at is never cleared,
    though their discord_name is refreshed to reflect display-name
    changes the bot may have picked up.
    """

    permission_classes = [CanRecordAttendance]
    authentication_classes = [TokenAuthentication, SessionAuthentication]

    def post(self, request):
        serializer = RecordAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        participants = data["participants"]
        participant_discord_ids = [p["discord_id"] for p in participants]

        known_discord_ids = set(
            Contact.objects.filter(discord_id__in=participant_discord_ids).values_list("discord_id", flat=True)
        )
        unlinked_participants = [p for p in participants if p["discord_id"] not in known_discord_ids]

        with transaction.atomic():
            staged_event, _ = StagedEvent.objects.update_or_create(
                discord_event_id=data["event_id"],
                defaults={
                    "event_name": data["event_name"],
                    "event_tracker_discord_id": data["event_tracker"],
                },
            )
            # Preserve already-imported participations: a bot retry should never
            # un-do a downstream import. ignore_conflicts skips bulk_create rows
            # whose (staged_event, discord_id) already exists on the imported side.
            imported_discord_ids = set(
                staged_event.participants.filter(imported_at__isnull=False).values_list("discord_id", flat=True)
            )
            staged_event.participants.filter(imported_at__isnull=True).delete()
            StagedEventParticipation.objects.bulk_create(
                [
                    StagedEventParticipation(
                        staged_event=staged_event,
                        discord_id=p["discord_id"],
                        discord_name=p["discord_name"],
                        status=p["status"],
                    )
                    for p in participants
                ],
                ignore_conflicts=True,
            )
            # Refresh discord_name on already-imported rows so retries capture
            # display-name changes that bulk_create's ignore_conflicts skips.
            if imported_discord_ids:
                name_by_id = {
                    p["discord_id"]: p["discord_name"] for p in participants if p["discord_id"] in imported_discord_ids
                }
                imported_rows = list(staged_event.participants.filter(discord_id__in=imported_discord_ids))
                for row in imported_rows:
                    if row.discord_id in name_by_id:
                        row.discord_name = name_by_id[row.discord_id]
                StagedEventParticipation.objects.bulk_update(imported_rows, ["discord_name"])

        return Response(
            {
                "event_id": staged_event.discord_event_id,
                "total_received": len(participants),
                "unlinked_participants": [
                    {"discord_id": p["discord_id"], "discord_name": p["discord_name"]} for p in unlinked_participants
                ],
            },
            status=status.HTTP_200_OK,
        )
