from django.http import HttpResponse
from OpenGenfri.models import Category

def status(request):
    try:
        qs = Category.objects.all()
        list(qs)
        return HttpResponse(status=204)
    except Exception:
        return HttpResponse(status=500)
