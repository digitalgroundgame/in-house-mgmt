from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Q, Count

from .models import Contact, Tag, TagAssignments
from ..tickets.models import TicketStatus
from ..events.models import CommitmentStatus
from .serializers import (
    ContactSerializer,
    TagSerializer,
    TagAssignmentSerializer,
)

# TODO: Add permission_classes to these views
class ContactViewSet(viewsets.ModelViewSet):
    queryset = (
        Contact.objects
        .all()
        .prefetch_related("taggings__tag")
    )
    serializer_class = ContactSerializer

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

    # TODO: Update search api to properly handle permissions,
    #   access, and search all fields
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
            date_filter &= Q(event_participations__event__created_at__lte=end_date)

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


        return queryset


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

class TagAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = TagAssignmentSerializer
    queryset = TagAssignments.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        contact_id = self.request.query_params.get("contact")
        if contact_id:
            queryset = queryset.filter(contact_id=contact_id)
        return queryset