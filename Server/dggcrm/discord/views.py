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


class SyncMembershipTagsView(APIView):
    """
    POST /api/discord/sync-membership/

    Fetches all Discord guild members and syncs membership tags for contacts.
    Requires authentication.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        client = get_discord_client()
        if not client:
            return Response({"error": "Discord bot not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Fetch all Discord members (id + display_name)
        members = client.fetch_all_members()
        member_ids = {m["id"] for m in members}

        # Get or create the membership tag
        tag_name = os.environ.get("DISCORD_MEMBERSHIP_TAG", "DGG Discord")
        tag, _ = Tag.objects.get_or_create(name=tag_name)

        created = 0
        updated = 0
        added = 0

        with transaction.atomic():
            # Fetch existing contacts by discord_id
            existing_contacts = {c.discord_id: c for c in Contact.objects.exclude(discord_id="")}

            tag_assignments_to_add = []

            for member in members:
                discord_id = member["id"]
                display_name = member["display_name"]

                # Get or create the Contact
                contact = existing_contacts.get(discord_id)
                if not contact:
                    contact = Contact(discord_id=discord_id, full_name=display_name)
                    contact.save()
                    existing_contacts[discord_id] = contact
                    created += 1
                else:
                    # Update full_name if changed
                    if contact.full_name != display_name:
                        contact.full_name = display_name
                        contact.save(update_fields=["full_name"])
                        updated += 1

                # Check if TagAssignments already exist
                has_tag = TagAssignments.objects.filter(tag=tag, contact=contact).exists()
                if not has_tag:
                    tag_assignments_to_add.append(TagAssignments(contact=contact, tag=tag))
                    added += 1

            # Bulk create tag assignments safely
            TagAssignments.objects.bulk_create(tag_assignments_to_add, ignore_conflicts=True)

            # Remove tag assignments for contacts no longer in the guild
            contacts_to_remove = Contact.objects.exclude(discord_id__in=member_ids)
            removed, _ = TagAssignments.objects.filter(tag=tag, contact__in=contacts_to_remove).delete()

        logger.info(f"Sync complete: created={created}, updated={updated}, tags_added={added}, tags_removed={removed}")

        return Response(
            {
                "members_fetched": len(member_ids),
                "contacts_created": created,
                "updated_contacts": updated,
                "tags_added": added,
                "tags_removed": removed,
            }
        )
