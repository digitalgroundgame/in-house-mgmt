from rest_framework import viewsets, filters, status
from rest_framework.exceptions import APIException
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, DjangoModelPermissions
from rest_framework.response import Response
from auditlog.models import LogEntry
from django.db.models import Count, Q, F
from django.contrib.contenttypes.models import ContentType
from django.http import HttpResponseBadRequest

from .models import Ticket, TicketStatus, TicketType, TicketComment
from .serializers import (
    TicketSerializer, BulkTicketCreateSerializer,
    TicketClaimSerializer, TicketCommentSerializer, TicketTimelineSerializer
)
from .permissions import (
    CanCommentTicket, CanClaimTicket, CanAssignTicket,
    CanViewTicket, CanChangeTicket
)

class TicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Tickets with layered permissions:
    - Base: authenticated users
    - Object-level: assignment + custom permissions
    """
    queryset = Ticket.objects.all().order_by('-created_at')
    serializer_class = TicketSerializer
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    search_fields = ['id', 'title']
    ordering_fields = ['priority', 'created_at', 'modified_at', 'ticket_status', 'ticket_type']
    ordering = ['priority', '-created_at']
    permission_classes = [IsAuthenticated, DjangoModelPermissions]

    def get_queryset(self):
        """
        Apply filters while respecting object-level rules.
        Trainees/helpers will only see tickets they are assigned to unless they are superuser.
        """
        user = self.request.user
        queryset = super().get_queryset()

        ticket_status = self.request.query_params.get('status')
        ticket_type = self.request.query_params.get('type')
        priority = self.request.query_params.get('priority')
        assigned_to_id = self.request.query_params.get('assigned_to')
        reported_by_id = self.request.query_params.get('reported_by')
        event_id = self.request.query_params.get('event')
        contact_id = self.request.query_params.get('contact')

        # Filter out tickets based on permissions
        if not user.is_superuser:
            if user.has_perm("tickets.view_all_tickets"):
                # can see everything
                pass
            elif user.has_perm("tickets.view_event_tickets"):
                # see tickets for events the user is assigned to
                queryset = queryset.filter(event__assigned_users=user)
            else:
                # default: only tickets assigned to user or reported by user
                queryset = queryset.filter(Q(assigned_to=user) | Q(reported_by=user))

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

        return queryset

    # ------------------------
    # Custom Actions
    # ------------------------

    @action(
        detail=False,
        methods=["post"],
        url_path="bulk",
        serializer_class=BulkTicketCreateSerializer,
        permission_classes=[IsAuthenticated, DjangoModelPermissions],  # organizer/admin only
    )
    def bulk_create_tickets(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tickets = serializer.save()
        return Response({"created_count": len(tickets)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post', 'delete'], url_path='claim', serializer_class=TicketClaimSerializer,
            permission_classes=[IsAuthenticated, CanClaimTicket])
    def claim(self, request, pk=None):
        ticket = self.get_object()
        self.check_object_permissions(request, ticket)

        if request.method == "DELETE":
            if ticket.assigned_to != request.user:
                return HttpResponseBadRequest("Cannot unclaim a ticket you are not assigned to")
            ticket.assigned_to = None
            ticket.save(update_fields=["assigned_to"])
        else:  # POST
            if ticket.assigned_to and ticket.assigned_to != request.user:
                return HttpResponseBadRequest("Ticket is already claimed")
            ticket.assigned_to = request.user
            ticket.save(update_fields=["assigned_to"])

        return Response(TicketSerializer(ticket, context={"request": request}).data, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['post'],
        url_path='comment',
        serializer_class=TicketCommentSerializer,
        permission_classes=[IsAuthenticated, CanCommentTicket]
    )
    def comment(self, request, pk=None):
        ticket = self.get_object()
        self.check_object_permissions(request, ticket)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(ticket=ticket, author=request.user)
        return Response(TicketCommentSerializer(comment, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def timeline(self, request, pk=None):
        ticket = self.get_object()
        show_type = self.request.query_params.get("show", "both").lower()

        audit_entries, comments = [], []

        if show_type in ["audit", "both"]:
            audit_entries = LogEntry.objects.filter(
                content_type=ContentType.objects.get_for_model(Ticket),
                object_pk=ticket.pk,
            )

        if show_type in ["comment", "both"]:
            comments = ticket.comments.all()

        combined_entries = [
            {
                "type": "audit",
                "created_at": log.timestamp,
                "actor_display": log.actor.username if log.actor else None,
                "actor_id": log.actor.id if log.actor else None,
                "changes": log.changes or log.object_repr,
            }
            for log in audit_entries
        ] + [
            {
                "type": "comment",
                "created_at": comment.created_at,
                "actor_display": comment.author.username if comment.author else None,
                "actor_id": comment.author.id if comment.author else None,
                "message": comment.message,
            }
            for comment in comments
        ]

        combined_entries.sort(key=lambda e: e["created_at"], reverse=True)

        page = self.paginate_queryset(combined_entries)
        if page is not None:
            serializer = TicketTimelineSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = TicketTimelineSerializer(combined_entries, many=True)
        return Response(serializer.data)

    # ------------------------
    # Standard CRUD
    # ------------------------

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(reported_by=user if user and user.is_authenticated else None)

class TicketTypeViewSet(viewsets.ViewSet):
    def list(self, request):
        types = [{'value': t.value, 'label': t.label} for t in TicketType]
        return Response(types)
