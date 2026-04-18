from datetime import datetime

DISCORD_DM_URL = "https://discord.com/users/{discord_id}"

TICKET_TEMPLATES = [
    {
        "name": "Introduction Template",
        "ticket_type": "INTRODUCTION",
        "title_template": "Intro yourself to {{contact.display_name}}",
        "description_template": """Hi {{contact.discord_id}},

Welcome to DGG! We'd love to get to know you better.

---

## Instructions

Follow these steps to complete this task:

1. Open Discord
2. Send a DM to this user
3. Copy the message below

```
Hi {{contact.display_name}},

Welcome to DGG! We'd love to get to know you better.

Please reply with a brief intro about yourself:

1. What's your name?
2. Where are you from?
3. What brings you to DGG?
4. Any hobbies or interests?

Thanks!
```

---

Please reply with your responses when ready!""",
        "default_priority": 3,
        "requires_contact": True,
        "requires_event": False,
    },
    {
        "name": "Recruit for Event Template",
        "ticket_type": "RECRUIT",
        "title_template": "Event Recruitment for {{event.name}}",
        "description_template": """
We need to recruit {{contact.display_name}} for {{event.name}}.

## Instructions

Follow these steps:

1. [Click to open a DM with {{contact.display_name}}](https://discord.com/users/{{contact.discord_id}}/)
2. Copy the message below

```
Hi {{contact.display_name}},

We're hosting an upcoming event: **{{event.name}}**

{{event.description}}

📍 Location: {{event.location_display}}
📅 Date: {{event.starts_at|date:"SHORT_DATETIME_FORMAT"}}

Would you like to attend? Please let us know!

Thanks!
```

---

Please let us know if you can make it!""",
        "default_priority": 2,
        "requires_contact": True,
        "requires_event": True,
    },
    {
        "name": "Internal Call Banking Template",
        "ticket_type": "INTERNAL",
        "title_template": "Internal Call: {{contact.display_name}}",
        "description_template": """Internal call banking task for {{contact.display_name}}.

## Instructions

1. [Click to open a DM with {{contact.display_name}}](https://discord.com/users/{{contact.discord_id}}/)
2. Copy the message below

```
Hi {{contact.display_name}},

We'd like to schedule an internal call with you.

Please let us know your availability!

Thanks!
```
""",
        "default_priority": 2,
        "requires_contact": True,
        "requires_event": False,
    },
    {
        "name": "Confirm Event Participation",
        "ticket_type": "CONFIRM",
        "title_template": "Confirm: {{event.name}}",
        "description_template": """
We need to confirm that {{contact.display_name}} is still interested in attending {{event.name}}.

## Instructions

1. [Click to open a DM with {{contact.display_name}}](https://discord.com/users/{{contact.discord_id}}/)
2. Copy the message below

```
Hi {{contact.display_name}},

Just a friendly reminder about the upcoming event:

{{event.name}}
📍 {{event.location_display}}
📅 {{event.starts_at|date:"SHORT_DATETIME_FORMAT"}}

Are you still able to attend? Please confirm your attendance.

Thanks!
```
""",
        "default_priority": 2,
        "requires_contact": True,
        "requires_event": True,
    },
]


def render_template(template_str: str, contact: dict, event: dict | None = None) -> str:
    """Render a template string with contact and event context."""
    result = template_str

    result = result.replace("{{contact.display_name}}", contact.get("display_name", "User"))
    result = result.replace("{{contact.discord_id}}", str(contact.get("discord_id", "")))

    if event:
        result = result.replace("{{event.name}}", event.get("name", "Event"))
        result = result.replace("{{event.description}}", event.get("description", ""))
        result = result.replace("{{event.location_display}}", event.get("location_display", "TBD"))
        result = result.replace('{{event.starts_at|date:"SHORT_DATETIME_FORMAT"}}', event.get("starts_at", "TBD"))

    return result


def populate_templates(conn):
    """Populate the database with ticket templates."""
    c = conn.cursor()
    now = datetime.now()

    for tpl in TICKET_TEMPLATES:
        c.execute(
            """INSERT INTO ticket_templates (name, ticket_type, title_template, description_template, default_priority, requires_contact, requires_event, created_at, modified_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (name) DO NOTHING""",
            (
                tpl["name"],
                tpl["ticket_type"],
                tpl["title_template"],
                tpl["description_template"],
                tpl["default_priority"],
                tpl["requires_contact"],
                tpl["requires_event"],
                now,
                now,
            ),
        )
    conn.commit()
    print(f"Populated {len(TICKET_TEMPLATES)} ticket templates.")
