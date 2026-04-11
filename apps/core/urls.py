from django.urls import path

from apps.core import api

urlpatterns = [
    path("auth/register/", api.register),
    path("auth/login/", api.login),
    path("auth/logout/", api.logout),
    path("auth/me/", api.me),
    path("projects/", api.projects),
    path("usage/events/", api.usage_events),
    path("usage/summary/", api.usage_summary),
]
