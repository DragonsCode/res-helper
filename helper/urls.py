#set up django url for views
from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
]