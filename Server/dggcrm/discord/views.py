import logging
import os

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from dggcrm.contacts.models import Contact, Tag, TagAssignments

from .client import get_discord_client

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
