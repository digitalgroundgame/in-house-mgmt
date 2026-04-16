from rest_framework.routers import DefaultRouter

from .views import (
    ContactViewSet,
    TagAssignmentViewSet,
    TagViewSet,
)

router = DefaultRouter()
router.trailing_slash = "/?"
router.register("contacts", ContactViewSet, basename="contact")
router.register("tags", TagViewSet, basename="tag")
router.register("tag-assignments", TagAssignmentViewSet, basename="tag-assignment")

urlpatterns = router.urls
