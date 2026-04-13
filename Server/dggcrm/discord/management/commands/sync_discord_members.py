from django.core.management.base import BaseCommand, CommandError

from dggcrm.discord.client import get_discord_client
from dggcrm.discord.views import run_sync


class Command(BaseCommand):
    help = "Sync Discord guild members and role tags into CRM contacts"

    def handle(self, *args, **options):
        client = get_discord_client()
        if not client:
            raise CommandError("Discord bot not configured.")

        result = run_sync(client)

        self.stdout.write(
            f"Sync complete: members_fetched={result['members_fetched']}, "
            f"roles_fetched={result['roles_fetched']}, "
            f"contacts_created={result['contacts']['created']}, "
            f"contacts_updated={result['contacts']['updated']}, "
            f"membership_tags_added={result['membership_tags']['added']}, "
            f"membership_tags_removed={result['membership_tags']['removed']}, "
            f"role_tags_added={result['role_tags']['added']}, "
            f"role_tags_removed={result['role_tags']['removed']}"
        )
