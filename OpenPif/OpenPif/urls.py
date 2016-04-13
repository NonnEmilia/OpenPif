"""OpenPif URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from . import views
from django.conf.urls import include, url
from django.contrib import admin
from django.contrib.auth.views import login, logout, password_change
from django.views.generic.base import RedirectView, TemplateView


urlpatterns = [
    url(r'^$', RedirectView.as_view(url='webpos/'),
        name='index'),  # Temporary
    url(r'^webpos/', include('OpenGenfri.urls',
        namespace='webpos')),
    url(r'^admin/', admin.site.urls),
    url(r'^login/$', login, {'template_name': 'login.html'},
        name='login'),
    url(r'^logout/$', logout, {'template_name': 'logout.html'},
        name='logout'),
    url(r'^chpwd/$', password_change, {'template_name': 'change_pass.html',
                                       'post_change_redirect': 'success/'},
        name='chpwd'),
    url(r'^check/$', views.check,
        name='check'),
    # Temporary, use a js alert or something instead
    url(r'^chpwd/success/$',
        TemplateView.as_view(template_name='success.html')),
]
