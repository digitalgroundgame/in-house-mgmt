import os
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from dggcrm.contacts.models import Contact, Tag, TagAssignments
from .client import get_discord_client

logger = logging.getLogger(__name__)


class SyncMembershipTagsView(APIView):
    """
    POST /api/discord/sync-membership/

    Fetches all Discord guild members and syncs membership tags for contacts.
    """

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

        added = 0
        removed = 0

        # Sync tags for all contacts with discord_id
        for contact in Contact.objects.exclude(discord_id=""):
            is_member = contact.discord_id in member_ids
            has_tag = TagAssignments.objects.filter(contact=contact, tag=tag).exists()

            if is_member and not has_tag:
                TagAssignments.objects.create(contact=contact, tag=tag)
                added += 1
            elif not is_member and has_tag:
                TagAssignments.objects.filter(contact=contact, tag=tag).delete()
                removed += 1

        logger.info(f"Sync complete: added={added}, removed={removed}")

        return Response({
            "members_fetched": len(member_ids),
            "tags_added": added,
            "tags_removed": removed,
        })
