from django.urls import path

from cnaas.nac import views

urlpatterns = [
    path('', views.nac, name='index'),
    path('nac/', views.nac),
]
