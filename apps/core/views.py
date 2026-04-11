from django.shortcuts import render


def index_page(request):
    return render(request, "index.html")


def register_page(request):
    return render(request, "register.html")


def editor_page(request):
    return render(request, "editor.html")
