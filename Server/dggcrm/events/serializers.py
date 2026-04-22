from django.contrib.auth import get_user_model
from rest_framework import serializers

from ..contacts.models import Contact
from ..contacts.serializers import ContactSerializer
from .models import CommitmentStatus, Event, EventCategory, EventParticipation, UsersInEvent
from .permissions import can_change_event

User = get_user_model()


class EventCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EventCategory
        fields = ["id", "name", "description", "created_at", "modified_at"]
        read_only_fields = ["id", "created_at", "modified_at"]


class EventSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_event_status_display", read_only=True)
    location_display = serializers.CharField(read_only=True)
    editable_fields = serializers.SerializerMethodField()
    category = EventCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=EventCategory.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )

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
                "category",
            }
        )


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
