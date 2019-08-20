from django.shortcuts import render
from cnaas import settings

import time
import requests


def devices_get():
	"""
	Get all devices and return as a dict.
	"""

	try:
		res = requests.get(settings.CNAAS_HOST + '/device', verify=False)
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
			res = requests.delete(settings.CNAAS_HOST + '/device/%s' % device_id,
								  verify=False)
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
		jsondict = {'hostname': hostname, 'dry_run': dry_run, "force": True}
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
		res = requests.get(settings.CNAAS_HOST + '/device/' + hostname + '/interfaces',
						   verify=False)
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
					   json=jsondict,
					   verify=False)
	if res.status_code != 200:
		return 'Error: \\nFailed to refresh templates'
	return 'Update succeded: \\n' + res.json()['data'].rstrip()


def settings_refresh():
	"""
	Refresh settings
	"""

	jsondict = {'action': 'refresh'}
	res = requests.put(settings.CNAAS_HOST + '/repository/settings',
					   json=jsondict,
					   verify=False)
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


def mgmtdomains_get():
	"""
	Get all management domains and return as a dict.
	"""

	try:
		res = requests.get(settings.CNAAS_HOST + '/mgmtdomain', verify=False)
		domains = res.json()['data']['mgmtdomains']
	except Exception:
		domains = {}

	return domains


def linknets_get():
	"""
	Get all linknets and return as a dict.
	"""

	try:
		res = requests.get(settings.CNAAS_HOST + '/linknet', verify=False)
		linknets = res.json()['data']['linknet']
	except Exception:
		linknets = {}

	return linknets


def mgmtdomain_add(mgmtdict):
	res = requests.post(settings.CNAAS_HOST + '/mgmtdomain',
						json=mgmtdict,
						verify=False)
	print(res.status_code)
	if res.status_code != 200:
		return -1
	return 0


def mgmtdomain_remove(domains):
	retval = 0

	for domain in domains:
		try:
			res = requests.delete(settings.CNAAS_HOST + '/mgmtdomain/%s' % domain,
								  verify=False)
		except Exception as e:
			retval = -1
		if res.status_code != 200:
			retval = -1
	return retval


def linknet_add(linknetdict):
	res = requests.post(settings.CNAAS_HOST + '/linknet',
						json=mgmtdict,
						verify=False)
	print(res.status_code)
	if res.status_code != 200:
		return -1
	return 0


def linknet_remove(linknets):
	retval = 0

	for linknet in linknets:
		try:
			res = requests.delete(settings.CNAAS_HOST + '/linknet/%s' % linknet,
								  verify=False)
		except Exception as e:
			retval = -1
		if res.status_code != 200:
			retval = -1
	return retval


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


def mgmtdomains(request):
	data = {}

	if not request.POST:
		data['mgmtdomains'] = mgmtdomains_get()
		print(data)
		return render(request, 'mgmtdomains.html', context=data)

	if 'domain_add' in request.POST:
		mgmtdomain = {}
		if 'ipv4_gw' in request.POST:
			mgmtdomain['ipv4_gw'] = request.POST['ipv4_gw']
		if 'device_a_id' in request.POST:
			mgmtdomain['device_a_id'] = int(request.POST['device_a_id'])
		if 'device_a_ip' in request.POST:
			mgmtdomain['device_a_ip'] = request.POST['device_a_ip']
		if 'device_b_id' in request.POST:
			mgmtdomain['device_b_id'] = int(request.POST['device_b_id'])
		if 'device_b_ip' in request.POST:
			mgmtdomain['device_b_ip'] = request.POST['device_b_ip']
		if 'vlan' in request.POST:
			mgmtdomain['vlan'] = int(request.POST['vlan'])
		if 'description' in request.POST:
			mgmtdomain['description'] = request.POST['description']
		mgmtdomain_add(mgmtdomain)
	elif 'domain_delete' in request.POST:
		mgmtdomain_remove(request.POST.getlist('selected'))

	data['mgmtdomains'] = mgmtdomains_get()

	return render(request, 'mgmtdomains.html', context=data)


def linknets(request):
	data = {}

	if not request.POST:
		data['linknets'] = linknets_get()
		print(data)
		return render(request, 'linknets.html', context=data)

	if 'linknet_add' in request.POST:
		linknet = {}
		if 'ipv4_gw' in request.POST:
			linknet['ipv4_gw'] = request.POST['ipv4_gw']
		if 'device_a_id' in request.POST:
			linknet['device_a_id'] = int(request.POST['device_a_id'])
		if 'device_a_ip' in request.POST:
			linknet['device_a_ip'] = request.POST['device_a_ip']
		if 'device_a_port' in request.POST:
			linknet['device_a_ip'] = request.POST['device_a_port']
		if 'device_b_id' in request.POST:
			linknet['device_b_id'] = int(request.POST['device_b_id'])
		if 'device_b_ip' in request.POST:
			linknet['device_b_ip'] = request.POST['device_b_ip']
		if 'device_b_port' in request.POST:
			linknet['device_b_ip'] = request.POST['device_b_port']
		if 'vlan' in request.POST:
			linknet['vlan'] = int(request.POST['vlan'])
		if 'description' in request.POST:
			linknet['description'] = request.POST['description']
		linknet_add(linknet)
	elif 'linknet_delete' in request.POST:
		linknet_remove(request.POST.getlist('selected'))

	data['linknets'] = linknets_get()

	return render(request, 'linknets.html', context=data)
