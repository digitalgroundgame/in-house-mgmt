from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Ticket, TicketStatus, TicketComment

User = get_user_model()

class TicketSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source='get_ticket_status_display',
        read_only=True
    )
    type_display = serializers.CharField(
        source='get_ticket_type_display',
        read_only=True
    )
    assigned_to_username = serializers.CharField(
        source='assigned_to.username',
        read_only=True
    )
    reported_by_username = serializers.CharField(
        source='reported_by.username',
        read_only=True
    )
    contact_display = serializers.CharField(
        source='contact',
        read_only=True
    )
    event_display = serializers.CharField(
        source='event',
        read_only=True
    )
    priority_display = serializers.CharField(
        source='get_priority_display',
        read_only=True
    )

    class Meta:
        model = Ticket
        fields = "__all__"
        read_only_fields = [
            'id',
            'created_at',
            'modified_at',
            'reported_by'
        ]


class TicketClaimSerializer(serializers.Serializer):
    pass


class TicketCommentSerializer(serializers.ModelSerializer):
    author_display = serializers.CharField(
        source="author.get_full_name",
        read_only=True,
    )

    class Meta:
        model = TicketComment
        fields = [
            "id",
            "ticket",
            "author",
            "author_display",
            "message",
            "created_at",
            "modified_at",
        ]
        read_only_fields = ["author", "created_at", "modified_at"]


class TicketTimelineSerializer(serializers.Serializer):
    type = serializers.CharField()
    created_at = serializers.DateTimeField()
    actor_display = serializers.CharField(allow_null=True)
    actor_id = serializers.IntegerField(allow_null=True)
    message = serializers.CharField(allow_null=True, required=False)
    changes = serializers.JSONField(allow_null=True, required=False)