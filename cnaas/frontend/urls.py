from django.urls import path

from cnaas.frontend import views

urlpatterns = [
    path('', views.index, name='index'),
    path('devices/', views.devices),
    path('sync/', views.sync),
]
