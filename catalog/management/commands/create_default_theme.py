"""
Management command для создания дефолтной темы
"""
from django.core.management.base import BaseCommand
from catalog.models import Theme


class Command(BaseCommand):
    help = 'Создает дефолтную тему AuRoom, если её нет'

    def handle(self, *args, **options):
        # Проверяем, есть ли уже дефолтная тема
        default_theme = Theme.objects.filter(is_default=True).first()

        if default_theme:
            self.stdout.write(self.style.WARNING(
                f'Дефолтная тема уже существует: {default_theme.name} (ID: {default_theme.id})'
            ))
            return

        # Создаем дефолтную тему
        theme = Theme.objects.create(
            name='AuRoom Default',
            user=None,  # Дефолтная тема не привязана к пользователю
            is_default=True,

            # Цвета Indigo (по умолчанию)
            primary_color='#6366f1',
            secondary_color='#8b5cf6',
            color_scheme='indigo',

            # Настройки
            gradient_enabled=True,
            sharp_corners=False,

            # Шрифты
            heading_font='Playfair Display',
            body_font='Inter',
            heading_font_weight='700',
            body_font_weight='400',
        )

        self.stdout.write(self.style.SUCCESS(
            f'✅ Дефолтная тема создана: {theme.name} (ID: {theme.id})'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'   Цветовая схема: {theme.color_scheme}'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'   Primary: {theme.primary_color}'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'   Шрифт заголовков: {theme.heading_font}'
        ))
