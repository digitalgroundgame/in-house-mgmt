import argparse
import random
import sqlite3
from datetime import datetime, timedelta
from urllib.parse import urlparse

import psycopg
from faker import Faker

from fake_templates import populate_templates, TICKET_TEMPLATES, render_template

# Test Discord users from dev server for sync endpoint testing
DISCORD_TEST_USERS = [
    {"discord_id": "135858410104160258", "username": "gioodiazz"},
    {"discord_id": "178204461750026241", "username": "tummyy"},
    {"discord_id": "185814933445804032", "username": "lordgator"},
    {"discord_id": "191600336333438977", "username": "ishewndagoon"},
    {"discord_id": "207250631948369920", "username": "cuteasf"},
    {"discord_id": "233680930202451968", "username": "midlaneriven"},
    {"discord_id": "239236282297876481", "username": "toastybois"},
    {"discord_id": "328014703987130369", "username": "dirtyweeb"},
    {"discord_id": "333408871391559702", "username": ".lorddeimos"},
    {"discord_id": "380042888047755274", "username": "thunder93123"},
    {"discord_id": "408724060541943808", "username": "elpresidentecam"},
    {"discord_id": "696062040195989534", "username": "sneakiwi"},
    {"discord_id": "711022201062555710", "username": "jo2342342"},
    {"discord_id": "836964327943831552", "username": "jaykilla_lol"},
]


# --- DB Connection ---
def get_db_conn(dsn: str):
    parsed = urlparse(dsn)
    if parsed.scheme == "sqlite":
        return sqlite3.connect(parsed.path if parsed.path != "/:memory:" else ":memory:")
    if parsed.scheme in {"postgres", "postgresql"}:
        return psycopg.connect(dsn)
    raise ValueError(f"Unsupported DB scheme: {parsed.scheme}")


def generate_ticket_description(fake):
    title = " ".join(fake.words(2)).title()
    inline_code = "`send message`"
    block_code = f"""```\n{" ".join(fake.words(8))}\n{" ".join(fake.words(3))}\n```"""

    table = "| Key | Thing |\n|------|-------|\n| {word} | `{msg}` |".format(
        word="".join(fake.words(1)), msg=" ".join(fake.words(2))
    )

    markdown = f"""
# {title}

This is a fake ticket

---

## Instructions

Follow these instructions

1. Open Discord
2. Click {inline_code}
3. Copy below

{block_code}

---

## Example Table

{table}

"""
    return markdown.strip()


