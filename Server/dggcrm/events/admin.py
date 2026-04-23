from django.contrib import admin

from .models import Event, EventParticipation, StagedEvent, StagedEventParticipation, UsersInEvent


class EventParticipationInline(admin.TabularInline):
    model = EventParticipation
    extra = 1
    autocomplete_fields = ["event"]
    readonly_fields = ["created_at", "modified_at"]


class UsersInEventInline(admin.TabularInline):
    model = UsersInEvent
    extra = 1
    autocomplete_fields = ["event"]
    readonly_fields = ["joined_at"]


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["name", "event_status", "created_at", "modified_at"]
    search_fields = ["name", "description"]
    list_filter = ["event_status", "created_at"]
    ordering = ["-created_at"]

    readonly_fields = ["created_at", "modified_at"]

    inlines = [EventParticipationInline, UsersInEventInline]


@admin.register(EventParticipation)
class EventParticipationAdmin(admin.ModelAdmin):
    list_display = ["event", "contact", "status", "created_at"]
    search_fields = ["event__name", "contact__full_name"]
    list_filter = ["status"]

    readonly_fields = ["created_at", "modified_at"]


@admin.register(UsersInEvent)
class UsersInEventAdmin(admin.ModelAdmin):
    list_display = ["user", "event", "joined_at"]
    search_fields = ["event__name", "user__username"]
    list_filter = ["event"]

    readonly_fields = ["joined_at"]


class StagedEventParticipationInline(admin.TabularInline):
    model = StagedEventParticipation
    extra = 0
    readonly_fields = ["discord_id", "discord_name", "status", "created_at", "imported_at"]
    can_delete = False


@admin.register(StagedEvent)
class StagedEventAdmin(admin.ModelAdmin):
    list_display = ["event_name", "discord_event_id", "event_tracker_discord_id", "created_at"]
    search_fields = ["event_name", "discord_event_id", "event_tracker_discord_id"]
    list_filter = ["created_at"]
    ordering = ["-created_at"]
    readonly_fields = ["discord_event_id", "event_name", "event_tracker_discord_id", "created_at", "modified_at"]
    inlines = [StagedEventParticipationInline]


@admin.register(StagedEventParticipation)
class StagedEventParticipationAdmin(admin.ModelAdmin):
    list_display = ["discord_name", "discord_id", "staged_event", "status", "imported_at"]
    search_fields = ["discord_name", "discord_id", "staged_event__event_name"]
    list_filter = ["status", "imported_at"]
    readonly_fields = ["staged_event", "discord_id", "discord_name", "status", "created_at"]
