from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from apps.core.models import Project


def index_page(request):
    return render(request, "index.html")


def profile_page(request):
    if not request.user.is_authenticated:
        return redirect("index")
    return render(request, "profile.html")


@login_required
def editor_page(request, project_id):
    try:
        project = Project.objects.get(uuid=project_id, user=request.user)
    except (Project.DoesNotExist, ValueError):
        return redirect("profile")
    
    return render(request, "editor.html", {"project": project})

