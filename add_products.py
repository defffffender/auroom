# -*- coding: utf-8 -*-
"""
Скрипт для добавления 300 тестовых товаров в каталог
"""
import os
import sys
import django
import random
from decimal import Decimal

# Установка кодировки для Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auroom.settings')
django.setup()

from catalog.models import (
    Product, Category, Material, Purity, MetalColor,
    Style, Factory, ProductImage
)

def create_products():
    # Получаем все необходимые объекты
    categories = list(Category.objects.all())
    materials = list(Material.objects.all())
    purities = list(Purity.objects.all())
    metal_colors = list(MetalColor.objects.all())
    styles = list(Style.objects.all())
    factories = list(Factory.objects.all())

    if not all([categories, materials, purities, metal_colors, styles, factories]):
        print("⚠️  Необходимо сначала создать категории, материалы, пробы, цвета, стили и фабрики!")
        return

    # Названия для разных типов изделий
    product_names = {
        'ring': ['Кольцо', 'Перстень', 'Обручальное кольцо', 'Печатка'],
        'earring': ['Серьги', 'Пусеты', 'Серьги-гвоздики', 'Висячие серьги'],
        'necklace': ['Колье', 'Ожерелье', 'Цепь', 'Подвеска'],
        'bracelet': ['Браслет', 'Жесткий браслет', 'Цепной браслет'],
        'pendant': ['Кулон', 'Подвеска', 'Крестик', 'Иконка']
    }

    adjectives = [
        'Элегантное', 'Изысканное', 'Роскошное', 'Классическое', 'Современное',
        'Винтажное', 'Утонченное', 'Стильное', 'Нежное', 'Эксклюзивное',
        'Драгоценное', 'Уникальное', 'Праздничное', 'Повседневное', 'Вечернее'
    ]

    print("🚀 Начинаем создание 300 товаров...")

    created_count = 0

    for i in range(1, 301):
        try:
            # Выбираем случайные атрибуты
            category = random.choice(categories)
            material = random.choice(materials)
            purity = random.choice(purities)
            metal_color = random.choice(metal_colors)
            style = random.choice(styles)
            factory = random.choice(factories)

            # Генерируем название
            category_type = category.slug.split('-')[0] if '-' in category.slug else 'ring'
            base_names = product_names.get(category_type, product_names['ring'])
            adjective = random.choice(adjectives)
            base_name = random.choice(base_names)
            name = f"{adjective} {base_name.lower()}"

            # Генерируем артикул
            article = f"{random.randint(1, 9)}-{str(i).zfill(6)}"

            # Проверяем, не существует ли такой артикул
            if Product.objects.filter(article=article).exists():
                article = f"{random.randint(1, 9)}-{str(i + 10000).zfill(6)}"

            # Генерируем случайные параметры
            metal_weight = round(random.uniform(1.5, 15.0), 2)
            total_weight = round(metal_weight + random.uniform(0.1, 2.0), 2)  # Общий вес немного больше
            price = Decimal(str(round(random.uniform(5000, 150000), 2)))

            # Размеры
            width_mm = round(random.uniform(5, 30), 1) if random.random() > 0.3 else None
            height_mm = round(random.uniform(5, 40), 1) if random.random() > 0.3 else None
            diameter_mm = round(random.uniform(15, 22), 1) if random.random() > 0.5 else None

            # Типы эталонных фото (из PRODUCT_REFERENCE_TYPES)
            reference_types = ['none', 'ear', 'finger', 'wrist', 'neck']
            reference_type = random.choice(reference_types)

            # Создаем товар
            product = Product.objects.create(
                article=article,
                name=name,
                category=category,
                material=material,
                purity=purity,
                metal_color=metal_color,
                style=style,
                factory=factory,
                metal_weight=metal_weight,
                total_weight=total_weight,
                price=price,
                width_mm=width_mm,
                height_mm=height_mm,
                diameter_mm=diameter_mm,
                reference_photo_type=reference_type,
                is_active=True,
                description=f"Прекрасное изделие из {material.name} {purity.value} пробы. "
                           f"Вес металла: {metal_weight}г, общий вес: {total_weight}г. "
                           f"Идеально подходит для повседневной носки и особых случаев."
            )

            created_count += 1

            if created_count % 50 == 0:
                print(f"✅ Создано {created_count} товаров...")

        except Exception as e:
            print(f"❌ Ошибка при создании товара {i}: {e}")
            continue

    print(f"\n🎉 Успешно создано {created_count} товаров из 300!")
    print(f"📊 Товары распределены по категориям, материалам и стилям")

if __name__ == '__main__':
    create_products()
