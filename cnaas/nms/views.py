from django.shortcuts import render
from cnaas import settings

import time
import requests


def devices_get():
    """
    Get all devices and return as a dict.
    """

    try:
        res = requests.get(settings.CNAAS_HOST + '/device')
        devices = res.json()['data']['devices']
    except Exception:
        devices = {}

    return devices


def device_remove(devices):
    """
    Remove one or more devices
    """

    retval = 0

    for _ in devices:
        hostname, device_id = _.split(',')
        try:
            res = requests.delete(settings.CNAAS_HOST + '/device/%s' % device_id)
        except Exception:
            retval = -1
        if res.status_code != 200:
            retval = -1
    return retval


def device_sync(devices=[], all_devices=False, dry_run=True):
    """
    Sync one or more devices
    """

    for _ in devices:
        hostname, device_id = _.split(',')
        jsondict = {'hostname': hostname, 'dry_run': dry_run}
        res = requests.post(settings.CNAAS_HOST + '/device_syncto',
                            json=jsondict,
                            verify=False)
        if res.status_code != 200:
            return 'Error: Failed to get job IDs'
        job_id = res.json()['job_id']
    return job_id


def device_interfaces(hostname):
    """
    Get device interfaces
    """

    try:
        res = requests.get(settings.CNAAS_HOST + '/device/' + hostname + '/interfaces')
    except Exception:
        return None
    interfaces = res.json()['data']['interfaces']
    return interfaces


def templates_refresh():
    """
    Refresh templates
    """

    jsondict = {'action': 'refresh'}
    res = requests.put(settings.CNAAS_HOST + '/repository/templates',
                       json=jsondict)
    if res.status_code != 200:
        return 'Error: \\nFailed to refresh templates'
    return 'Update succeded: \\n' + res.json()['data'].rstrip()


def settings_refresh():
    """
    Refresh settings
    """

    jsondict = {'action': 'refresh'}
    res = requests.put(settings.CNAAS_HOST + '/repository/settings',
                       json=jsondict)
    if res.status_code != 200:
        return 'Error: \\nFailed to refresh settings'
    return 'Update succeded: \\n' + res.json()['data'].rstrip()


def job_get(job_id=None):
    """
    Get jobs
    """

    job_url = settings.CNAAS_HOST + '/job'
    if job_id is not None:
        job_url += '/' + str(job_id)
    res = requests.get(job_url, verify=False)
    if res.status_code != 200:
        return {}
    return res.json()['data']['jobs']


def job_status(job_id):
    """
    Get job status
    """

    res = job_get(job_id=job_id)
    return res[0]['status']


def index(request):
    """
    Index page
    """

    return render(request, 'index.html', {})


def devices(request):
    """
    Devices page
    """

    data = {}
    data['devices'] = devices_get()
    for _ in data['devices']:
        interfaces = device_interfaces(_['hostname'])
        if interfaces is []:
            continue
        _['interfaces'] = interfaces

    # If we don't get a POST, just render the page
    if not request.POST:
        return render(request, 'devices.html', data)

    devices_selected = request.POST.getlist('device')

    if 'remove' in request.POST:
        res = device_remove(devices_selected)
        data['message'] = res
    elif 'sync_dryrun' in request.POST:
        if devices_selected == []:
            return render(request, 'devices.html', context=data)
        data['dryrun'] = True
        return sync(request, job_id=device_sync(devices_selected), dryrun=True)
    elif 'sync' in request.POST:
        if devices_selected == []:
            return render(request, 'devices.html', context=data)
        data['dryrun'] = False
        return sync(request,
                    job_id=device_sync(devices_selected, dry_run=False),
                    dryrun=False)
    elif 'refresh_templates' in request.POST:
        res = templates_refresh()
        data['message'] = res
    elif 'refresh_settings' in request.POST:
        res = settings_refresh()
        data['message'] = res

    return render(request, 'devices.html', context=data)


def sync(request, job_id=None, devices=None, dryrun=True):
    """
    Sync page
    """

    data = {}
    for i in range(60):
        time.sleep(2)
        if job_status(job_id) == 'FINISHED':
            break
    else:
        data['message'] = 'Device synchronisation failed'
    res = job_get(job_id)[0]
    devices = res['result'].keys()
    data['dryrun'] = dryrun
    data['devices'] = devices
    data['device_data'] = list()

    for device in devices:
        for result in res['result'][device]:
            if type(result) is not dict:
                continue
            if result['name'] == 'push_sync_device':
                continue
            result['hostname'] = device
            data['device_data'].append(result)
    return render(request, 'sync.html', context=data)


def jobs(request):
    data = {}
    data['jobs'] = job_get()

    return render(request, 'jobs.html', context=data)
