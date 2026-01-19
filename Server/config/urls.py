"""
URL configuration for dggcrm project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = []

# TODO: only add these paths in local dev (NEVER PRODUCTION)
urlpatterns += [
    path("accounts/", include("dggcrm.authmock.urls")),
]

urlpatterns = [
    # allauth (browser OAuth)
    path("accounts/", include("allauth.urls")),

    path("admin/", admin.site.urls),
    # path('', include('dggcrm.api.urls')),
    path('api/', include('dggcrm.contacts.urls')),
    path('api/', include('dggcrm.events.urls')),
    path('api/', include('dggcrm.tickets.urls')),
    path('api/', include('dggcrm.accounts.urls')),

    # API auth
    # path("api/auth/", include("dj_rest_auth.urls")),
    # path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
]
