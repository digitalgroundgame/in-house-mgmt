from django.contrib.auth import get_user_model
from rest_framework import serializers

from ..contacts.models import Contact
from ..contacts.serializers import ContactSerializer
from .models import CommitmentStatus, Event, EventParticipation, EventStatus, UsersInEvent
from .permissions import can_change_event

User = get_user_model()

FINAL_EVENT_STATUSES = {EventStatus.COMPLETED, EventStatus.CANCELED}
INVALID_FINAL_ATTENDANCE_STATUSES = {
    CommitmentStatus.UNKNOWN,
    CommitmentStatus.MAYBE,
    CommitmentStatus.COMMITTED,
}


class EventSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_event_status_display", read_only=True)
    location_display = serializers.CharField(read_only=True)
    editable_fields = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "location_display",
            "modified_at",
            "status_display",
        ]

    def get_editable_fields(self, event):
        request = self.context.get("request")
        user = request.user if request else None

        if not can_change_event(user, event):
            return []

        return sorted(
            {
                "name",
                "description",
                "location_name",
                "location_address",
                "starts_at",
                "ends_at",
                "event_status",
            }
        )

    def validate(self, attrs):
        event_status = attrs.get("event_status")

        if event_status in FINAL_EVENT_STATUSES:
            invalid_participations = EventParticipation.objects.filter(
                event=self.instance,
                status__in=INVALID_FINAL_ATTENDANCE_STATUSES,
            ).values_list("id", flat=True)
            invalid_participation_ids = list(invalid_participations)

            if invalid_participation_ids:
                raise serializers.ValidationError(
                    {
                        "detail": "Attendance statuses must be resolved before an event can be completed or canceled.",
                        "invalid_participation_ids": invalid_participation_ids,
                    }
                )

        return attrs


class EventParticipationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        source="event",
        write_only=True,
    )
    contact_id = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(),
        source="contact",
        write_only=True,
    )
    event = EventSerializer(read_only=True)
    contact = ContactSerializer(read_only=True)
    status = serializers.ChoiceField(choices=CommitmentStatus.choices)

    class Meta:
        model = EventParticipation
        fields = "__all__"
        read_only_fields = ["id", "created_at", "modified_at", "status_display"]
        validators = []

    def validate(self, attrs):
        status = attrs.get("status")
        event = attrs.get("event") or (self.instance.event if self.instance else None)

        if event and event.event_status in FINAL_EVENT_STATUSES and status in INVALID_FINAL_ATTENDANCE_STATUSES:
            raise serializers.ValidationError(
                {
                    "detail": "Attendance status cannot be unresolved for a completed or canceled event.",
                }
            )

        return attrs


class UsersInEventSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = UsersInEvent
        fields = "__all__"
        read_only_fields = [
            "id",
            "joined_at",
            "user_username",
        ]
