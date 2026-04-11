import json

from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.db.models import Sum, Count
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.core.models import Project, UsageEvent, UserMediaFile


def _json_body(request):
    if not request.body:
        return {}
    return json.loads(request.body.decode("utf-8"))


def _require_auth(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required"}, status=401)
    return None


def _project_to_dict(project):
    return {
        "id": str(project.uuid),
        "name": project.name,
        "description": project.description,
        "payload": project.payload,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
    }


def _media_file_to_dict(media_file):
    return {
        "id": media_file.id,
        "name": media_file.original_name,
        "url": media_file.file.url,
        "mime_type": media_file.mime_type,
        "size": media_file.size,
        "created_at": media_file.created_at.isoformat(),
    }




@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    data = _json_body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = authenticate(request, username=email, password=password)
    if user is None:
        return JsonResponse({"detail": "Incorrect email or password"}, status=401)
    auth_login(request, user)
    return JsonResponse({
        "id": user.id,
        "email": user.email,
        "full_name": f"{user.first_name} {user.last_name}".strip(),
    })


@csrf_exempt
@require_http_methods(["POST"])
def logout(request):
    auth_logout(request)
    return JsonResponse({}, status=204)


@require_http_methods(["GET"])
def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required"}, status=401)
    return JsonResponse({
        "id": request.user.id,
        "email": request.user.email,
        "full_name": f"{request.user.first_name} {request.user.last_name}".strip() or None,
    })


@csrf_exempt
@require_http_methods(["GET", "POST"])
def projects(request):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error

    if request.method == "GET":
        items = [
            {
                "id": str(project.uuid),
                "name": project.name,
                "description": project.description,
                "payload": project.payload,
                "created_at": project.created_at.isoformat(),
                "updated_at": project.updated_at.isoformat(),
            }
            for project in Project.objects.filter(user=request.user)
        ]
        return JsonResponse(items, safe=False)

    data = _json_body(request)
    project = Project.objects.create(
        user=request.user,
        name=data.get("name") or "Untitled Project",
        description=data.get("description") or "",
        payload=data.get("payload") or {},
    )
    return JsonResponse({
        "id": str(project.uuid),
        "name": project.name,
        "description": project.description,
        "payload": project.payload,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
    }, status=201)


@csrf_exempt
@require_http_methods(["GET", "POST", "DELETE"])
def project_detail(request, project_id):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error

    try:
        project = Project.objects.get(uuid=project_id, user=request.user)
    except Project.DoesNotExist:
        return JsonResponse({"detail": "Project not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(_project_to_dict(project))

    elif request.method == "POST":
        data = _json_body(request)
        if "name" in data:
            project.name = data["name"]
        if "description" in data:
            project.description = data["description"]
        if "payload" in data:
            project.payload = data["payload"]
        project.save()
        return JsonResponse(_project_to_dict(project))

    elif request.method == "DELETE":
        project.delete()
        return JsonResponse({}, status=204)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def media_files(request):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error

    if request.method == "GET":
        items = [_media_file_to_dict(item) for item in UserMediaFile.objects.filter(user=request.user)]
        return JsonResponse(items, safe=False)

    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        return JsonResponse({"detail": "No file uploaded"}, status=400)

    content_type = (uploaded_file.content_type or "").lower()
    if not content_type.startswith("image/"):
        return JsonResponse({"detail": "Only image files are allowed"}, status=400)

    media_file = UserMediaFile.objects.create(
        user=request.user,
        file=uploaded_file,
        original_name=uploaded_file.name,
        mime_type=content_type,
        size=uploaded_file.size or 0,
    )
    return JsonResponse(_media_file_to_dict(media_file), status=201)


@csrf_exempt
@require_http_methods(["DELETE"])
def media_file_detail(request, file_id):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error

    try:
        media_file = UserMediaFile.objects.get(id=file_id, user=request.user)
    except UserMediaFile.DoesNotExist:
        return JsonResponse({"detail": "Media file not found"}, status=404)

    if media_file.file:
        media_file.file.delete(save=False)
    media_file.delete()
    return JsonResponse({}, status=204)


@csrf_exempt
@require_http_methods(["POST"])
def usage_events(request):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error
    data = _json_body(request)
    event = UsageEvent.objects.create(
        user=request.user,
        event_type=data.get("event_type") or "event",
        ai_tokens_spent=int(data.get("ai_tokens_spent") or 0),
        screenshots_generated=int(data.get("screenshots_generated") or 0),
        payload=data.get("payload") or {},
    )
    return JsonResponse({
        "id": event.id,
        "event_type": event.event_type,
        "ai_tokens_spent": event.ai_tokens_spent,
        "screenshots_generated": event.screenshots_generated,
        "payload": event.payload,
        "created_at": event.created_at.isoformat(),
    }, status=201)


@require_http_methods(["GET"])
def usage_summary(request):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error
    summary = UsageEvent.objects.filter(user=request.user).aggregate(
        total_ai_tokens_spent=Sum("ai_tokens_spent"),
        total_screenshots_generated=Sum("screenshots_generated"),
        event_count=Count("id"),
    )
    return JsonResponse({
        "total_ai_tokens_spent": summary["total_ai_tokens_spent"] or 0,
        "total_screenshots_generated": summary["total_screenshots_generated"] or 0,
        "event_count": summary["event_count"] or 0,
    })
