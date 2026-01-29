from rest_framework import viewsets, filters
from rest_framework.exceptions import APIException
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, DjangoModelPermissions
from rest_framework import status
from auditlog.models import LogEntry    

from django.shortcuts import get_object_or_404
from django.http import HttpResponseBadRequest
from django.db.models import Count, Q, F
from django.contrib.contenttypes.models import ContentType

from ..events.models import EventParticipation
from .models import Ticket, TicketStatus, TicketType, TicketComment, TicketAskStatus, TicketAsks
from .serializers import TicketSerializer, BulkTicketCreateSerializer, TicketClaimSerializer, TicketCommentSerializer, TicketTimelineSerializer, TicketAskSerializer
from .permissions import (
    get_ticket_visibility_filter,
    TicketObjectPermission,
    TicketClaimPermission,
    CanCommentOnTicketPermission,
)

# TODO: Handle permissions for views in file
class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all().order_by('-created_at')
    serializer_class = TicketSerializer
    permission_classes = [
        IsAuthenticated,
        DjangoModelPermissions,
        TicketObjectPermission
    ]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    search_fields = ['id', 'title']
    ordering_fields = ['id', 'title', 'assigned_to_id', 'priority', 'created_at', 'modified_at', 'ticket_status', 'ticket_type', ]
    ordering = ['priority', '-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()

        ticket_status = self.request.query_params.get('status')
        ticket_type = self.request.query_params.get('type')
        priority = self.request.query_params.get('priority')
        assigned_to_id = self.request.query_params.get('assigned_to')
        reported_by_id = self.request.query_params.get('reported_by')
        event_id = self.request.query_params.get('event')
        contact_id = self.request.query_params.get('contact')

        if ticket_status is not None:
            queryset = queryset.filter(ticket_status=ticket_status)

        if ticket_type is not None:
            queryset = queryset.filter(ticket_type=ticket_type)

        if priority is not None:
            try:
                priority = int(priority)
            except ValueError:
                raise APIException(
                    detail='Invalid priority in query',
                    code=status.HTTP_400_BAD_REQUEST
                )
            queryset = queryset.filter(priority=priority)

        if assigned_to_id is not None:
            queryset = queryset.filter(assigned_to=assigned_to_id)
        if reported_by_id is not None:
            queryset = queryset.filter(reported_by=reported_by_id)
        if event_id is not None:
            queryset = queryset.filter(event=event_id)
        if contact_id is not None:
            queryset = queryset.filter(contact=contact_id)

        return queryset.filter(
            get_ticket_visibility_filter(self.request.user)
        ).distinct()

    # TODO: Limit this API to organizer role or above
    @action(detail=False, methods=["post"], url_path="bulk", serializer_class=BulkTicketCreateSerializer)
    def bulk_create_tickets(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tickets = serializer.save()
        return Response(
            {"created_count": len(tickets)},
            status=status.HTTP_201_CREATED
        )

    # TODO: Limit this API to organizer role or above
    @action(detail=False, methods=["get"])
    def group_by_contact(self, request):
        min_date = request.query_params.get("min_date")
        max_date = request.query_params.get("max_date")
        min_tickets = int(request.query_params.get("min_tickets", 0))
        max_tickets = request.query_params.get("max_tickets")

        ticket_status = self.request.query_params.get("status", TicketStatus.COMPLETED)
        ticket_type = request.query_params.get("type")

        qs = (
            Ticket.objects
            .filter(
                contact__isnull=False,
            )
        )

        # Query date ranges
        if min_date:
            qs.filter(created_at__gte=min_date)
        if max_date:
            qs.filter(created_at__lte=max_date)


        if ticket_type:
            qs = qs.filter(ticket_type=type)

        qs = (
            qs.values("contact_id", full_name=F("contact__full_name"))
            .annotate(
                ticket_count=Count(
                    "id",
                    filter=Q(ticket_status=ticket_status),
                )
            )
            .filter(ticket_count__gte=min_tickets)
            .order_by("-ticket_count", "contact_id")
        )

        if max_tickets is not None:
            qs = qs.filter(ticket_count__lte=int(max_tickets))


        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(page)

        return Response(qs)

    @action(
        detail=True,
        methods=["post", "delete"],
        url_path="claim",
        serializer_class=TicketClaimSerializer,
        permission_classes=[
            IsAuthenticated, TicketObjectPermission, TicketClaimPermission
        ],
    )
    def claim(self, request, pk=None):
        ticket = self.get_object()
        user = request.user

        if request.method == "POST":
            ticket.assigned_to = user
            ticket.ticket_status = TicketStatus.TODO
            ticket.save(update_fields=["assigned_to", "ticket_status"])

        elif request.method == "DELETE":
            ticket.assigned_to = None
            ticket.ticket_status = TicketStatus.OPEN
            ticket.save(update_fields=["assigned_to", "ticket_status"])

        serializer = TicketSerializer(ticket, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["post"],
        url_path="comment",
        serializer_class=TicketCommentSerializer,
        permission_classes=[
            IsAuthenticated, DjangoModelPermissions, TicketObjectPermission, CanCommentOnTicketPermission
        ],
    )
    def comment(self, request, pk=None):
        ticket = self.get_object()

        if not can_comment_on_ticket(request.user, ticket):
            return HttpResponseBadRequest("Error: cannot comment on this ticket")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = serializer.save(
            ticket=ticket,
            author=request.user,
        )

        return Response(
            TicketCommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["get", "patch"],
        url_path=r"asks(?:/(?P<ask_id>[^/.]+))?",
        serializer_class=TicketAskSerializer
    )
    def asks(self, request, pk=None, ask_id=None):
        """
        GET   /tickets/{ticket_id}/asks/
        PATCH /tickets/{ticket_id}/asks/{ask_id}/
        """
        ticket = self.get_object()

        # ---- LIST ----
        if request.method == "GET":
            asks = ticket.audit_logs.all()
            serializer = self.get_serializer(asks, many=True)
            return Response(serializer.data)

        # ---- UPDATE ----
        if not ask_id:
            return Response(
                {"detail": "ask_id is required for PATCH."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ask = get_object_or_404(
            TicketAsks,
            id=ask_id,
            ticket=ticket,
        )

        serializer = self.get_serializer(
            ask,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


    @action(
        detail=True,
        methods=["get"],
        permission_classes=[
            IsAuthenticated, DjangoModelPermissions, TicketObjectPermission,
        ],
    )
    def timeline(self, request, pk=None):
        ticket = self.get_object()
        show_type = self.request.query_params.get("show", "all").lower()

        ticket_audit_entries = []
        comments = []
        event_participation_audit_entries = []

        if show_type in ["audit", "all"]:
            ticket_audit_entries = LogEntry.objects.filter(
                content_type=ContentType.objects.get_for_model(Ticket),
                object_pk=ticket.pk,
            )

        if show_type in ["comment", "all"]:
            comments = ticket.comments.all()
        
        if show_type in ["event_participation", "all"]:
            try:
                event_participation = EventParticipation.objects.get(event=ticket.event, contact=ticket.contact)
                event_participation_audit_entries = event_participation.history.all()
            except:
                print(f"No event participations for {ticket.contact.full_name}", flush=True)
                pass

        combined_entries = []

        for log in ticket_audit_entries:
            combined_entries.append({
                "type": "audit",
                "created_at": log.timestamp,
                "actor_display": log.actor.username if log.actor else None,
                "actor_id": log.actor.id if log.actor else None,
                "changes": log.changes or log.object_repr,
            })

        for comment in comments:
            combined_entries.append({
                "type": "comment",
                "created_at": comment.created_at,
                "actor_display": comment.author.username if comment.author else None,
                "actor_id": comment.author.id if comment.author else None,
                "message": comment.message,
            })
        for event_participation in event_participation_audit_entries:
            print(event_participation, flush=True)
            combined_entries.append({
                "type": "event_participation",
                "created_at": event_participation.timestamp,
                "actor_display": event_participation.actor.username if event_participation.actor else None,
                "actor_id": event_participation.actor.id if event_participation.actor else None,
                "changes": event_participation.changes or log.object_repr,
            })

        # Sort newest first
        combined_entries.sort(key=lambda e: e["created_at"], reverse=True)
        serializer = TicketTimelineSerializer(combined_entries, many=True)

        page = self.paginate_queryset(combined_entries)
        if page is not None:
            # Reserializer page
            serializer = TicketTimelineSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        return Response(serializer.data)


    def perform_create(self, serializer):
        """
        Automatically sets reported_by to the current authenticated user.
        """
        user = self.request.user
        serializer.save(reported_by=user if user and user.is_authenticated else None)

class TicketTypeViewSet(viewsets.ViewSet):
    permission_classes = [
        IsAuthenticated,
    ]
    def list(self, request):
        types = [{'value': t.value, 'label': t.label} for t in TicketType]
        return Response(types)

class TicketAskStatusesViewSet(viewsets.ViewSet):
    permission_classes = [
        IsAuthenticated,
    ]
    def list(self, request):
        types = [{'value': t.value, 'label': t.label} for t in TicketAskStatus]
        return Response(types)

class TicketPrioritiesViewSet(viewsets.ViewSet):
    permission_classes = [
        IsAuthenticated,
    ]
    def list(self, request):
        types = [{'value': t.value, 'label': t.label} for t in Ticket.Priority]
        return Response(types)

class TicketStatusesViewSet(viewsets.ViewSet):
    def list(self, request):
        types = [{'value': t.value, 'label': t.label} for t in TicketStatus]
        return Response(types)
