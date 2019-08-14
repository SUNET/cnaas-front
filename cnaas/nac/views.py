from django.shortcuts import render
from cnaas import settings

import requests


def users_get():
    try:
        res = requests.get(settings.CNAAS_NAC_HOST + '/auth')
        users = res.json()['data']['users']
    except Exception as e:
        users = {}
    return users


def user_set(username, password, vlan):
    users = {
        'username': username,
        'password': password,
        'vlan': int(vlan)
    }

    res = requests.post(settings.CNAAS_NAC_HOST + '/auth',
                        json=users,
                        verify=False)
    if res.status_code != 200:
        return -1
    return 0


def user_remove(users):
    retval = 0

    for user in users:
        try:
            res = requests.delete(settings.CNAAS_NAC_HOST + '/auth/%s' % user)
        except Exception:
            retval = -1
        if res.status_code != 200:
            retval = -1
    return retval


def nac(request):
    data = {}

    if request.POST:
        if 'user_add' in request.POST:
            if 'username' not in request.POST:
                return render(request, 'nac.html', context=data)
            if 'password' not in request.POST:
                return render(request, 'nac.html', context=data)
            if 'vlan' not in request.POST:
                return render(request, 'nac.html', context=data)
            user_set(request.POST['username'], request.POST['password'],
                     request.POST['vlan'])
        if 'user_delete' in request.POST:
            user_remove(request.POST.getlist('users'))

    data['users'] = users_get()

    return render(request, 'nac.html', context=data)
