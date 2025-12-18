from catalog.models import FavoriteList
from django.contrib.auth.models import User

print('=== Все списки избранного ===')
for fl in FavoriteList.objects.all().select_related('user'):
    print(f'ID: {fl.id}, User: {fl.user.username}, Name: {fl.name}, is_default: {fl.is_default}')
