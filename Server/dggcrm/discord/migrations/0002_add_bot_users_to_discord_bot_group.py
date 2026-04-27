from django.db import migrations

DISCORD_BOT_GROUP = "DISCORD_BOT"
BOT_USERNAMES = ("discord-bot", "discord-bot-dev")


def add_bot_users_to_group(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    User = apps.get_model("auth", "User")
    group, _ = Group.objects.get_or_create(name=DISCORD_BOT_GROUP)
    for username in BOT_USERNAMES:
        user = User.objects.filter(username=username).first()
        if user:
            user.groups.add(group)


def remove_bot_users_from_group(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    User = apps.get_model("auth", "User")
    group = Group.objects.filter(name=DISCORD_BOT_GROUP).first()
    if not group:
        return
    for username in BOT_USERNAMES:
        user = User.objects.filter(username=username).first()
        if user:
            user.groups.remove(group)


class Migration(migrations.Migration):
    dependencies = [
        ("dggdiscord", "0001_create_discord_bot_group"),
    ]

    operations = [
        migrations.RunPython(add_bot_users_to_group, remove_bot_users_from_group),
    ]
