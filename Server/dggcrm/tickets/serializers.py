from django.contrib.auth import get_user_model
from rest_framework import serializers

from dggcrm.contacts.models import Contact
from dggcrm.events.models import Event

from .models import Ticket, TicketAsks, TicketComment, TicketStatus, TicketType
from .permissions import can_assign_ticket, can_change_ticket_status

User = get_user_model()


class TicketSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_ticket_status_display", read_only=True)
    type_display = serializers.CharField(source="get_ticket_type_display", read_only=True)
    assigned_to_username = serializers.CharField(source="assigned_to.username", read_only=True)
    reported_by_username = serializers.CharField(source="reported_by.username", read_only=True)
    contact_display = serializers.CharField(source="contact", read_only=True)
    event_display = serializers.CharField(source="event", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    # Only fields that are editable by the user
    editable_fields = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = "__all__"
        read_only_fields = ["id", "created_at", "modified_at", "reported_by"]

    def update(self, instance, validated_data):
        request = self.context["request"]
        user = request.user

        # Field-change detection
        assigning = "assigned_to" in validated_data and (validated_data["assigned_to"] != instance.assigned_to)

        changing_status = "status" in validated_data and (validated_data["status"] != instance.status)

        # ---- ASSIGN PERMISSION ----
        if assigning:
            if not can_assign_ticket(request.user):
                raise serializers.ValidationError({"assigned_to": "You do not have permission to assign tickets."})

        # ---- CHANGE STATUS PERMISSION ----
        if changing_status:
            if not can_change_ticket_status(user, instance):
                raise serializers.ValidationError(
                    {"status": "You may only change the status of tickets assigned to you."}
                )

        return super().update(instance, validated_data)

    def get_editable_fields(self, ticket):
        request = self.context.get("request")
        user = request.user if request else None

        if not user or not user.is_authenticated:
            return []

        fields = set()

        # Base rule: model-level change permission
        if user.has_perm("tickets.change_ticket"):
            fields.update(
                {
                    f.name
                    for f in ticket._meta.fields
                    if f.name
                    not in {
                        "id",
                        "created_at",
                        "modified_at",
                        "reported_by",
                    }
                }
            )

        # Field-level overrides
        if not user.has_perm("tickets.assign_ticket"):
            fields.discard("assigned_to")
        else:
            fields.add("assigned_to")

        if not can_change_ticket_status(user, ticket):
            fields.discard("status")
        else:
            fields.add("status")

        return sorted(fields)


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


class BulkTicketCreateSerializer(serializers.Serializer):
    contact_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
        write_only=True,
        help_text="List of contact IDs to create tickets for",
    )
    event_id = serializers.IntegerField(required=False, allow_null=True, help_text="Optional event ID")
    ticket_type = serializers.ChoiceField(choices=TicketType.choices, required=False)
    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)
    title = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.ChoiceField(
        choices=Ticket.Priority.choices,
        allow_null=True,
        default=Ticket.Priority.P3,
    )

    def validate_priority(self, value):
        return value if value is not None else Ticket.Priority.P3

    def create(self, validated_data):
        contact_ids = validated_data.pop("contact_ids")
        event_id = validated_data.pop("event_id", None)
        assigned_to_id = validated_data.pop("assigned_to_id", None)

        event = Event.objects.filter(id=event_id).first() if event_id else None
        assigned_to = User.objects.filter(id=assigned_to_id).first() if assigned_to_id else None

        tickets = []
        for contact_id in contact_ids:
            contact = Contact.objects.filter(id=contact_id).first()
            if not contact:
                continue  # Skip invalid contact IDs
            ticket = Ticket(
                contact=contact,
                event=event,
                assigned_to=assigned_to,
                ticket_status=TicketStatus.OPEN if not assigned_to else TicketStatus.TODO,
                # IMPORTANT INFOMRATION
                reported_by=self.context["request"].user,
                **validated_data,
            )
            tickets.append(ticket)

        return Ticket.objects.bulk_create(tickets)


class TicketTypeSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


class TicketAskStatusSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


class TicketAskSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketAsks
        fields = [
            "id",
            "ticket",
            "contact",
            "status",
            "created_at",
            "edited_at",
        ]
        read_only_fields = ["id", "contact", "ticket", "created_at", "edited_at"]
