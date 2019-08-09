from django.shortcuts import render
from cnaas import settings

import requests


#
# Get all devices
#
def devices_get():
    devices = requests.get(settings.CNAAS_HOST + '/device')
    return devices.json()['data']['devices']


#
# Remove one or more devices
#
def device_remove(devices):
    for _ in devices:
        hostname, device_id = _.split(',')
        res = requests.delete(settings.CNAAS_HOST + '/device/%s' % device_id)
        if res.status_code != 200:
            return 'Error'
    return 'Devices removed successfully'


#
# Sync one or more devices
#
def device_sync(devices=[], all_devices=False):
    job_ids = []
    for _ in devices:
        hostname, device_id = _.split(',')
        jsondict = {'hostname': hostname, 'dry_run': True}
        res = requests.post(settings.CNAAS_HOST + '/device_syncto',
                            json=jsondict,
                            verify=False)
        if res.status_code != 200:
            return 'Error: Failed to get job IDs'
        job_ids.append(res.json()['job_id'])
    return job_ids


#
# Refresh templates
#
def templates_refresh():
    jsondict = {'action': 'refresh'}
    res = requests.put(settings.CNAAS_HOST + '/repository/templates',
                       json=jsondict)
    if res.status_code != 200:
        return 'Error: \\nFailed to refresh templates'
    return 'Update succeded: \\n' + res.json()['data'].rstrip()


#
# Refresh settings
#
def settings_refresh():
    jsondict = {'action': 'refresh'}
    res = requests.put(settings.CNAAS_HOST + '/repository/settings',
                       json=jsondict)
    if res.status_code != 200:
        return 'Error: \\nFailed to refresh settings'
    return 'Update succeded: \\n' + res.json()['data'].rstrip()


#
# Get jobs
#
def jobs_get():
    jobs = requests.get(settings.CNAAS_HOST + '/job', verify=False)
    return jobs.json()


#
# Index view
#
def index(request):
    return render(request, 'index.html', {})


#
# Device view
#
def devices(request):
    data = {}
    sync_ids = {}

    data['devices'] = devices_get()

    # If we don't get a POST, just render the page
    if not request.POST:
        return render(request, 'devices.html', data)

    devices_selected = request.POST.getlist('device')

    if 'remove' in request.POST:
        res = device_remove(devices_selected)
        data['message'] = res
    elif 'sync' in request.POST:
        sync_ids = device_sync(devices_selected)
        data['sync_ids'] = sync_ids
    elif 'sync_all' in request.POST:
        sync_ids = device_sync(all_devices=True)
        data['sync_ids'] = sync_ids
    elif 'refresh_templates' in request.POST:
        res = templates_refresh()
        data['message'] = res
    elif 'refresh_settings' in request.POST:
        res = settings_refresh()
        data['message'] = res

    return render(request, 'devices.html', context=data)


#
# Jobs view
#
def jobs(request):
    jobs = jobs_get()['data']['jobs']
    return render(request, 'jobs.html', {'jobs': jobs})


#
# Sync view
#
def sync(request):
    print(request)
    return render(request, 'sync.html', {})
