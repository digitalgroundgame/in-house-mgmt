from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated, DjangoModelPermissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count

from .models import Contact, Tag, TagAssignments
from ..tickets.models import TicketStatus
from ..events.models import CommitmentStatus
from .serializers import (
    ContactSerializer,
    TagSerializer,
    TagAssignmentSerializer,
)
from dggcrm.tickets.models import TicketAsks, TicketAskStatus, TicketType
from .permissions import (
    ContactObjectPermission,
    CanModifyTagAssignment,
    get_contact_visibility_filter,
)

# TODO: Add permission_classes to these views
class ContactViewSet(viewsets.ModelViewSet):
    queryset = (
        Contact.objects
        .all()
        .prefetch_related("taggings__tag")
    )
    serializer_class = ContactSerializer
    permission_classes = [
        IsAuthenticated,
        DjangoModelPermissions,
        ContactObjectPermission
    ]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "full_name",
        "email",
        "discord_id",
        "phone",
        "note",
    ]

    ordering_fields = [
        "created_at",
        "modified_at",
        "full_name",
        "discord_id",
    ]

    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()

        event_id = self.request.query_params.get("event")
        tag = self.request.query_params.get("tag")
        min_tickets = self.request.query_params.get("min_tickets")
        max_tickets = self.request.query_params.get("max_tickets")
        min_events = self.request.query_params.get("min_events")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        min_events = self.request.query_params.get("min_events")
        max_events = self.request.query_params.get("max_events")


        if event_id:
            queryset = queryset.filter(
                event_participations__event_id=event_id,
            )

        if tag:
            # allow filtering by tag id OR tag name
            if tag.isdigit():
                queryset = queryset.filter(taggings__tag__id=tag)
            else:
                queryset = queryset.filter(taggings__tag__name__iexact=tag)
        date_filter = Q()
        if start_date:
            date_filter &= Q(event_participations__event__ends_at__gte=start_date)
        if end_date:
            date_filter &= Q(event_participations__event__starts_at__lte=end_date)

        if min_tickets and min_tickets.isdigit():
            min_tickets = int(min_tickets)
            queryset = queryset.annotate(
                num_tickets_in_range=Count("tickets", filter=date_filter)
            ).filter(num_tickets_in_range__gte=min_tickets).filter(tickets__ticket_status=TicketStatus.COMPLETED)
            if max_tickets and max_tickets.isdigit():
                max_tickets = int(max_tickets)
                queryset = queryset.filter(num_tickets_in_range__lte=max_tickets)
        if min_events and min_events.isdigit():
            min_events = int(min_events)
            queryset = queryset.annotate(
                num_events_in_range=Count("event_participations", filter=date_filter)
            ).filter(num_events_in_range__gte=min_events).filter(event_participations__status=CommitmentStatus.ATTENDED) 
            if max_events and max_events.isdigit():
                max_events = int(max_events)
                queryset = queryset.filter(num_events_in_range__lte=max_events)

        return queryset.filter(
            get_contact_visibility_filter(self.request.user)
        ).distinct()

    @action(detail=True, methods=["get"], url_path="acceptance-rate")
    def acceptance_rate(self, request, pk=None):
        """
        Get ticket ask statistics for a contact, broken down by ticket type.
        Returns a JSON with counts for each TicketAskStatus per ticket type.
        """
        contact = self.get_object()

        # Base queryset aggregated in DB
        qs = (
            TicketAsks.objects
            .filter(contact=contact)
            .values("ticket__ticket_type", "status")
            .annotate(count=Count("id"))
        )

        # Initialize response with zeros
        response_data = {
            ticket_type_value: {
                status.value: 0 for status in TicketAskStatus
            }
            for ticket_type_value, _ in TicketType.choices
        }

        # Fill in actual counts
        for row in qs:
            ticket_type = row["ticket__ticket_type"]
            status = row["status"]
            response_data[ticket_type][status] = row["count"]

        return Response(response_data)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [
        IsAuthenticated,
        DjangoModelPermissions,
    ]


class TagAssignmentViewSet(viewsets.ModelViewSet):
    permission_classes = [
        IsAuthenticated,
        DjangoModelPermissions,
        CanModifyTagAssignment,
    ]
    serializer_class = TagAssignmentSerializer
    queryset = TagAssignments.objects.all()