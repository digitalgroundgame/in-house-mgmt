from auditlog.models import AuditlogHistoryField
from auditlog.registry import auditlog
from django.conf import settings
from django.db import models


class TicketStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    TODO = "TODO", "To Do"
    INPROGRESS = "IN_PROGRESS", "In Progress"
    BLOCKED = "BLOCKED", "Blocked"
    COMPLETED = "COMPLETED", "Completed"
    CANCELED = "CANCELED", "Canceled"


# TODO: Should we convert to table?  (Yes, we def should)
class TicketType(models.TextChoices):
    UNKNOWN = "UNKNOWN", "Unknown"
    INTRODUCTION = "INTRODUCTION", "Introduction"
    RECRUIT = "RECRUIT", "Recruit for event"
    CONFIRM = "CONFIRM", "Confirm event participation"
    # TODO: What other types do we want?


class TicketAskStatus(models.TextChoices):
    UNKNOWN = "UNKNOWN", "Unknown"
    REJECTED = "REJECTED", "Rejected"
    AGREED = "AGREED", "Agreed"
    DELIVERED = "DELIVERED", "Delivered"
    FAILED = "FAILED", "Failed"
    GHOSTED = "GHOSTED", "Ghosted"


class Ticket(models.Model):
    """
    Represents a task that must be accomplished by a user.
    Tasks might be introductions, recruitments, etc.
    They also may track tasks that must be accomplished for events.
    """

    id = models.AutoField(primary_key=True)
    ticket_status = models.CharField(
        default=TicketStatus.OPEN, choices=TicketStatus.choices, help_text="Current status of this ticket."
    )
    ticket_type = models.CharField(
        default=TicketType.UNKNOWN, choices=TicketType.choices, help_text="Type for this ticket"
    )

    template = models.ForeignKey(
        "tickets.TicketTemplate",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tickets",
        help_text="Template used to create this ticket",
    )

    event = models.ForeignKey(
        "events.Event",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tickets",
        help_text="Event this ticket relates to",
    )

    contact = models.ForeignKey(
        "contacts.Contact",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tickets",
        help_text="Contact this ticket relates to",
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tickets_assigned",
        help_text="User ticket is assigned to",
    )

    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tickets_reported",
        help_text="User that created this ticket",
    )

    title = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)

    class Priority(models.IntegerChoices):
        P0 = 0, "P0 - Emergency (Do Now)"
        P1 = 1, "P1 - Very High"
        P2 = 2, "P2 - High"
        P3 = 3, "P3 - Normal"
        P4 = 4, "P4 - Low"
        P5 = 5, "P5 - Very Low"

    priority = models.PositiveSmallIntegerField(
        choices=Priority.choices,
        default=Priority.P3,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    history = AuditlogHistoryField()

    class Meta:
        db_table = "tickets"
        permissions = [
            ("view_all_tickets", "Can view any ticket"),
            ("view_tickets_via_event", "Can view any ticket associated to an event"),
            ("claim_ticket", "Can claim an open ticket"),
            ("unclaim_ticket", "Can unclaim a ticket"),
            ("assign_ticket", "Can assign a ticket to any user"),
            ("change_status", "Can update ticket status"),
            ("change_all_statuses", "Can update any ticket's status"),
        ]

    def __str__(self):
        return f"{self.id} ({self.get_ticket_status_display()})"


# Using django-auditlog to keep history of tickets
auditlog.register(Ticket)


class TicketTemplate(models.Model):
    """
    Template for creating tickets with templated title and description.
    Uses Django template syntax for dynamic content.
    """

    id = models.AutoField(primary_key=True)

    name = models.CharField(max_length=100, unique=True)

    title_template = models.TextField(
        blank=True,
        help_text="Django template for ticket title. Available context: contact, event, user",
    )
    description_template = models.TextField(
        blank=True,
        help_text="Django template for ticket description. Available context: contact, event, user",
    )

    ticket_type = models.CharField(
        default=TicketType.UNKNOWN,
        choices=TicketType.choices,
        help_text="Default ticket type for tickets created from this template",
    )

    default_priority = models.PositiveSmallIntegerField(
        choices=Ticket.Priority.choices,
        default=Ticket.Priority.P3,
        help_text="Default priority for tickets created from this template",
    )

    requires_contact = models.BooleanField(
        default=False,
        help_text="Whether tickets created from this template require a contact",
    )

    requires_event = models.BooleanField(
        default=False,
        help_text="Whether tickets created from this template require an event",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ticket_templates"

    def __str__(self):
        return self.name


class TicketComment(models.Model):
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        related_name="comments",
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    message = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ticket_comments"
        ordering = ["created_at"]
        permissions = [
            ("add_any_comment", "Can comment on any ticket"),
        ]

    def __str__(self):
        return f"Comment on {self.ticket_id}"


class TicketAsks(models.Model):
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )

    contact = models.ForeignKey(
        "contacts.Contact",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ticket_asks",
    )

    # user_id = models.ForeignKey(
    #     settings.AUTH_USER_MODEL,
    #     null=True,
    #     blank=True,
    #     on_delete=models.SET_NULL,
    #  )

    status = models.CharField(
        max_length=15,
        choices=TicketAskStatus.choices,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    # Change field on edit
    edited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ticket_asks"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Ask for {self.ticket_id}"


# TODO: implement missing tables from DB diagram
