from django.contrib import admin

from apps.core.models import Project, UsageEvent


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "updated_at")
    search_fields = ("name", "user__username", "user__email")


@admin.register(UsageEvent)
class UsageEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "user", "ai_tokens_spent", "screenshots_generated", "created_at")
    search_fields = ("event_type", "user__username", "user__email")
