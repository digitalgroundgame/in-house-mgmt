from rest_framework.routers import DefaultRouter
from .views import EventViewSet, EventParticipationViewSet, UsersInEventViewSet, CommitmentStatusViewSet

router = DefaultRouter()
router.register("events", EventViewSet, basename="event")
router.register(
    "participants",
    EventParticipationViewSet,
    basename="participant",
)
router.register(
    "commitment-statuses",
    CommitmentStatusViewSet,
    basename="commitment-statuses",
)
router.register(
    "assignments",
    UsersInEventViewSet,
    basename="assignments",
)


urlpatterns = router.urls