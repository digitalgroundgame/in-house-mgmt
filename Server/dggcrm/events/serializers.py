from django.contrib.auth import get_user_model
from rest_framework import serializers

from ..contacts.models import Contact
from ..contacts.serializers import ContactSerializer
from .models import CommitmentStatus, Event, EventParticipation, UsersInEvent
from .permissions import can_change_event

User = get_user_model()


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
                "anonymous_attendee_count",
                "anonymous_attendees_detail",
            }
        )

    def validate_anonymous_attendees_detail(self, value):
        allowed_keys = {"name", "contact_info", "notes"}
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list.")
        for entry in value:
            if not isinstance(entry, dict):
                raise serializers.ValidationError("Each entry must be an object.")
            if not set(entry.keys()).issubset(allowed_keys):
                raise serializers.ValidationError(f"Allowed keys are: {sorted(allowed_keys)}.")
            for v in entry.values():
                if not isinstance(v, str):
                    raise serializers.ValidationError("All values must be strings.")
        return value

    def validate(self, data):
        count = data.get(
            "anonymous_attendee_count",
            self.instance.anonymous_attendee_count if self.instance else 0,
        )
        detail = data.get(
            "anonymous_attendees_detail",
            self.instance.anonymous_attendees_detail if self.instance else [],
        )
        if len(detail) > count:
            raise serializers.ValidationError(
                {
                    "anonymous_attendees_detail": (
                        f"Cannot have more detail entries ({len(detail)}) than the anonymous participant count ({count})."
                    )
                }
            )
        return data


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
