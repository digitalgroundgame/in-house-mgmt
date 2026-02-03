from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    TicketAskStatusesViewSet,
    TicketPrioritiesViewSet,
    TicketStatusesViewSet,
    TicketTypeViewSet,
    TicketViewSet,
)

router = DefaultRouter()
router.register("tickets", TicketViewSet, basename="ticket")
router.register("ticket-types", TicketTypeViewSet, basename="ticket-types")
router.register("ticket-statuses", TicketStatusesViewSet, basename="ticket-statuses")
router.register("ticket-ask-statuses", TicketAskStatusesViewSet, basename="ticket-ask-statuses")
router.register("ticket-priorities", TicketPrioritiesViewSet, basename="ticket-priorities")

urlpatterns = [
    path("", include(router.urls)),
]
