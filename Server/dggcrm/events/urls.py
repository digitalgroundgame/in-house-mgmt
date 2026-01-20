from rest_framework.routers import DefaultRouter
from .views import EventViewSet, EventParticipationViewSet, CommitmentStatusViewSet

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


urlpatterns = router.urls