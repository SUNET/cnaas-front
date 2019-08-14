from django.shortcuts import render
from cnaas import settings


def nac(request):
    data = {}
    return render(request, 'nac.html', context=data)
