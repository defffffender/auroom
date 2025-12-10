"""
Context processors для каталога
"""
from .models import Theme


def default_theme(request):
    """
    Добавляет дефолтную тему в контекст всех шаблонов
    """
    theme = Theme.objects.filter(is_default=True).first()
    return {
        'default_theme_data': theme
    }
