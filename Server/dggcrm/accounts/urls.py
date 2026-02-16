from django.urls import path
from health_check.views import HealthCheckView

from .views import CurrentUserView, SocialConnectionDeleteView, UserPreferencesView, UserSearchView

urlpatterns = [
    path(
        "auth/social/connections/<str:provider>/", SocialConnectionDeleteView.as_view(), name="social_connection_delete"
    ),
    path("auth/user/", CurrentUserView.as_view(), name="current-user"),
    path("auth/preferences/", UserPreferencesView.as_view(), name="user-preferences"),
    path("users/", UserSearchView.as_view(), name="user-search"),
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
]
