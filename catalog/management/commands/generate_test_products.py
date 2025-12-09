# catalog/management/commands/generate_test_products.py
"""
Команда для генерации большого количества тестовых товаров
Использование: python manage.py generate_test_products --count 100000
"""
import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from catalog.models import (
    Product, Factory, Category, Material, Purity,
    MetalColor, Style, InsertType, Coating
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Генерация тестовых товаров для нагрузочного тестирования'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=100000,
            help='Количество товаров для генерации (по умолчанию: 100000)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Размер батча для bulk_create (по умолчанию: 1000)'
        )

    def handle(self, *args, **options):
        count = options['count']
        batch_size = options['batch_size']

        self.stdout.write(f'Начинаем генерацию {count} товаров...\n')

        # Проверяем наличие необходимых данных
        if not self._check_required_data():
            return

        # Получаем или создаем тестовую фабрику
        factory = self._get_or_create_test_factory()

        # Загружаем справочники в память
        categories = list(Category.objects.filter(parent__isnull=False))  # Только подкатегории
        materials = list(Material.objects.all())
        purities = list(Purity.objects.all())
        metal_colors = list(MetalColor.objects.all())
        styles = list(Style.objects.all())
        insert_types = list(InsertType.objects.all())
        coatings = list(Coating.objects.all())

        self.stdout.write(f'Загружено справочников:')
        self.stdout.write(f'  - Категорий: {len(categories)}')
        self.stdout.write(f'  - Материалов: {len(materials)}')
        self.stdout.write(f'  - Проб: {len(purities)}')
        self.stdout.write(f'  - Цветов металла: {len(metal_colors)}')
        self.stdout.write(f'  - Стилей: {len(styles)}')
        self.stdout.write(f'  - Вставок: {len(insert_types)}')
        self.stdout.write(f'  - Покрытий: {len(coatings)}')

        # Шаблоны названий для разных категорий
        name_templates = {
            'default': [
                'Кольцо', 'Серьги', 'Подвеска', 'Цепочка', 'Браслет',
                'Колье', 'Брошь', 'Комплект'
            ],
            'adjectives': [
                'Элегантное', 'Роскошное', 'Изысканное', 'Классическое',
                'Современное', 'Винтажное', 'Уникальное', 'Эксклюзивное',
                'Утонченное', 'Праздничное', 'Повседневное', 'Вечернее'
            ],
            'themes': [
                'с бриллиантами', 'с камнями', 'с гравировкой',
                'ручной работы', 'дизайнерское', 'коллекционное',
                'с эмалью', 'с жемчугом', 'кованое', 'литое'
            ]
        }

        # Генерируем товары батчами
        total_created = 0

        for batch_num in range(0, count, batch_size):
            products_batch = []
            current_batch_size = min(batch_size, count - batch_num)

            for i in range(current_batch_size):
                product_num = batch_num + i + 1

                # Генерируем название
                category = random.choice(categories)
                adjective = random.choice(name_templates['adjectives'])
                theme = random.choice(name_templates['themes']) if random.random() > 0.5 else ''
                name = f"{adjective} {category.name} {theme}".strip()

                # Генерируем артикул
                article = f"TEST-{product_num:06d}"

                # Случайные характеристики
                material = random.choice(materials) if materials else None
                purity = random.choice(purities) if purities else None
                metal_color = random.choice(metal_colors) if metal_colors else None
                style = random.choice(styles) if styles else None

                # Цена (от 5,000 до 500,000)
                price = Decimal(random.randint(5000, 500000))

                # Вес (от 1 до 50 грамм)
                weight = Decimal(random.uniform(1.0, 50.0)).quantize(Decimal('0.01'))

                # Размеры (от 5 до 50 мм)
                width = Decimal(random.uniform(5.0, 50.0)).quantize(Decimal('0.1'))
                height = Decimal(random.uniform(5.0, 50.0)).quantize(Decimal('0.1'))
                diameter = Decimal(random.uniform(5.0, 30.0)).quantize(Decimal('0.1')) if random.random() > 0.5 else None

                # Количество на складе (от 0 до 100)
                stock = random.randint(0, 100)

                # Информация о вставке (50% товаров)
                insert_info = None
                insert_count = None
                insert_weight = None
                if random.random() > 0.5:
                    insert_type = random.choice(insert_types)
                    insert_info = insert_type.name
                    insert_count = random.randint(1, 50)
                    insert_weight = Decimal(random.uniform(0.1, 5.0)).quantize(Decimal('0.01'))

                # Клеймо и проба
                stamp = f"TEST{random.randint(100, 999)}"

                # Описание
                descriptions = [
                    f"Эксклюзивное {category.name.lower()} из коллекции Test Collection.",
                    f"Изысканное {category.name.lower()} ручной работы с уникальным дизайном.",
                    f"Роскошное {category.name.lower()} для особых случаев.",
                    f"Классическое {category.name.lower()} на каждый день.",
                    f"Современное {category.name.lower()} от мастеров AuRoom."
                ]
                description = random.choice(descriptions)

                product = Product(
                    factory=factory,
                    category=category,
                    name=name,
                    article=article,
                    description=description,
                    price=price,
                    material=material,
                    purity=purity,
                    metal_color=metal_color,
                    style=style,
                    weight=weight,
                    width=width,
                    height=height,
                    diameter=diameter,
                    insert_info=insert_info,
                    insert_count=insert_count,
                    insert_weight=insert_weight,
                    stamp=stamp,
                    stock=stock,
                    is_active=True
                )
                products_batch.append(product)

            # Сохраняем батч
            with transaction.atomic():
                Product.objects.bulk_create(products_batch, ignore_conflicts=True)

            total_created += len(products_batch)

            # Показываем прогресс
            progress = (total_created / count) * 100
            self.stdout.write(
                f'Создано: {total_created}/{count} ({progress:.1f}%)',
                ending='\r'
            )

        self.stdout.write('\n')

        # После создания товаров, добавляем связи many-to-many
        self.stdout.write('\nДобавление связей many-to-many...')
        self._add_many_to_many_relations(factory, insert_types, coatings)

        self.stdout.write(self.style.SUCCESS(f'\n✅ Успешно создано {total_created} товаров!'))
        self.stdout.write(f'Фабрика: {factory.company_name} (ID: {factory.id})')

    def _check_required_data(self):
        """Проверяет наличие необходимых данных в БД"""
        if Category.objects.filter(parent__isnull=False).count() == 0:
            self.stdout.write(
                self.style.ERROR(
                    'Ошибка: В базе нет категорий. '
                    'Запустите: python manage.py load_jewelry_data'
                )
            )
            return False
        return True

    def _get_or_create_test_factory(self):
        """Получает или создает тестовую фабрику"""
        # Ищем существующую тестовую фабрику
        try:
            factory = Factory.objects.get(name='Test Factory')
            self.stdout.write(f'Используется существующая фабрика: {factory.name}')
            return factory
        except Factory.DoesNotExist:
            pass

        # Создаем нового пользователя для фабрики
        username = 'testfactory'
        email = 'test@factory.local'

        # Удаляем старого пользователя если есть
        User.objects.filter(username=username).delete()

        user = User.objects.create_user(
            username=username,
            email=email,
            password='testpassword123'
        )

        # Создаем фабрику
        factory = Factory.objects.create(
            user=user,
            name='Test Factory',
            address='Test Address, Test City',
            phone='+998901234567',
            email=email,
            description='Тестовая фабрика для нагрузочного тестирования',
            is_verified=True
        )

        self.stdout.write(self.style.SUCCESS(f'Создана новая фабрика: {factory.name}'))
        return factory

    def _add_many_to_many_relations(self, factory, insert_types, coatings):
        """Добавляет связи many-to-many для товаров"""
        products = Product.objects.filter(factory=factory)
        total = products.count()
        processed = 0

        # Обрабатываем товары батчами для добавления M2M связей
        batch_size = 1000
        for i in range(0, total, batch_size):
            batch = products[i:i + batch_size]

            for product in batch:
                # Добавляем 1-3 типа вставок (30% товаров)
                if random.random() > 0.7 and insert_types:
                    selected_inserts = random.sample(
                        insert_types,
                        min(random.randint(1, 3), len(insert_types))
                    )
                    product.insert_types.set(selected_inserts)

                # Добавляем 1-2 покрытия (40% товаров)
                if random.random() > 0.6 and coatings:
                    selected_coatings = random.sample(
                        coatings,
                        min(random.randint(1, 2), len(coatings))
                    )
                    product.coatings.set(selected_coatings)

                processed += 1

            # Показываем прогресс
            progress = (processed / total) * 100
            self.stdout.write(
                f'Обработано: {processed}/{total} ({progress:.1f}%)',
                ending='\r'
            )

        self.stdout.write('\n')
