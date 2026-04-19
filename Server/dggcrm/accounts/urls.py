from django.urls import path
from health_check.views import HealthCheckView
from rest_framework.routers import DefaultRouter

from .views import (
    CurrentUserView,
    DiscordIDViewSet,
    GroupListView,
    ManagedUserViewSet,
    SocialConnectionDeleteView,
    ToggleUserActiveView,
    UserPreferencesView,
    UserSearchView,
)

router = DefaultRouter()
router.register("management/users", ManagedUserViewSet, basename="managed-users")
router.register("management/discord-ids", DiscordIDViewSet, basename="discord-ids")

urlpatterns = [
    path(
        "auth/social/connections/<str:provider>/", SocialConnectionDeleteView.as_view(), name="social_connection_delete"
    ),
    path("auth/user/", CurrentUserView.as_view(), name="current-user"),
    path("auth/preferences/", UserPreferencesView.as_view(), name="user-preferences"),
    path("users/", UserSearchView.as_view(), name="user-search"),
    path("management/groups/", GroupListView.as_view(), name="group-list"),
    path("management/users/<int:pk>/toggle-active/", ToggleUserActiveView.as_view(), name="toggle-user-active"),
    path(
        "health/",
        HealthCheckView.as_view(
            checks=[
                "health_check.DNS",
                "health_check.Database",
                "health_check.Storage",
            ]
        ),
    ),
    *router.urls,
]
