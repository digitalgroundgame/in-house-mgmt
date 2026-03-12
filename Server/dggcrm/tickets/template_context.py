"""
Ticket Template Context

This module provides template rendering for tickets using Django templates.

Supported Template Fields
========================

Contact:
    {{ contact.id }}            - Contact's database ID
    {{ contact.full_name }}     - Contact's full name
    {{ contact.discord_id }}   - Contact's Discord ID
    {{ contact.email }}        - Contact's email address
    {{ contact.phone }}        - Contact's phone number
    {{ contact.note }}         - Contact's notes
    {{ contact.display_name }} - Contact's display name (full_name or Discord ID)
    {{ contact.created_at }}   - Contact creation timestamp
    {{ contact.modified_at }}  - Contact last modified timestamp

Event:
    {{ event.id }}               - Event's database ID
    {{ event.name }}             - Event's name
    {{ event.description }}      - Event's description
    {{ event.location_name }}    - Event location name
    {{ event.location_address }} - Event location address
    {{ event.location_display }} - Event location display string
    {{ event.starts_at }}       - Event start timestamp
    {{ event.ends_at }}         - Event end timestamp
    {{ event.status }}          - Event status
    {{ event.created_at }}      - Event creation timestamp
    {{ event.modified_at }}     - Event last modified timestamp

Reporter:
    {{ reporter.name }} - Ticket reporter's display name (full_name or username)

Example Usage
============

Title:
    Intro to {{ contact.display_name }}

Description:
    Hi {{ contact.full_name }},

    We're hosting {{ event.name }} on {{ event.starts_at }}.
    Would you like to attend?

    - {{ reporter.name }}
"""

import logging

from django.template import Context, Template, TemplateSyntaxError

logger = logging.getLogger(__name__)


def render_template(template_str: str, context: dict) -> str:
    """
    Render a Django template string with the given context.
    Returns empty string if template is empty.
    Returns empty string on template syntax errors.
    """
    if not template_str:
        return ""
    try:
        return Template(template_str).render(Context(context)).strip()
    except TemplateSyntaxError as e:
        logger.error(f"Template syntax error: {e}")
        return ""


def get_contact_context(contact) -> dict:
    """
    Build context for a contact.
    Returns a dict with callable functions for template rendering.
    """
    if contact is None:
        return {}

    return {
        "contact": {
            "id": contact.id,
            "full_name": contact.full_name or "",
            "discord_id": contact.discord_id or "",
            "email": contact.email or "",
            "phone": contact.phone or "",
            "note": contact.note or "",
            "display_name": str(contact),
            "created_at": contact.created_at.isoformat() if contact.created_at else "",
            "modified_at": contact.modified_at.isoformat() if contact.modified_at else "",
        }
    }


def get_event_context(event) -> dict:
    """
    Build context for an event.
    Returns a dict with callable functions for template rendering.
    """
    if event is None:
        return {}

    return {
        "event": {
            "id": event.id,
            "name": event.name or "",
            "description": event.description or "",
            "location_name": event.location_name or "",
            "location_address": event.location_address or "",
            "location_display": event.location_display,
            "starts_at": event.starts_at.isoformat() if event.starts_at else "",
            "ends_at": event.ends_at.isoformat() if event.ends_at else "",
            "status": event.event_status or "",
            "created_at": event.created_at.isoformat() if event.created_at else "",
            "modified_at": event.modified_at.isoformat() if event.modified_at else "",
        }
    }


def get_reporter_context(user) -> dict:
    """
    Build context for the reporter (ticket creator).
    Returns a dict for template rendering.
    """
    if user is None or not user.is_authenticated:
        return {}

    full_name = user.get_full_name()
    return {
        "reporter": {
            "name": full_name or user.username,
        }
    }


def build_template_context(
    contact=None,
    event=None,
    user=None,
) -> dict:
    """
    Build complete template context from available objects.
    Each key maps to a dict with field names as keys and their values as values.
    This allows templates to access fields like {{contact.discord_id}}.
    """
    context = {}

    if contact is not None:
        context.update(get_contact_context(contact))
    if event is not None:
        context.update(get_event_context(event))
    if user is not None:
        context.update(get_reporter_context(user))

    return context


def render_ticket_from_template(template, context: dict) -> tuple[str, str]:
    """
    Render title and description from a template using the given context.
    Returns (title, description) tuple.
    """
    title = render_template(template.title_template, context)
    description = render_template(template.description_template, context)
    return title, description
