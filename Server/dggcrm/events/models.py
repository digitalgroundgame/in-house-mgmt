from django.db import models
from django.conf import settings

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
    location_name = models.CharField(max_length=200, blank=True, null=True)
    location_address = models.CharField(max_length=300, blank=True, null=True)

    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()

    event_status = models.CharField(
        default=EventStatus.DRAFT,
        choices=EventStatus.choices,
        help_text="Current status of this event"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    @property
    def location_display(self):
        if self.location_name:
            return f"{self.location_name}"
        elif self.location_address:
            return f"{self.location_address}"
        return "None"

    class Meta:
        db_table = 'events'
        permissions = [
            ("assign_users_to_event", "Can assign users to events"),
            ("add_contacts_to_event", "Can add contacts to events"),
        ]


    def __str__(self):
        return f"{self.name}"

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

    class Meta:
        db_table = "event_participations"
        # Only one participation record per pair
        unique_together = [("event", "contact")]
        indexes = [
            models.Index(fields=["event"]),
            models.Index(fields=["contact"]),
            models.Index(fields=["status"]),
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

    def __str__(self):
        return f"{self.user} -> {self.event}"
