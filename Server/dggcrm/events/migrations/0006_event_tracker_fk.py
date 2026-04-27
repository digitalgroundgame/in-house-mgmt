from django.conf import settings
from django.db import migrations, models


def backfill_event_tracker_fk(apps, schema_editor):
    """Resolve each row's stored Discord ID to a CRM User via DiscordID.
    Drop rows whose Discord ID isn't linked — the new FK can't be null
    and there's no safe default."""
    StagedEventParticipation = apps.get_model("events", "StagedEventParticipation")
    DiscordID = apps.get_model("accounts", "DiscordID")

    discord_to_user_id = dict(
        DiscordID.objects.filter(active=True).values_list("discord_id", "user_id")
    )

    to_update = []
    unresolvable_ids = []
    for row in StagedEventParticipation.objects.all():
        user_id = discord_to_user_id.get(row.event_tracker_discord_id)
        if user_id is None:
            unresolvable_ids.append(row.id)
            continue
        row.event_tracker_crm_user_id = user_id
        to_update.append(row)

    if to_update:
        StagedEventParticipation.objects.bulk_update(to_update, ["event_tracker_crm_user"])

    if unresolvable_ids:
        print(
            f"  ! Dropping {len(unresolvable_ids)} StagedEventParticipation row(s) "
            f"whose event_tracker_discord_id has no active DiscordID link: {unresolvable_ids}"
        )
        StagedEventParticipation.objects.filter(id__in=unresolvable_ids).delete()


def reverse_backfill(apps, schema_editor):
    """Best-effort reverse: copy the User's first active DiscordID back into the string column."""
    StagedEventParticipation = apps.get_model("events", "StagedEventParticipation")
    DiscordID = apps.get_model("accounts", "DiscordID")

    user_to_discord_id = {}
    for did in DiscordID.objects.filter(active=True).order_by("id"):
        user_to_discord_id.setdefault(did.user_id, did.discord_id)

    rows = StagedEventParticipation.objects.all()
    for row in rows:
        row.event_tracker_discord_id = user_to_discord_id.get(row.event_tracker_crm_user_id, "")
    StagedEventParticipation.objects.bulk_update(rows, ["event_tracker_discord_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_add_discord_id"),
        ("events", "0005_per_tracker_staged_participations"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="stagedeventparticipation",
            name="event_tracker_crm_user",
            field=models.ForeignKey(
                null=True,
                on_delete=models.deletion.CASCADE,
                to=settings.AUTH_USER_MODEL,
                related_name="recorded_staged_participations",
                help_text="CRM user (organizer) whose tracking session produced this row",
            ),
        ),
        migrations.RunPython(backfill_event_tracker_fk, reverse_backfill),
        migrations.AlterField(
            model_name="stagedeventparticipation",
            name="event_tracker_crm_user",
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                to=settings.AUTH_USER_MODEL,
                related_name="recorded_staged_participations",
                help_text="CRM user (organizer) whose tracking session produced this row",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="stagedeventparticipation",
            unique_together={("staged_event", "event_tracker_crm_user", "discord_id")},
        ),
        migrations.RemoveIndex(
            model_name="stagedeventparticipation",
            name="staged_part_tracker_idx",
        ),
        migrations.RemoveField(
            model_name="stagedeventparticipation",
            name="event_tracker_discord_id",
        ),
    ]
