from django.db import migrations, models


def backfill_tracker_from_staged_event(apps, schema_editor):
    """Copy event_tracker_discord_id from each row's parent StagedEvent."""
    StagedEventParticipation = apps.get_model("events", "StagedEventParticipation")
    rows = StagedEventParticipation.objects.select_related("staged_event").all()
    for row in rows:
        row.event_tracker_discord_id = row.staged_event.event_tracker_discord_id
    StagedEventParticipation.objects.bulk_update(rows, ["event_tracker_discord_id"])


def reverse_backfill(apps, schema_editor):
    """Best-effort reverse: copy any one row's tracker back onto its StagedEvent."""
    StagedEvent = apps.get_model("events", "StagedEvent")
    for event in StagedEvent.objects.all():
        first = event.participants.first()
        if first:
            event.event_tracker_discord_id = first.event_tracker_discord_id
            event.save(update_fields=["event_tracker_discord_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0004_alter_stagedevent_options"),
    ]

    operations = [
        migrations.AddField(
            model_name="stagedeventparticipation",
            name="event_tracker_discord_id",
            field=models.CharField(
                max_length=64,
                null=True,
                help_text="Discord user ID of the organizer whose tracking session produced this row",
            ),
        ),
        migrations.RunPython(backfill_tracker_from_staged_event, reverse_backfill),
        migrations.AlterField(
            model_name="stagedeventparticipation",
            name="event_tracker_discord_id",
            field=models.CharField(
                max_length=64,
                help_text="Discord user ID of the organizer whose tracking session produced this row",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="stagedeventparticipation",
            unique_together={("staged_event", "event_tracker_discord_id", "discord_id")},
        ),
        migrations.AddIndex(
            model_name="stagedeventparticipation",
            index=models.Index(
                fields=["event_tracker_discord_id"],
                name="staged_part_tracker_idx",
            ),
        ),
        migrations.RemoveIndex(
            model_name="stagedevent",
            name="staged_even_event_t_d01e78_idx",
        ),
        migrations.RemoveField(
            model_name="stagedevent",
            name="event_tracker_discord_id",
        ),
    ]
