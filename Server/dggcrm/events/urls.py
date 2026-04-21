from rest_framework.routers import DefaultRouter

from .views import (
    CommitmentStatusViewSet,
    EventCategoryViewSet,
    EventParticipationViewSet,
    EventStatusViewSet,
    EventViewSet,
    UsersInEventViewSet,
)

router = DefaultRouter()
router.trailing_slash = "/?"
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
    "event-statuses",
    EventStatusViewSet,
    basename="event-statuses",
)
router.register(
    "assignments",
    UsersInEventViewSet,
    basename="assignments",
)
router.register(
    "event-categories",
    EventCategoryViewSet,
    basename="event-categories",
)


urlpatterns = router.urls
