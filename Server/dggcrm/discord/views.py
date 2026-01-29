import os
import logging

from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from dggcrm.contacts.models import Contact, Tag, TagAssignments
from .client import get_discord_client

logger = logging.getLogger(__name__)


class SyncMembershipTagsView(APIView):
    """
    POST /api/discord/sync-membership/

    Fetches all Discord guild members and syncs membership tags for contacts.
    Requires authentication.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Get the injected client singleton
        client = get_discord_client()
        if not client:
            return Response(
                {"error": "Discord bot not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Fetch all member IDs from Discord
        member_ids = client.fetch_all_member_ids()

        # Get or create the membership tag
        tag_name = os.environ.get("DISCORD_MEMBERSHIP_TAG", "DGG Discord")
        tag, _ = Tag.objects.get_or_create(name=tag_name)

        with transaction.atomic():
            # Fetch all contacts with discord_id in one query
            contacts_with_discord = Contact.objects.exclude(discord_id="")
            contacts_by_discord_id = {c.discord_id: c for c in contacts_with_discord}

            # Fetch all existing tag assignments for this tag in one query
            existing_assignments = set(
                TagAssignments.objects.filter(
                    tag=tag,
                    contact__in=contacts_with_discord
                ).values_list("contact_id", flat=True)
            )

            # Determine which contacts need tags added/removed
            to_add = []
            to_remove_contact_ids = []

            for discord_id, contact in contacts_by_discord_id.items():
                is_member = discord_id in member_ids
                has_tag = contact.id in existing_assignments

                if is_member and not has_tag:
                    to_add.append(TagAssignments(contact=contact, tag=tag))
                elif not is_member and has_tag:
                    to_remove_contact_ids.append(contact.id)

            # Bulk create new assignments
            TagAssignments.objects.bulk_create(to_add, ignore_conflicts=True)
            added = len(to_add)

            # Bulk delete removed assignments
            removed, _ = TagAssignments.objects.filter(
                tag=tag,
                contact_id__in=to_remove_contact_ids
            ).delete()

        logger.info(f"Sync complete: added={added}, removed={removed}")

        return Response({
            "members_fetched": len(member_ids),
            "tags_added": added,
            "tags_removed": removed,
        })
