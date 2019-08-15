from django.urls import path

from cnaas.nms import views

urlpatterns = [
    path('', views.devices, name='index'),
    path('devices/', views.devices),
    path('sync/', views.sync),
    path('jobs/', views.jobs),
    path('mgmtdomains/', views.mgmtdomains),
    path('linknets/', views.linknets),
]
