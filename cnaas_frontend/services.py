import requests

from . import settings


def get_devices():
    devices = requests.get(settings.CNAAS_HOST + '/device', verify=False)
    return devices.json()


def get_jobs():
    jobs = requests.get(settings.CNAAS_HOST + '/job', verify=False)
    return jobs.json()
