from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import TicketViewSet, TicketTypeViewSet

router = DefaultRouter()
router.register('tickets', TicketViewSet, basename='ticket')
router.register('ticket-types', TicketTypeViewSet, basename='ticket-types')

urlpatterns = [
    path('', include(router.urls)),
]
