from django.shortcuts import render
from cnaas import settings

import requests


def get_devices():
    devices = requests.get(settings.CNAAS_HOST + '/device', verify=False)
    return devices.json()


def get_jobs():
    jobs = requests.get(settings.CNAAS_HOST + '/job', verify=False)
    return jobs.json()


def index(request):
    return render(request, 'index.html', {})


def devices(request):
    devices = get_devices()['data']['devices']
    return render(request, 'devices.html', {'devices': devices})


def jobs(request):
    jobs = get_jobs()['data']['jobs']
    return render(request, 'jobs.html', {'jobs': jobs})
