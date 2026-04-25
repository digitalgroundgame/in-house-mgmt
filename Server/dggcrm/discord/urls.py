from django.urls import path

from .views import CheckAttendancePermissionView, RecordAttendanceView, SyncMembershipTagsView

urlpatterns = [
    path("sync-membership/", SyncMembershipTagsView.as_view(), name="sync-membership"),
    path("record-attendance/", RecordAttendanceView.as_view(), name="record-attendance"),
    path(
        "can-record-attendance/",
        CheckAttendancePermissionView.as_view(),
        name="can-record-attendance",
    ),
]
