from django.shortcuts import render, redirect


def index_page(request):
    return render(request, "index.html")


def register_page(request):
    return render(request, "register.html")


def profile_page(request):
    if not request.user.is_authenticated:
        return redirect("index")
    return render(request, "profile.html")


def editor_page(request):
    return render(request, "editor.html")
