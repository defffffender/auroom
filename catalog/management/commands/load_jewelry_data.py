# catalog/management/commands/load_jewelry_data.py
"""
Команда для загрузки базовых данных ювелирного каталога из списка заказчика
Использование: python manage.py load_jewelry_data
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from catalog.models import (
    Category, Material, Purity, MetalColor, Style, InsertType, Coating
)


def translit_slugify(text):
    """Транслитерация кириллицы в латиницу для slug"""
    # Таблица транслитерации
    translit_table = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
        'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
        'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
        'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
        'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    }

    transliterated = ''
    for char in text:
        transliterated += translit_table.get(char, char)

    return slugify(transliterated)


class Command(BaseCommand):
    help = 'Загрузка базовых категорий и характеристик для ювелирного каталога'

    def handle(self, *args, **options):
        self.stdout.write('Начинаем загрузку данных...\n')

        # 1. Категории и подкатегории
        self.load_categories()

        # 2. Материалы
        self.load_materials()

        # 3. Пробы
        self.load_purities()

        # 4. Цвета металлов
        self.load_metal_colors()

        # 5. Стили
        self.load_styles()

        # 6. Типы вставок
        self.load_insert_types()

        # 7. Покрытия
        self.load_coatings()

        self.stdout.write(self.style.SUCCESS('\n✅ Все данные успешно загружены!'))

    def load_categories(self):
        self.stdout.write('Загрузка категорий и подкатегорий...')

        categories_data = {
            'Кольца': [
                'Обручальное', 'Помолвочное (Солитер)', 'Печатка (Перстень)',
                'Кольцо-дорожка (eternity)', 'Фаланговое', 'Кольцо-сплин',
                'Кольцо-корона', 'Тройное кольцо'
            ],
            'Серьги': [
                'Пусеты (Гвоздики)', 'Длинные (Висячие)', 'Конго (Кольца)',
                'Каффы', 'Протяжки', 'Клипсы', 'Серьги-люстры', 'Серьги-шандельеры'
            ],
            'Подвески': [
                'Кулон-буква', 'Медальон (открывающийся)', 'Знаки Зодиака',
                'Камея', 'Гемма', 'Подвеска-талисман', 'Сувенирная'
            ],
            'Колье': [
                'Чокер', 'Ривьера', 'Сотуар', 'Фермуар', 'Бандо', 'Монисто'
            ],
            'Цепочки': [
                'Якорное плетение', 'Панцирное (ленточное)', 'Бисмарк (Кардинал)',
                'Нонна', 'Ромб', 'Снейк (Змейка)', 'Жгут (Веревка)',
                'Лисий хвост', 'Лав'
            ],
            'Браслеты': [
                'Жесткий (Бэнгл)', 'Цепной', 'Слайдер', 'Теннисный'
            ],
            'Броши': [
                'Брошь-булавка', 'Брошь-игла', 'Брошь-подвеска',
                'Сюжетная (в виде животных/цветов)'
            ]
        }

        for parent_name, subcategories in categories_data.items():
            parent, created = Category.objects.get_or_create(
                name=parent_name,
                defaults={
                    'slug': translit_slugify(parent_name),
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(f'  + Категория: {parent_name}')

            for subcat_name in subcategories:
                subcat, created = Category.objects.get_or_create(
                    name=subcat_name,
                    parent=parent,
                    defaults={
                        'slug': translit_slugify(subcat_name),
                        'is_active': True
                    }
                )
                if created:
                    self.stdout.write(f'    - Подкатегория: {subcat_name}')

    def load_materials(self):
        self.stdout.write('\nЗагрузка материалов...')

        materials_data = [
            ('gold', 'Золото', '585'),
            ('gold', 'Золото', '750'),
            ('gold', 'Золото', '999'),
            ('silver', 'Серебро', '925'),
            ('silver', 'Серебро', '999'),
        ]

        for material_type, name, purity in materials_data:
            obj, created = Material.objects.get_or_create(
                material_type=material_type,
                purity=purity,
                defaults={'name': f"{name} {purity}"}
            )
            if created:
                self.stdout.write(f'  + Материал: {name} {purity}')

    def load_purities(self):
        self.stdout.write('\nЗагрузка проб...')

        purities_data = [
            # Золото (метрические)
            ('gold', '999', 'metric', 'Чистое золото'),
            ('gold', '958', 'metric', ''),
            ('gold', '750', 'metric', '18 карат'),
            ('gold', '585', 'metric', '14 карат'),
            ('gold', '583', 'metric', 'Советский стандарт'),
            ('gold', '500', 'metric', ''),
            ('gold', '375', 'metric', '9 карат'),

            # Золото (каратные)
            ('gold', '24K', 'carat', 'Чистое золото'),
            ('gold', '22K', 'carat', ''),
            ('gold', '18K', 'carat', ''),
            ('gold', '14K', 'carat', ''),
            ('gold', '10K', 'carat', ''),
            ('gold', '9K', 'carat', ''),

            # Серебро (метрические)
            ('silver', '999', 'metric', 'Чистое серебро'),
            ('silver', '960', 'metric', ''),
            ('silver', '925', 'metric', 'Стерлинговое серебро'),
            ('silver', '916', 'metric', ''),
            ('silver', '875', 'metric', ''),
            ('silver', '830', 'metric', ''),
            ('silver', '800', 'metric', ''),
        ]

        for material_type, value, system, description in purities_data:
            obj, created = Purity.objects.get_or_create(
                material_type=material_type,
                value=value,
                system=system,
                defaults={'description': description}
            )
            if created:
                self.stdout.write(f'  + Проба: {obj}')

    def load_metal_colors(self):
        self.stdout.write('\nЗагрузка цветов металлов...')

        colors = [
            ('Желтое (Классическое)', 'Традиционный желтый цвет золота'),
            ('Красное (Розовое)', 'Золото с добавлением меди'),
            ('Белое', 'Золото с палладием или никелем'),
            ('Белое родированное', 'Белое золото с родиевым покрытием'),
        ]

        for name, description in colors:
            obj, created = MetalColor.objects.get_or_create(
                name=name,
                defaults={
                    'slug': translit_slugify(name),
                    'description': description
                }
            )
            if created:
                self.stdout.write(f'  + Цвет: {name}')

    def load_styles(self):
        self.stdout.write('\nЗагрузка стилей...')

        styles = [
            ('Классический', 'Традиционный, неподвластный времени дизайн'),
            ('Модерн (Ар-Нуво)', 'Плавные линии, природные мотивы'),
            ('Арт-Деко', 'Геометрические формы, роскошь 1920-х'),
            ('Винтаж / Антикварный', 'Винтажный стиль прошлых эпох'),
            ('Минимализм', 'Простота и чистота линий'),
            ('Геометрический', 'Четкие геометрические формы'),
            ('Флористический', 'Цветочные и растительные мотивы'),
            ('Анималистический', 'Изображения животных и птиц'),
            ('Этнический', 'Национальные узоры и орнаменты'),
            ('Авангард / Хай-тек', 'Современный экспериментальный дизайн'),
            ('Романтический', 'Нежные формы, сердца, символы любви'),
        ]

        for name, description in styles:
            obj, created = Style.objects.get_or_create(
                name=name,
                defaults={
                    'slug': translit_slugify(name),
                    'description': description
                }
            )
            if created:
                self.stdout.write(f'  + Стиль: {name}')

    def load_insert_types(self):
        self.stdout.write('\nЗагрузка типов вставок...')

        insert_types_data = [
            # Драгоценные камни
            ('precious', 'Алмаз (Бриллиант)'),
            ('precious', 'Рубин'),
            ('precious', 'Сапфир'),
            ('precious', 'Изумруд'),
            ('precious', 'Александрит'),

            # Полудрагоценные камни - Корунды
            ('semi_precious', 'Звездчатый сапфир'),

            # Полудрагоценные камни - Бериллы
            ('semi_precious', 'Аквамарин'),

            # Полудрагоценные камни - Кварцы
            ('semi_precious', 'Аметист'),
            ('semi_precious', 'Цитрин'),
            ('semi_precious', 'Раухтопаз'),
            ('semi_precious', 'Горный хрусталь'),
            ('semi_precious', 'Розовый кварц'),
            ('semi_precious', 'Халцедон'),
            ('semi_precious', 'Агат'),
            ('semi_precious', 'Оникс'),
            ('semi_precious', 'Яшма'),

            # Полудрагоценные камни - Гранаты
            ('semi_precious', 'Демантоид'),
            ('semi_precious', 'Альмандин'),
            ('semi_precious', 'Родолит'),
            ('semi_precious', 'Спессартин'),
            ('semi_precious', 'Гранат'),

            # Полудрагоценные камни - Прочие
            ('semi_precious', 'Топаз'),
            ('semi_precious', 'Хризолит (Перидот)'),
            ('semi_precious', 'Бирюза'),
            ('semi_precious', 'Опал (Благородный)'),
            ('semi_precious', 'Опал (Огненный)'),
            ('semi_precious', 'Турмалин'),
            ('semi_precious', 'Шпинель'),
            ('semi_precious', 'Циркон'),
            ('semi_precious', 'Хризопраз'),
            ('semi_precious', 'Лазурит'),
            ('semi_precious', 'Малахит'),
            ('semi_precious', 'Нефрит'),
            ('semi_precious', 'Жадеит'),

            # Органические материалы
            ('organic', 'Жемчуг (Речной)'),
            ('organic', 'Жемчуг (Морской)'),
            ('organic', 'Янтарь'),
            ('organic', 'Коралл'),
            ('organic', 'Перламутр'),

            # Синтетические/Неминеральные
            ('synthetic', 'Фианит (Кубический цирконий)'),
            ('synthetic', 'Муассанит'),
            ('synthetic', 'Синтетический корунд'),
            ('synthetic', 'Эмаль'),
            ('synthetic', 'Керамика'),
            ('synthetic', 'Ювелирное стекло'),
        ]

        for category, name in insert_types_data:
            # Генерируем уникальный slug
            base_slug = translit_slugify(name)
            slug = base_slug
            counter = 1

            # Проверяем, существует ли такой slug
            while InsertType.objects.filter(slug=slug).exists():
                # Если существует, проверяем название
                existing = InsertType.objects.filter(slug=slug).first()
                if existing.name == name:
                    # Это тот же камень, пропускаем
                    obj = existing
                    created = False
                    break
                else:
                    # Другой камень с таким же slug, добавляем счётчик
                    slug = f"{base_slug}-{counter}"
                    counter += 1
            else:
                # Slug уникален, создаём новую запись
                obj, created = InsertType.objects.get_or_create(
                    name=name,
                    defaults={
                        'slug': slug,
                        'category': category
                    }
                )

            if created:
                self.stdout.write(f'  + Вставка: {name}')

    def load_coatings(self):
        self.stdout.write('\nЗагрузка покрытий...')

        coatings = [
            ('Эмалирование (Горячая эмаль)', 'Цветное стеклообразное покрытие'),
            ('Эмалирование (Холодная эмаль)', 'Эпоксидная эмаль'),
            ('Галтовка', 'Механическая полировка в барабане'),
            ('Полировка', 'Зеркальная поверхность'),
            ('Матирование', 'Матовая текстура поверхности'),
            ('Пескоструй', 'Обработка песком под давлением'),
            ('Родирование', 'Покрытие родием для блеска'),
            ('Чернение', 'Оксидирование для контраста'),
        ]

        for name, description in coatings:
            obj, created = Coating.objects.get_or_create(
                name=name,
                defaults={
                    'slug': translit_slugify(name),
                    'description': description
                }
            )
            if created:
                self.stdout.write(f'  + Покрытие: {name}')
