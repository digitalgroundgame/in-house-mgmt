from django.contrib import admin

from .models import Ticket, TicketComment


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "ticket_type", "ticket_status", "assigned_to", "created_at", "modified_at"]
    search_fields = ["id", "title"]
    list_filter = ["ticket_type", "ticket_status", "created_at"]
    ordering = ["-created_at"]

    readonly_fields = ["reported_by", "created_at", "modified_at"]

    def save_model(self, request, obj, form, change):
        # Automatically set reported_by to the logged-in user on create
        if not change and obj.reported_by is None:
            obj.reported_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    list_display = ["ticket", "author", "message", "modified_at"]
    search_fields = ["message", "author__id", "ticket__id", "modified_at"]
    list_filter = ["author", "created_at"]
    ordering = ["-created_at"]

    readonly_fields = ["created_at", "modified_at"]

    def save_model(self, request, obj, form, change):
        # Automatically set reported_by to the logged-in user on create
        if not change and obj.author is None:
            obj.author = request.user
        super().save_model(request, obj, form, change)
