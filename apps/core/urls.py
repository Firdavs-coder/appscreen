from django.urls import path

from apps.core import api

urlpatterns = [
    path("auth/login/", api.login),
    path("auth/logout/", api.logout),
    path("auth/me/", api.me),
    path("projects/", api.projects),
        path("projects/<int:project_id>/", api.project_detail),
    path("usage/events/", api.usage_events),
    path("usage/summary/", api.usage_summary),
]
