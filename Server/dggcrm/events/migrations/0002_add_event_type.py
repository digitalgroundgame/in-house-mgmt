# Generated migration to fix event_type typo and add missing column

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="event_type",
            field=models.CharField(
                choices=[("generic", "Generic"), ("internal", "Internal")],
                default="generic",
                help_text="The type of event deciedes the behavior.",
            ),
        ),
    ]
