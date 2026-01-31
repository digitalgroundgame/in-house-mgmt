from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Event, EventParticipation, UsersInEvent
from ..contacts.serializers import ContactSerializer

User = get_user_model()


class EventSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_event_status_display", read_only=True)
    location_display = serializers.CharField(read_only=True)

    class Meta:
        model = Event
        fields = "__all__"
        read_only_fields = ["id", "created_at", "location_display", "modified_at", "status_display"]


class EventParticipationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    event = EventSerializer()
    contact = ContactSerializer()

    class Meta:
        model = EventParticipation
        fields = "__all__"
        read_only_fields = ["id", "created_at", "modified_at", "status_display"]


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
