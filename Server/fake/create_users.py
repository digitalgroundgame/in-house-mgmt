#!/usr/bin/env python
import os, sys
import django
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# -------------------------------------------------------------------
# Django setup
# -------------------------------------------------------------------
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from allauth.account.models import EmailAddress

# Define groups

GROUP_PERMISSIONS = {
    "ORGANIZER": [
        "view_contact",
        "view_all_contacts",
        "view_contacts_via_event",
        "change_contact",
        "change_all_contacts",
    ],
    "HELPER": [
        "view_contact",
        "view_contacts_via_event",
        "change_contact",
        "change_contacts_via_ticket"
    ],
    "TRAINEE": [
        "view_contact",
        "view_contacts_via_event",
    ],
}

USER_GROUPS = {
    "tiny@destiny.gg": "ORGANIZER",
    "dumb@example.com": "HELPER",
    "unverified@example.com": "TRAINEE",
}

groups = {}

for group_name, perms in GROUP_PERMISSIONS.items():
    group, _ = Group.objects.get_or_create(name=group_name)
    group.permissions.clear()

    for codename in perms:
        try:
            perm = Permission.objects.get(codename=codename)
            group.permissions.add(perm)
        except Permission.DoesNotExist:
            print(f"⚠ Permission not found: {codename}")

    group.save()
    groups[group_name] = group
    print(f"Configured group: {group_name}")

User = get_user_model()

# Define your users
users_data = [
    {
        "username": "admin",
        "email": "admin@example.com",
        "first_name": "Admin",
        "last_name": "Istrator",
    },
    {
        "username": "tiny",
        "email": "tiny@destiny.gg",
        "first_name": "Tiny",
        "last_name": "Mann",
    },
    {
        "username": "dummy",
        "email": "dumb@example.com",
        "first_name": "Dummy",
        "last_name": "Person",
    },
    {
        "username": "unverified",
        "email": "unverified@example.com",
        "email_verified": False,
        "first_name": "Unverified",
        "last_name": "Email",
    },
]

created_users = []

for user_data in users_data:
    email = user_data["email"]

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": user_data.get("username", ""),
            "first_name": user_data.get("first_name", ""),
            "last_name": user_data.get("last_name", ""),
        },
    )

    if created:
        print(f"Created user {email}")
    else:
        # Update existing user fields
        updated = False

        for field in ["first_name", "last_name"]:
            value = user_data.get(field)
            if value is not None and getattr(user, field) != value:
                setattr(user, field, value)
                updated = True

        # Optionally update password
        if "password" in user_data:
            user.set_password(user_data["password"])
            updated = True

        if updated:
            print(f"Updated user {email}")
        else:
            print(f"User {email} already up-to-date")

    user.save()

    # Mark email as verified
    email_address, created = EmailAddress.objects.get_or_create(
        user=user, email=email, primary=True, verified=user_data.get("email_verified", True)
    )
    if created:
        email_address.save()

    # Add group membership
    group_name = USER_GROUPS.get(email, None)
    if group_name:
        user.groups.clear()
        user.groups.add(groups[group_name])


if created_users:
    print(f"Successfully created {len(created_users)} users: {created_users}")
else:
    print("No users were created.")
