# -*- coding: utf-8 -*-
"""
Скрипт для создания базовых данных
"""
import os
import sys
import django

# Установка кодировки для Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auroom.settings')
django.setup()

from catalog.models import Category, Material, Purity, MetalColor, Style, Factory

def create_base_data():
    print("Создание базовых данных...")

    # Пробы
    purities_data = [
        ('gold', '375', 'metric'),
        ('gold', '500', 'metric'),
        ('gold', '585', 'metric'),
        ('gold', '750', 'metric'),
        ('silver', '900', 'metric'),
        ('silver', '925', 'metric'),
        ('silver', '950', 'metric'),
        ('gold', '999', 'metric'),
    ]
    for material_type, value, system in purities_data:
        Purity.objects.get_or_create(
            material_type=material_type,
            value=value,
            defaults={'system': system}
        )
    print(f"✅ Создано {len(purities_data)} проб")

    # Цвета металлов
    metal_colors_data = [
        ('yellow-gold', 'Желтое золото'),
        ('white-gold', 'Белое золото'),
        ('red-gold', 'Красное золото'),
        ('rose-gold', 'Розовое золото'),
        ('silver', 'Серебро'),
        ('platinum', 'Платина'),
    ]
    for slug, name in metal_colors_data:
        MetalColor.objects.get_or_create(slug=slug, defaults={'name': name})
    print(f"✅ Создано {len(metal_colors_data)} цветов металла")

    # Стили
    styles_data = [
        ('classic', 'Классический'),
        ('modern', 'Современный'),
        ('vintage', 'Винтажный'),
        ('minimalist', 'Минималистичный'),
        ('luxury', 'Роскошный'),
        ('ethnic', 'Этнический'),
        ('romantic', 'Романтический'),
    ]
    for slug, name in styles_data:
        Style.objects.get_or_create(slug=slug, defaults={'name': name})
    print(f"✅ Создано {len(styles_data)} стилей")

    # Дополнительные категории
    categories_data = [
        ('kolca', 'Кольца'),
        ('sergi', 'Серьги'),
        ('bracelets', 'Браслеты'),
        ('necklaces', 'Колье и ожерелья'),
        ('pendants', 'Кулоны и подвески'),
        ('chains', 'Цепи'),
    ]
    for slug, name in categories_data:
        Category.objects.get_or_create(slug=slug, defaults={'name': name})
    print(f"✅ Создано категорий: {Category.objects.count()}")

    # Материалы - просто показываем количество существующих
    print(f"✅ Материалов в системе: {Material.objects.count()}")

    print("\n🎉 Базовые данные успешно созданы!")

if __name__ == '__main__':
    create_base_data()
