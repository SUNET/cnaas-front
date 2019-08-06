from django.shortcuts import render
from . import services


def index(request):
    return render(request, 'index.html', {})


def devices(request):
    devices = services.get_devices()['data']['devices']
    return render(request, 'devices.html', {'devices': devices})


def jobs(request):
    jobs = services.get_jobs()['data']['jobs']
    return render(request, 'jobs.html', {'jobs': jobs})
