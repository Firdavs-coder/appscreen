from django.contrib import admin
from django.urls import include, path

from apps.core import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", views.index_page, name="index"),
    path("register/", views.register_page, name="register"),
    path("profile/", views.profile_page, name="profile"),
    path("editor/", views.editor_page, name="editor"),
    path("api/", include("apps.core.urls")),
]
