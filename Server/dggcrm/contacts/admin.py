from django.contrib import admin

from .models import Contact, Tag, TagAssignments


class TagAssignmentsInline(admin.TabularInline):
    model = TagAssignments
    extra = 1


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ["full_name", "email", "discord_id", "phone", "created_at"]
    search_fields = ["full_name", "email", "discord_id", "phone", "note"]
    list_filter = ["created_at", "modified_at"]
    ordering = ["full_name"]

    readonly_fields = ["created_at", "modified_at"]

    inlines = [TagAssignmentsInline]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "color"]
    search_fields = ["name"]
    ordering = ["name"]

    readonly_fields = ["created_at", "modified_at"]


@admin.register(TagAssignments)
class TagAssignmentsAdmin(admin.ModelAdmin):
    list_display = ["contact", "tag", "created_at"]
    search_fields = ["contact__full_name", "tag__name"]
    list_filter = ["tag"]
    ordering = ["contact"]

    readonly_fields = ["created_at"]
