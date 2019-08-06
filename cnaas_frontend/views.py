from django.shortcuts import render
from services import get_devices


def index(request):
    return render(request, 'index.html', {})
