from django.contrib import admin

from .models import Event, EventCategory, EventParticipation, UsersInEvent


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


@admin.register(EventCategory)
class EventCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name"]
    readonly_fields = ["created_at", "modified_at"]


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