# --- Fake Data Population ---
def populate_with_fake_data(conn, num_contacts=50, num_events=25, num_tickets=30):
    fake = Faker()
    c = conn.cursor()

    # Insert tags
    tags = [
        # Skills/Roles
        "Dev-Software",
        "Dev-Art",
        "Community Building",
        "Attendance",
        # Membership
        "DGG Discord",
    ]
    for tag in tags:
        color = random.choice(["#b98141", "#803e3e", "#f647a2", "#1854f5"])
        now = datetime.now()
        c.execute(
            "INSERT INTO tags (name, color, created_at, modified_at) VALUES (%s, %s, %s, %s) "
            "ON CONFLICT (name) DO NOTHING",
            (tag, color, now, now),
        )
    conn.commit()

    c.execute("SELECT id, name FROM tags")
    tag_map = {row[1]: row[0] for row in c.fetchall()}

    # Insert event categories
    event_categories = [
        ("Canvassing", "Door-to-door voter outreach and engagement"),
        ("Phone Banking", "Calling voters to share information and gather support"),
        ("Software Development", "Building and maintaining digital tools and platforms"),
        ("Data Entry", "Processing and entering collected field data"),
        ("Training", "Onboarding and skills training for volunteers"),
        ("Community Event", "Public-facing community gatherings and town halls"),
    ]
    for name, description in event_categories:
        now = datetime.now()
        c.execute(
            "INSERT INTO event_categories (name, description, created_at, modified_at) VALUES (%s, %s, %s, %s) "
            "ON CONFLICT (name) DO NOTHING",
            (name, description, now, now),
        )
    conn.commit()

    c.execute("SELECT id FROM event_categories")
    category_ids = [row[0] for row in c.fetchall()]

    populate_templates(conn)

    # Create Discord test users first (for sync endpoint testing)
    discord_test_contact_ids = []
    for user in DISCORD_TEST_USERS:
        full_name = user["username"].replace("_", " ").replace(".", "").title()
        c.execute(
            "INSERT INTO contacts (full_name, discord_id, email, phone, note, created_at, modified_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (
                full_name,
                user["discord_id"],
                f"{user['username']}@test.local",
                "",
                "Discord test user for sync endpoint testing",
                datetime.now(),
                datetime.now(),
            ),
        )
        discord_test_contact_ids.append(c.fetchone()[0])
    conn.commit()

    # Contacts
    contact_ids = []
    for _ in range(num_contacts):
        full_name = fake.name()
        discord_id = str(random.randint(100_000_000_000_000_000, 999_999_999_999_999_999))
        email = fake.email()
        phone = fake.phone_number()
        note = fake.text(max_nb_chars=200)
        c.execute(
            "INSERT INTO contacts (full_name, discord_id, email, phone, note, created_at, modified_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (full_name, discord_id, email, phone, note, datetime.now(), datetime.now()),
        )
        contact_ids.append(c.fetchone()[0])
    conn.commit()

    # Combine Discord test contacts with random contacts
    contact_ids = discord_test_contact_ids + contact_ids

    # Tag assignments
    for cid in contact_ids:
        num_tags = random.randint(0, min(3, len(tag_map)))
        selected_tags = random.sample(list(tag_map.values()), num_tags)
        for tid in selected_tags:
            c.execute(
                "INSERT INTO tag_assignments (contact_id, tag_id, created_at) VALUES (%s, %s, %s) "
                "ON CONFLICT DO NOTHING",
                (cid, tid, datetime.now()),
            )
    conn.commit()

    # Events
    event_ids = []
    for _ in range(num_events):
        name = fake.catch_phrase()
        description = fake.text(max_nb_chars=200)
        event_status = random.choice(["draft", "scheduled", "completed", "canceled"])
        event_type = random.choice(["generic", "internal"])

        location_name, location_address = "", ""
        # 50/50 chance each gets added
        if random.choice([True, False]):
            location_address = fake.address()
        if random.choice([True, False]):
            # Second is name of the place
            location_name = fake.location_on_land()[2]

        # Timestamps
        created_at = fake.date_time_between(start_date="-1y", end_date="now")
        modified_at = created_at + timedelta(days=random.randint(0, 10))
        starts_at = created_at + timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
        ends_at = starts_at + timedelta(hours=random.randint(1, 4))  # 1-4 hours duration

        category_id = random.choice(category_ids + [None])

        c.execute(
            """
            INSERT INTO events
            (name, description, event_status, event_type, location_name, location_address, category_id, created_at, modified_at, starts_at, ends_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """,
            (
                name,
                description,
                event_status,
                event_type,
                location_name,
                location_address,
                category_id,
                created_at,
                modified_at,
                starts_at,
                ends_at,
            ),
        )
        event_ids.append(c.fetchone()[0])
    conn.commit()

    # Event participation
    for eid in event_ids:
        num_participants = random.randint(1, min(25, len(contact_ids)))
        participants = random.sample(contact_ids, num_participants)
        # Ensure contact_ids[0] (contact id 1) participates in every event
        if contact_ids[0] not in participants:
            participants.append(contact_ids[0])
        for cid in participants:
            status = random.choice(["UNKNOWN", "REJECTED", "COMMITTED", "MAYBE", "ATTENDED", "NO_SHOW"])
            created_at = fake.date_time_between(start_date="-1y", end_date="now")
            modified_at = created_at + timedelta(days=random.randint(0, 5))
            c.execute(
                "INSERT INTO event_participations (event_id, contact_id, status, created_at, modified_at) VALUES (%s, %s, %s, %s, %s) "
                "ON CONFLICT DO NOTHING",
                (eid, cid, status, created_at, modified_at),
            )
    conn.commit()

    # Users
    c.execute("SELECT id FROM auth_user")
    user_ids = [row[0] for row in c.fetchall()]

    # Users in events
    for eid in event_ids:
        if len(user_ids) < 2:
            break
        # Greatly prefer no users
        num_users = random.choices([0, 1, 2], weights=[50, 45, 5])[0]
        users = random.sample(user_ids, num_users)
        for uid in users:
            joined_at = fake.date_time_between(start_date="-1y", end_date="now")
            c.execute(
                "INSERT INTO users_in_events (user_id, event_id, joined_at) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (uid, eid, joined_at),
            )
    conn.commit()

    # Tickets - EVERY contact gets tickets across ALL ticket types for demo purposes
    ticket_ids = []
    ticket_types = ["UNKNOWN", "INTRODUCTION", "RECRUIT", "CONFIRM", "INTERNAL"]

    # Build template lookup by ticket_type
    template_by_type = {tpl["ticket_type"]: tpl for tpl in TICKET_TEMPLATES}

    # Pre-fetch contacts and events for template rendering
    c.execute("SELECT id, full_name, discord_id FROM contacts")
    contacts_map = {row[0]: {"id": row[0], "display_name": row[1], "discord_id": row[2]} for row in c.fetchall()}

    c.execute("SELECT id, name, description, location_name, location_address, starts_at FROM events")
    events_map = {}
    for row in c.fetchall():
        location_display = ""
        if row[3]:
            location_display = row[3]
        if row[4]:
            location_display = f"{location_display} ({row[4]})" if location_display else row[4]
        events_map[row[0]] = {
            "id": row[0],
            "name": row[1],
            "description": row[2] or "",
            "location_display": location_display or "TBD",
            "starts_at": row[5].strftime("%Y-%m-%d %H:%M") if row[5] else "TBD",
        }

    # For contacts, create 1-3 tickets per ticket type to ensure bar graphs have data
    # Randomly do not create some tickets
    for contact in contact_ids:
        # 50% chance contact has no tickets (except contact id 1, who always gets tickets)
        if contact != contact_ids[0] and random.random() < 0.5:
            continue
        for ticket_type in ticket_types:
            # Contact id 1 always gets at least 1 ticket per type
            num_tickets_for_type = random.randint(1, 3) if contact == contact_ids[0] else random.randint(0, 3)
            for _ in range(num_tickets_for_type):
                # Look up template for this ticket type
                template = template_by_type.get(ticket_type)
                event = random.choice(event_ids + [None])

                if template and ticket_type != "UNKNOWN":
                    # Use template
                    contact_data = contacts_map.get(contact, {"display_name": "User", "discord_id": ""})
                    event_data = events_map.get(event) if event else None
                    name = render_template(template["title_template"], contact_data, event_data)
                    description = render_template(template["description_template"], contact_data, event_data)
                    priority = template["default_priority"]
                else:
                    # Use random generated content for UNKNOWN or when no template
                    name = fake.catch_phrase()
                    description = generate_ticket_description(fake)
                    priority = random.choice(list(range(6)))

                # 50% chance unassigned
                assigned_to = random.choice(user_ids + [None] * len(user_ids))
                if assigned_to is None:
                    ticket_status = "OPEN"
                else:
                    ticket_status = random.choice(["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELED"])
                reported_by = random.choice(user_ids) if len(user_ids) > 0 else None
                created_at = fake.date_time_between(start_date="-1y", end_date="now")
                modified_at = created_at + timedelta(days=random.randint(0, 5))
                c.execute(
                    "INSERT INTO tickets (title, description, ticket_status, ticket_type, event_id, contact_id, assigned_to_id, reported_by_id, priority, created_at, modified_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (
                        name,
                        description,
                        ticket_status,
                        ticket_type,
                        event,
                        contact,
                        assigned_to,
                        reported_by,
                        priority,
                        created_at,
                        modified_at,
                    ),
                )
                ticket_ids.append((c.fetchone()[0], contact))
    conn.commit()

    # Ticket comments
    for tid, _ in ticket_ids:
        num_logs = random.randint(0, 5)
        for _ in range(num_logs):
            message = fake.sentence(nb_words=12)
            author = random.choice(user_ids + [None])  # None = system
            created_at = fake.date_time_between(start_date="-1y", end_date="now")
            c.execute(
                "INSERT INTO ticket_comments (ticket_id, author_id, message, created_at, modified_at) "
                "VALUES (%s, %s, %s, %s, %s)",
                (tid, author, message, created_at, created_at),
            )
    conn.commit()

    # Ticket asks (for acceptance_rate calculation)
    # Every ticket with a contact gets 1-4 asks to ensure good test coverage
    ticket_ask_statuses = ["UNKNOWN", "REJECTED", "AGREED", "DELIVERED", "FAILED", "GHOSTED"]
    ticket_ask_count = 0
    for tid, contact in ticket_ids:
        if contact is None:
            num_asks = random.randint(0, 1)
        else:
            num_asks = random.randint(1, 4)

        for _ in range(num_asks):
            # Weight towards positive outcomes
            status = random.choices(ticket_ask_statuses, weights=[10, 15, 35, 25, 10, 5])[0]
            created_at = fake.date_time_between(start_date="-1y", end_date="now")
            edited_at = created_at + timedelta(days=random.randint(0, 3))
            c.execute(
                "INSERT INTO ticket_asks (ticket_id, contact_id, status, created_at, edited_at) "
                "VALUES (%s, %s, %s, %s, %s)",
                (tid, contact, status, created_at, edited_at),
            )
            ticket_ask_count += 1
    conn.commit()

    print(
        f"Populated {len(contact_ids)} contacts ({len(DISCORD_TEST_USERS)} Discord test users), {len(tags)} tags, {len(event_ids)} events, {len(ticket_ids)} tickets, {ticket_ask_count} ticket asks."
    )
    print("  - All contacts have tickets across all types for acceptance_rate demo")
    print("  - Discord test users have real IDs for sync endpoint testing")


def parse_args():
    parser = argparse.ArgumentParser(description="Populate DB with fake data.")
    parser.add_argument("dsn", help="Database DSN (sqlite:/..., postgresql://...)")
    parser.add_argument("--num-contacts", type=int, default=50)
    parser.add_argument("--num-events", type=int, default=15)
    parser.add_argument("--num-tickets", type=int, default=30)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    conn = get_db_conn(args.dsn)
    populate_with_fake_data(
        conn, num_contacts=args.num_contacts, num_events=args.num_events, num_tickets=args.num_tickets
    )
    conn.close()
    print("Fake data population complete!")
