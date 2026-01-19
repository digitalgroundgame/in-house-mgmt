from django.urls import path
from .views import SocialConnectionDeleteView, CurrentUserView

urlpatterns = [
    path("auth/social/connections/<str:provider>/", SocialConnectionDeleteView.as_view(), name="social_connection_delete"),
    path("auth/user/", CurrentUserView.as_view(), name="current-user")
]
