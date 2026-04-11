from django.conf import settings
from django.contrib import admin
from django.conf.urls.static import static
from django.urls import include, path

from apps.core import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", views.index_page, name="index"),
    path("profile/", views.profile_page, name="profile"),
    path("editor/<uuid:project_id>/", views.editor_page, name="editor"),
    path("api/", include("apps.core.urls")),
]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

