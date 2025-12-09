# catalog/management/commands/generate_test_products.py
"""
Команда для генерации большого количества тестовых товаров
Использование: python manage.py generate_test_products --count 100000
"""
import random
import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.core.files import File
from django.conf import settings
from catalog.models import (
    Product, Factory, Category, Material, Purity,
    MetalColor, Style, InsertType, Coating, ProductImage
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
        parser.add_argument(
            '--delete-old',
            action='store_true',
            help='Удалить все старые тестовые товары перед генерацией'
        )

    def handle(self, *args, **options):
        count = options['count']
        batch_size = options['batch_size']
        delete_old = options['delete_old']

        self.stdout.write(f'Начинаем генерацию {count} товаров...\n')

        # Удаляем старые товары если указан флаг
        if delete_old:
            self._delete_old_products()

        # Проверяем наличие необходимых данных
        if not self._check_required_data():
            return

        # Получаем или создаем тестовую фабрику
        factory = self._get_or_create_test_factory()

        # Проверяем наличие изображений
        images_dir = os.path.join(os.path.dirname(settings.BASE_DIR), 'images')
        image_files = self._check_images(images_dir)
        if not image_files:
            self.stdout.write(
                self.style.WARNING(
                    f'\n⚠️  Изображения не найдены в {images_dir}\n'
                    'Товары будут созданы без изображений.\n'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Найдено {len(image_files)} изображений для товаров\n'
                )
            )

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
                metal_weight = Decimal(random.uniform(1.0, 50.0)).quantize(Decimal('0.01'))
                total_weight = metal_weight + Decimal(random.uniform(0.1, 5.0)).quantize(Decimal('0.01'))

                # Размеры (от 5 до 50 мм)
                width_mm = Decimal(random.uniform(5.0, 50.0)).quantize(Decimal('0.1'))
                height_mm = Decimal(random.uniform(5.0, 50.0)).quantize(Decimal('0.1'))
                diameter_mm = Decimal(random.uniform(15.0, 22.0)).quantize(Decimal('0.1')) if random.random() > 0.5 else None

                # Количество на складе (от 0 до 100)
                stock_quantity = random.randint(0, 100)

                # Информация о вставке (50% товаров)
                has_inserts = random.random() > 0.5
                insert_description = None
                if has_inserts:
                    insert_type = random.choice(insert_types)
                    insert_count = random.randint(1, 50)
                    insert_description = f"{insert_type.name}, {insert_count} шт"

                # Клеймо и проба
                has_stamp = random.random() > 0.3
                stamp_description = f"TEST{random.randint(100, 999)}" if has_stamp else ""

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
                    metal_weight=metal_weight,
                    total_weight=total_weight,
                    width_mm=width_mm,
                    height_mm=height_mm,
                    diameter_mm=diameter_mm,
                    has_inserts=has_inserts,
                    insert_description=insert_description or "",
                    has_stamp=has_stamp,
                    stamp_description=stamp_description,
                    stock_quantity=stock_quantity,
                    is_active=True
                )
                products_batch.append(product)

            # Сохраняем батч
            with transaction.atomic():
                created_products = Product.objects.bulk_create(products_batch, ignore_conflicts=True)

            # Добавляем изображения к созданным товарам
            if image_files:
                self._add_images_to_products(created_products, image_files, batch_num)

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

    def _delete_old_products(self):
        """Удаляет все старые тестовые товары"""
        factory = Factory.objects.filter(name='Test Factory').first()
        if factory:
            old_count = Product.objects.filter(factory=factory).count()
            if old_count > 0:
                self.stdout.write(f'\nУдаление {old_count} старых тестовых товаров...')
                Product.objects.filter(factory=factory).delete()
                self.stdout.write(self.style.SUCCESS(f'✅ Удалено {old_count} товаров\n'))
        else:
            self.stdout.write('Старые товары не найдены\n')

    def _check_images(self, images_dir):
        """Проверяет наличие изображений и возвращает список файлов"""
        if not os.path.exists(images_dir):
            return []

        # Ищем изображения 1.png - 12.png
        image_files = []
        for i in range(1, 13):
            image_path = os.path.join(images_dir, f'{i}.png')
            if os.path.exists(image_path):
                image_files.append(image_path)

        return image_files

    def _add_images_to_products(self, products, image_files, batch_num):
        """Добавляет изображения к товарам циклично"""
        product_images = []
        num_images = len(image_files)

        for idx, product in enumerate(products):
            # Выбираем изображение циклично (0-11)
            image_index = (batch_num + idx) % num_images
            image_path = image_files[image_index]

            # Открываем файл и создаем ProductImage
            try:
                with open(image_path, 'rb') as f:
                    file_content = f.read()
                    # Создаем временный файл в памяти
                    from django.core.files.base import ContentFile
                    image_file = ContentFile(file_content, name=os.path.basename(image_path))

                    product_image = ProductImage(
                        product=product,
                        image=image_file,
                        order=0
                    )
                    product_images.append(product_image)
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(
                        f'\n⚠️  Ошибка при добавлении изображения {image_path}: {e}\n'
                    )
                )

        # Сохраняем изображения батчем
        if product_images:
            ProductImage.objects.bulk_create(product_images, ignore_conflicts=True)
