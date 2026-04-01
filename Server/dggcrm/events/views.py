from django.db.models import Count, F
from rest_framework import filters, viewsets
from rest_framework import status as rest_status
from rest_framework.decorators import action
from rest_framework.permissions import DjangoModelPermissions, IsAuthenticated
from rest_framework.response import Response

from .models import CommitmentStatus, Event, EventParticipation, EventStatus, UsersInEvent
from .permissions import (
    EventMembershipObjectPermission,
    EventObjectPermission,
    ParticipationObjectPermission,
    get_event_membership_visibility_filter,
    get_event_visibility_filter,
    get_participation_visibility_filter,
)
from .serializers import EventParticipationSerializer, EventSerializer, UsersInEventSerializer


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by("-created_at")
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated, DjangoModelPermissions, EventObjectPermission]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    search_fields = ["name", "description", "location_name", "location_address"]
    ordering_fields = ["created_at", "modified_at", "event_status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()

        event_id = self.request.query_params.get("event")
        contact_id = self.request.query_params.get("contact")
        status = self.request.query_params.get("status")
        event_type = self.request.query_params.get("event_type")

        if event_id:
            queryset = queryset.filter(event_id=event_id)

        if contact_id:
            queryset = queryset.filter(contact_id=contact_id)

        if status:
            queryset = queryset.filter(event_status=status)

        if event_type:
            queryset = queryset.filter(event_type=event_type)

        return queryset.filter(get_event_visibility_filter(self.request.user))


class EventParticipationViewSet(viewsets.ModelViewSet):
    queryset = EventParticipation.objects.select_related("event", "contact").order_by("-created_at")
    serializer_class = EventParticipationSerializer
    permission_classes = [IsAuthenticated, DjangoModelPermissions, ParticipationObjectPermission]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "event__name",
        "contact__full_name",
        "contact__email",
    ]

    ordering_fields = [
        "created_at",
        "modified_at",
        "status",
    ]

    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()

        event_id = self.request.query_params.get("event")
        contact_id = self.request.query_params.get("contact")
        status = self.request.query_params.getlist("status")
        exclude_status = self.request.query_params.getlist("exclude_status")
        event_status = self.request.query_params.get("event_status")
        event_type = self.request.query_params.get("event_type")
        exclude_event_status = self.request.query_params.get("exclude_event_status")
        self.request.query_params.get("")

        if status:
            queryset = queryset.filter(status__in=status)
        if event_status:
            queryset = queryset.filter(event__event_status=event_status)
        if event_type:
            queryset = queryset.filter(event__event_type=event_type)
        if exclude_status:
            queryset = queryset.exclude(status__in=exclude_status)
        if exclude_event_status:
            queryset = queryset.exclude(event__event_status=exclude_status)
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        if contact_id:
            queryset = queryset.filter(contact_id=contact_id)

        return queryset.filter(get_participation_visibility_filter(self.request.user)).distinct()

    # TODO: Limit this API to organizer role or above
    @action(detail=False, methods=["get"])
    def group_by_contact(self, request):
        min_date = request.query_params.get("min_date")
        max_date = request.query_params.get("max_date")
        min_events = request.query_params.get("min_events", 0)
        max_events = request.query_params.get("max_events")
        status = request.query_params.get("status", CommitmentStatus.ATTENDED)

        qs = self.get_queryset().filter(
            status=status,
        )

        # Query date ranges
        if min_date:
            qs.filter(event__ends_at__gte=min_date)
        if max_date:
            qs.filter(event__starts_at__lte=max_date)

        qs = qs.values(
            "contact_id",
            full_name=F("contact__full_name"),
        ).annotate(
            event_count=Count(
                "id",
            )
        )

        qs = qs.filter(event_count__gte=min_events).order_by("-event_count", "contact_id")

        if max_events is not None:
            qs = qs.filter(event_count__lte=max_events)

        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(page)

        return Response(qs)

    def create(self, request, *args, **kwargs):
        """
        Upsert: If a participation exists for event+contact, update it.
        Otherwise, create a new participation.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Extract the instances from validated data
        event = serializer.validated_data["event"]
        contact = serializer.validated_data["contact"]
        status_value = serializer.validated_data.get("status")
        participation = EventParticipation.objects.filter(event=event, contact=contact).first()

        if participation:
            self.check_object_permissions(request, participation)

            participation.status = status_value
            participation.save()
            created = False
        else:
            participation = EventParticipation.objects.create(
                event=event,
                contact=contact,
                status=status_value,
            )
            created = True

        serializer = self.get_serializer(participation)

        return Response(serializer.data, status=rest_status.HTTP_201_CREATED if created else rest_status.HTTP_200_OK)


# Readonly view set that returns all committment statuses
class CommitmentStatusViewSet(viewsets.ViewSet):
    def list(self, request):
        types = [{"value": t.value, "label": t.label} for t in CommitmentStatus]
        return Response(types)


# Readonly view set that returns all event statuses
class EventStatusViewSet(viewsets.ViewSet):
    def list(self, request):
        statuses = [{"value": s.value, "label": s.label} for s in EventStatus]
        return Response(statuses)


class UsersInEventViewSet(viewsets.ModelViewSet):
    queryset = UsersInEvent.objects.select_related(
        "user",
        "event",
    ).distinct()
    serializer_class = UsersInEventSerializer
    permission_classes = [IsAuthenticated, DjangoModelPermissions, EventMembershipObjectPermission]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "user__username",
        "event__name",
    ]

    ordering_fields = [
        "joined_at",
    ]

    ordering = ["-joined_at"]

    def get_queryset(self):
        """
        Optional filtering:
        ?event=<event_id>
        ?user=<user_id>
        """
        qs = super().get_queryset()

        event_id = self.request.query_params.get("event")
        user_id = self.request.query_params.get("user")

        if event_id:
            qs = qs.filter(event_id=event_id)

        if user_id:
            qs = qs.filter(user_id=user_id)

        return qs.filter(get_event_membership_visibility_filter(self.request.user))
