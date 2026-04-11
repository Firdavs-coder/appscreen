from django.conf import settings
from django.db import models
import uuid


def user_media_upload_path(instance, filename):
    return f"users/{instance.user_id}/uploads/{filename}"


class Project(models.Model):
    uuid = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]


class UsageEvent(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="usage_events")
    event_type = models.CharField(max_length=100)
    ai_tokens_spent = models.PositiveIntegerField(default=0)
    screenshots_generated = models.PositiveIntegerField(default=0)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class UserMediaFile(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="media_files")
    file = models.FileField(upload_to=user_media_upload_path)
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100, blank=True)
    size = models.PositiveBigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
