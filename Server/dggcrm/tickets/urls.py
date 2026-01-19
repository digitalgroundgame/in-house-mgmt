from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import TicketViewSet, TicketTypeViewSet, TicketPrioritiesViewSet

router = DefaultRouter()
router.register('tickets', TicketViewSet, basename='ticket')
router.register('ticket-types', TicketTypeViewSet, basename='ticket-types')
router.register('ticket-priorities', TicketPrioritiesViewSet, basename='ticket-priorities')

urlpatterns = [
    path('', include(router.urls)),
]
