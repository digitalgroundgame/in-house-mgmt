from django.urls import path

from .views import (
    CheckAttendancePermissionView,
    MyStagedEventsView,
    RecordAttendanceView,
    StagedImportExecuteView,
    StagedImportPreviewView,
    SyncMembershipTagsView,
)

urlpatterns = [
    path("sync-membership/", SyncMembershipTagsView.as_view(), name="sync-membership"),
    path("record-attendance/", RecordAttendanceView.as_view(), name="record-attendance"),
    path(
        "can-record-attendance/",
        CheckAttendancePermissionView.as_view(),
        name="can-record-attendance",
    ),
    path("staged-events/mine/", MyStagedEventsView.as_view(), name="my-staged-events"),
    path(
        "staged-events/<int:staged_id>/preview/",
        StagedImportPreviewView.as_view(),
        name="staged-import-preview",
    ),
    path(
        "staged-events/<int:staged_id>/import/",
        StagedImportExecuteView.as_view(),
        name="staged-import-execute",
    ),
]
