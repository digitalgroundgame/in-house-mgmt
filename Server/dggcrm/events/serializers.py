from django.contrib.auth import get_user_model
from rest_framework import serializers

from ..contacts.models import Contact
from ..contacts.serializers import ContactSerializer
from .models import Event, EventParticipation, UsersInEvent

User = get_user_model()


class NullableCharField(serializers.CharField):
    def to_internal_value(self, value):
        if value == "":
            return None
        return super().to_internal_value(value)


class EventSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_event_status_display", read_only=True)
    location_display = serializers.CharField(read_only=True)
    location_name = NullableCharField(allow_null=True, required=False)
    location_address = NullableCharField(allow_null=True, required=False)

    class Meta:
        model = Event
        fields = "__all__"
        read_only_fields = ["id", "created_at", "location_display", "modified_at", "status_display"]


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
