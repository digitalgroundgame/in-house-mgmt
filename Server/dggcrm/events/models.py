from auditlog.models import AuditlogHistoryField
from django.conf import settings
from django.db import models
from django.db.models import Q


class EventType(models.TextChoices):
    GENERIC = "generic", "Generic"
    INTERNAL = "internal", "Internal"


class EventStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SCHEDULED = "scheduled", "Scheduled"
    COMPLETED = "completed", "Completed"
    CANCELED = "canceled", "Canceled"


class Event(models.Model):
    """
    Represents a task that must be accomplished by a user.
    Tasks might be introductions, recruitments, etc.
    They also may track tasks that must be accomplished for events.
    """

    id = models.AutoField(primary_key=True)

    name = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    location_name = models.CharField(max_length=200, blank=True)
    location_address = models.CharField(max_length=300, blank=True)

    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()

    event_type = models.CharField(
        default=EventType.GENERIC, choices=EventType.choices, help_text="The type of event deciedes the behavior."
    )

    event_status = models.CharField(
        default=EventStatus.DRAFT, choices=EventStatus.choices, help_text="Current status of this event"
    )

    anonymous_attendee_count = models.IntegerField(default=0)
    anonymous_attendees_detail = models.JSONField(default=list)

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "events"
        permissions = [
            ("view_all_events", "Can view all events"),
            ("view_any_assigned_event", "Can view assigned events regardless of status"),
            ("change_all_events", "Can edit all events"),
            ("change_assigned_event", "Can edit assigned events"),
        ]

    def __str__(self):
        return f"{self.name}"

    @property
    def location_display(self):
        if self.location_name:
            return f"{self.location_name}"
        elif self.location_address:
            return f"{self.location_address}"
        return "None"


class CommitmentStatus(models.TextChoices):
    UNKNOWN = "UNKNOWN", "Unknown"
    REJECTED = "REJECTED", "Rejected"
    COMMITTED = "COMMITTED", "Committed"
    MAYBE = "MAYBE", "Maybe"
    ATTENDED = "ATTENDED", "Attended"
    NO_SHOW = "NO_SHOW", "No Show"


class EventParticipation(models.Model):
    id = models.AutoField(primary_key=True)

    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="participants",
    )

    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="event_participations",
    )

    status = models.CharField(
        max_length=20,
        choices=CommitmentStatus.choices,
        default=CommitmentStatus.UNKNOWN,
        help_text="Commitment level of the contact for this event",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    history = AuditlogHistoryField()

    class Meta:
        db_table = "event_participations"
        # Only one participation record per pair
        unique_together = [("event", "contact")]
        indexes = [
            models.Index(fields=["event"]),
            models.Index(fields=["contact"]),
            models.Index(fields=["status"]),
        ]

        permissions = [
            ("view_all_participations", "Can view all participations"),
            ("change_participation_via_ticket", "Change participation via assigned ticket"),
            ("change_participation_via_event", "Change participation for joined events"),
            ("change_all_participations", "Change participation for all events"),
        ]

    def __str__(self):
        return f"{self.contact} -> {self.event} ({self.get_status_display()})"


class UsersInEvent(models.Model):
    """
    Connects users to events with an optional role.
    """

    id = models.AutoField(primary_key=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="events",
    )

    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="users",
    )

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "users_in_events"
        unique_together = ("user", "event")
        ordering = ["-joined_at"]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["event"]),
        ]
        permissions = [
            ("view_all_usersinevents", "Can view all members in any event"),
            ("view_usersinevent_via_event", "Can view all members in joined event"),
            ("change_all_usersinevents", "Modify participations for joined events"),
            ("change_usersinevent_via_event", "Can add/remove users for assigned events"),
        ]

    def __str__(self):
        return f"{self.user} -> {self.event}"


class StagedEvent(models.Model):
    id = models.AutoField(primary_key=True)

    discord_event_id = models.CharField(
        max_length=64,
        unique=True,
        help_text="Discord scheduled event ID (snowflake)",
    )
    event_name = models.CharField(max_length=100)

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "staged_events"
        permissions = [
            ("record_attendance", "Can record attendance via Discord"),
        ]

    def __str__(self):
        return f"{self.event_name} ({self.discord_event_id})"


class StagedEventParticipation(models.Model):
    id = models.AutoField(primary_key=True)

    staged_event = models.ForeignKey(
        "events.StagedEvent",
        on_delete=models.CASCADE,
        related_name="participants",
    )

    event_tracker_crm_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recorded_staged_participations",
        help_text="CRM user (organizer) whose tracking session produced this row",
    )
    discord_id = models.CharField(max_length=64)
    discord_name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        choices=CommitmentStatus.choices,
        default=CommitmentStatus.UNKNOWN,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    imported_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Set when promoted into a real EventParticipation row",
    )

    class Meta:
        db_table = "staged_event_participations"
        unique_together = [("staged_event", "event_tracker_crm_user", "discord_id")]
        indexes = [
            models.Index(fields=["discord_id"]),
            models.Index(
                fields=["staged_event"],
                name="staged_part_pending_idx",
                condition=Q(imported_at__isnull=True),
            ),
        ]

    def __str__(self):
        return f"{self.discord_name} ({self.discord_id}) -> {self.get_status_display()}"
