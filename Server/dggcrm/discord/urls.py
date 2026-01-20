from django.urls import path
from .views import SyncMembershipTagsView

urlpatterns = [
    path("sync-membership/", SyncMembershipTagsView.as_view(), name="sync-membership"),
]
