# catalog/models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
import json


class Factory(models.Model):
    """Модель ювелирного завода"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name="Пользователь")
    name = models.CharField(max_length=200, verbose_name="Название завода")
    description = models.TextField(blank=True, verbose_name="Описание")
    address = models.CharField(max_length=300, verbose_name="Адрес")
    phone = models.CharField(max_length=20, verbose_name="Телефон")
    email = models.EmailField(verbose_name="Email")
    logo = models.ImageField(upload_to='factory_logos/', blank=True, null=True, verbose_name="Логотип")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата регистрации")
    is_verified = models.BooleanField(default=False, verbose_name="Верифицирован")

    class Meta:
        verbose_name = "Завод"
        verbose_name_plural = "Заводы"
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Category(models.Model):
    """Категории ювелирных изделий с иерархией"""
    name = models.CharField(max_length=100, verbose_name="Название")
    slug = models.SlugField(unique=True, verbose_name="URL")
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subcategories',
        verbose_name="Родительская категория"
    )
    description = models.TextField(blank=True, verbose_name="Описание")
    image = models.ImageField(upload_to='categories/', blank=True, null=True, verbose_name="Изображение")
    created_by = models.ForeignKey(
        'Factory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_categories',
        verbose_name="Создана заводом"
    )
    is_active = models.BooleanField(default=True, verbose_name="Активна")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")

    class Meta:
        verbose_name = "Категория"
        verbose_name_plural = "Категории"
        ordering = ['name']

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} → {self.name}"
        return self.name

    def is_subcategory(self):
        return self.parent is not None

    def get_full_path(self):
        """Возвращает полный путь категории"""
        if self.parent:
            return f"{self.parent.name} / {self.name}"
        return self.name


class Material(models.Model):
    """
    Материалы (золото, серебро и т.д.)

    ПРИМЕЧАНИЕ: Эта модель частично дублирует функциональность Purity.
    TODO: Рассмотреть возможность объединения с моделью Purity в будущих версиях.
    Для этого потребуется data migration для переноса данных.
    """
    MATERIAL_TYPES = [
        ('gold', 'Золото'),
        ('silver', 'Серебро'),
    ]

    name = models.CharField(max_length=100, verbose_name="Название")
    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPES, verbose_name="Тип материала")
    purity = models.CharField(max_length=20, verbose_name="Проба", help_text="Например: 585, 750, 925")

    class Meta:
        verbose_name = "Материал"
        verbose_name_plural = "Материалы"
        unique_together = ['material_type', 'purity']

    def __str__(self):
        return f"{self.get_material_type_display()} {self.purity}"


class Purity(models.Model):
    """Пробы для металлов"""
    PURITY_SYSTEMS = [
        ('metric', 'Метрическая'),
        ('carat', 'Каратная'),
    ]

    material_type = models.CharField(
        max_length=20,
        choices=Material.MATERIAL_TYPES,
        verbose_name="Тип металла"
    )
    value = models.CharField(max_length=20, verbose_name="Значение пробы")
    system = models.CharField(
        max_length=20,
        choices=PURITY_SYSTEMS,
        default='metric',
        verbose_name="Система проб"
    )
    description = models.CharField(max_length=200, blank=True, verbose_name="Описание")

    class Meta:
        verbose_name = "Проба"
        verbose_name_plural = "Пробы"
        unique_together = ['material_type', 'value', 'system']
        ordering = ['material_type', '-value']

    def __str__(self):
        return f"{self.get_material_type_display()} - {self.value} ({self.get_system_display()})"


class MetalColor(models.Model):
    """Цвета металлов"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Название")
    slug = models.SlugField(unique=True, verbose_name="URL")
    description = models.CharField(max_length=200, blank=True, verbose_name="Описание")

    class Meta:
        verbose_name = "Цвет металла"
        verbose_name_plural = "Цвета металлов"
        ordering = ['name']

    def __str__(self):
        return self.name


class Style(models.Model):
    """Стили ювелирных изделий"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Название")
    slug = models.SlugField(unique=True, verbose_name="URL")
    description = models.TextField(blank=True, verbose_name="Описание")

    class Meta:
        verbose_name = "Стиль"
        verbose_name_plural = "Стили"
        ordering = ['name']

    def __str__(self):
        return self.name


class InsertType(models.Model):
    """Типы вставок (камни, органика, синтетика)"""
    INSERT_CATEGORIES = [
        ('precious', 'Драгоценные камни'),
        ('semi_precious', 'Полудрагоценные камни'),
        ('organic', 'Органические материалы'),
        ('synthetic', 'Синтетические/Неминеральные'),
    ]

    name = models.CharField(max_length=100, verbose_name="Название")
    slug = models.SlugField(unique=True, verbose_name="URL")
    category = models.CharField(
        max_length=20,
        choices=INSERT_CATEGORIES,
        verbose_name="Категория вставки"
    )
    description = models.TextField(blank=True, verbose_name="Описание")

    class Meta:
        verbose_name = "Тип вставки"
        verbose_name_plural = "Типы вставок"
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class Coating(models.Model):
    """Покрытия и обработка поверхности"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Название")
    slug = models.SlugField(unique=True, verbose_name="URL")
    description = models.TextField(blank=True, verbose_name="Описание")

    class Meta:
        verbose_name = "Покрытие"
        verbose_name_plural = "Покрытия"
        ordering = ['name']

    def __str__(self):
        return self.name


# Константы для типов эталонных изображений (используется в ReferenceImage и Product)
REFERENCE_TYPES = [
    ('ear', '👂 Ухо/Серьги'),
    ('finger', '💍 Палец/Кольцо'),
    ('wrist', '⌚ Запястье/Браслет'),
    ('neck', '📿 Шея/Колье'),
]

# Для Product добавляем опцию "Без эталона"
PRODUCT_REFERENCE_TYPES = REFERENCE_TYPES + [('none', 'Без эталона')]


class ReferenceImage(models.Model):
    """Эталонные изображения для подгонки товаров"""

    reference_type = models.CharField(
        max_length=20,
        choices=REFERENCE_TYPES,
        unique=True,
        verbose_name="Тип эталона"
    )
    image = models.ImageField(
        upload_to='reference_images/',
        verbose_name="Эталонное изображение"
    )
    width_mm = models.DecimalField(
        max_digits=6,
        decimal_places=1,
        verbose_name="Ширина эталона (мм)",
        help_text="Реальная ширина эталонного изображения"
    )
    height_mm = models.DecimalField(
        max_digits=6,
        decimal_places=1,
        verbose_name="Высота эталона (мм)",
        help_text="Реальная высота эталонного изображения"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Описание",
        help_text="Описание эталона для производителей"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активен"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Эталонное изображение"
        verbose_name_plural = "Эталонные изображения"
        ordering = ['reference_type']
    
    def __str__(self):
        return f"{self.get_reference_type_display()} ({self.width_mm}×{self.height_mm} мм)"


class Product(models.Model):
    """Модель ювелирного изделия"""

    # Основные связи
    factory = models.ForeignKey(Factory, on_delete=models.CASCADE, related_name='products', verbose_name="Завод")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products', verbose_name="Категория")
    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name='products', verbose_name="Материал")

    # Основная информация
    name = models.CharField(max_length=200, verbose_name="Название")
    article = models.CharField(max_length=50, verbose_name="Артикул", unique=True, blank=True)
    description = models.TextField(verbose_name="Описание")
    manufacturer_brand = models.CharField(max_length=200, blank=True, verbose_name="Производитель/Бренд")

    # Новые характеристики из списка заказчика
    purity = models.ForeignKey(
        Purity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name="Проба"
    )
    metal_color = models.ForeignKey(
        MetalColor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name="Цвет металла"
    )
    style = models.ForeignKey(
        Style,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name="Стиль"
    )

    # Вес и размеры
    metal_weight = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0.01)],
        verbose_name="Масса металла (г)",
        help_text="Масса чистого металла без вставок"
    )
    total_weight = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0.01)],
        verbose_name="Общая масса изделия (г)",
        help_text="Масса всего изделия со всеми вставками"
    )
    size = models.CharField(max_length=50, blank=True, verbose_name="Размер")

    # Цена и остатки
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)],
                                verbose_name="Цена")
    stock_quantity = models.IntegerField(default=0, validators=[MinValueValidator(0)],
                                        verbose_name="Количество на складе")

    # Вставки (камни)
    has_inserts = models.BooleanField(default=False, verbose_name="Наличие вставок")
    insert_types = models.ManyToManyField(
        InsertType,
        blank=True,
        related_name='products',
        verbose_name="Типы вставок"
    )
    insert_description = models.TextField(blank=True, verbose_name="Описание вставок")

    # Покрытие
    coatings = models.ManyToManyField(
        Coating,
        blank=True,
        related_name='products',
        verbose_name="Покрытия"
    )

    # Клеймо
    has_stamp = models.BooleanField(default=False, verbose_name="Наличие клейма")
    stamp_description = models.CharField(max_length=200, blank=True, verbose_name="Описание клейма")

    # Статус и даты
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата добавления")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")

    views_count = models.IntegerField(default=0, verbose_name="Количество просмотров")

    # Эталонные фото и редактор
    reference_photo_type = models.CharField(
        max_length=20,
        choices=PRODUCT_REFERENCE_TYPES,
        default='none',
        verbose_name="Тип изделия",
        help_text="Выберите тип для подгонки под эталон"
    )

    width_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="Ширина (мм)",
        help_text="Рассчитывается автоматически при подгонке"
    )

    height_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="Высота (мм)",
        help_text="Рассчитывается автоматически при подгонке"
    )

    diameter_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="Диаметр (мм)",
        help_text="Для колец - рассчитывается автоматически"
    )

    editor_data = models.TextField(
        blank=True,
        verbose_name="Данные редактора",
        help_text="JSON с координатами и масштабом"
    )

    show_ruler = models.BooleanField(
        default=True,
        verbose_name="Показывать линейку",
        help_text="Отображать интерактивную линейку на странице товара"
    )

    class Meta:
        verbose_name = "Товар"
        verbose_name_plural = "Товары"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['article']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['factory', 'is_active']),
        ]

    def save(self, *args, **kwargs):
        """Автоматическая генерация артикула"""
        if not self.article:
            last_product = Product.objects.filter(
                factory=self.factory
            ).order_by('-id').first()
            
            if last_product and '-' in last_product.article:
                try:
                    last_number = int(last_product.article.split('-')[1])
                    next_number = last_number + 1
                except (ValueError, IndexError):
                    next_number = 1
            else:
                next_number = 1
            
            self.article = f"{self.factory.id}-{next_number:06d}"
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.article} - {self.name}"

    @property
    def in_stock(self):
        return self.stock_quantity > 0
    
    @property
    def has_dimensions(self):
        return any([self.width_mm, self.height_mm, self.diameter_mm])
    
    @property
    def dimensions_text(self):
        dims = []
        if self.width_mm:
            dims.append(f"Ш: {self.width_mm} мм")
        if self.height_mm:
            dims.append(f"В: {self.height_mm} мм")
        if self.diameter_mm:
            dims.append(f"Ø: {self.diameter_mm} мм")
        return " × ".join(dims) if dims else "Размеры не указаны"
    
    def get_editor_data(self):
        if self.editor_data:
            try:
                return json.loads(self.editor_data)
            except:
                return {}
        return {}
    
    def set_editor_data(self, data):
        self.editor_data = json.dumps(data)


class ProductImage(models.Model):
    """Изображения товаров"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images', verbose_name="Товар")
    image = models.ImageField(upload_to='products/', verbose_name="Изображение")
    is_main = models.BooleanField(default=False, verbose_name="Главное фото")
    # ДОБАВИЛИ ЭТО ПОЛЕ:
    is_reference = models.BooleanField(
        default=False, 
        verbose_name="Эталонное фото",
        help_text="Фото с подогнанным изделием (используется редактором)"
    )
    order = models.IntegerField(default=0, verbose_name="Порядок")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата загрузки")

    class Meta:
        verbose_name = "Изображение товара"
        verbose_name_plural = "Изображения товаров"
        ordering = ['order', 'uploaded_at']

    def __str__(self):
        return f"Фото {self.product.article}"


class FavoriteList(models.Model):
    """Списки избранного (как плейлисты)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorite_lists', verbose_name="Пользователь")
    name = models.CharField(max_length=100, verbose_name="Название списка")
    description = models.TextField(blank=True, verbose_name="Описание")
    is_default = models.BooleanField(default=False, verbose_name="Список по умолчанию")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")

    class Meta:
        verbose_name = "Список избранного"
        verbose_name_plural = "Списки избранного"
        ordering = ['-is_default', '-updated_at']
        unique_together = ['user', 'name']

    def __str__(self):
        return f"{self.user.username} - {self.name}"

    def save(self, *args, **kwargs):
        # Если это список по умолчанию, убираем флаг у других списков пользователя
        if self.is_default:
            FavoriteList.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    @property
    def items_count(self):
        """Количество товаров в списке"""
        return self.favorites.count()


class Favorite(models.Model):
    """Избранные товары клиентов"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites', verbose_name="Пользователь")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='favorited_by', verbose_name="Товар")
    favorite_list = models.ForeignKey(
        FavoriteList,
        on_delete=models.CASCADE,
        related_name='favorites',
        verbose_name="Список избранного",
        null=True,  # Временно null для миграции
        blank=True
    )
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата добавления")

    class Meta:
        verbose_name = "Избранное"
        verbose_name_plural = "Избранное"
        unique_together = ['user', 'product', 'favorite_list']
        ordering = ['-added_at']

    def __str__(self):
        list_name = self.favorite_list.name if self.favorite_list else 'Без списка'
        return f"{self.user.username} - {self.product.name} ({list_name})"


class Theme(models.Model):
    """Пользовательские темы оформления"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='themes', verbose_name="Пользователь", null=True, blank=True)
    name = models.CharField(max_length=100, verbose_name="Название темы", unique=True)

    # Единый primary и secondary для обоих режимов
    primary_color = models.CharField(max_length=7, default='#6366f1', verbose_name="Primary Color")
    secondary_color = models.CharField(max_length=7, default='#8b5cf6', verbose_name="Secondary Color")

    # Флаг для темы по умолчанию (auroom)
    is_default = models.BooleanField(default=False, verbose_name="Тема по умолчанию")

    # Цветовая схема только для default темы (indigo, blue, purple, pink, green, red)
    color_scheme = models.CharField(max_length=20, default='indigo', blank=True, verbose_name="Цветовая схема")

    # Градиент
    gradient_enabled = models.BooleanField(default=True, verbose_name="Градиент включен")

    # Острые углы (отключение всех border-radius)
    sharp_corners = models.BooleanField(default=False, verbose_name="Острые углы")

    # Шрифты
    heading_font = models.CharField(
        max_length=50,
        default='Playfair Display',
        verbose_name="Шрифт заголовков",
        help_text="Шрифт для h1, h2, h3, h4, h5, h6"
    )
    heading_font_weight = models.CharField(
        max_length=4,
        default='700',
        verbose_name="Толщина шрифта заголовков",
        help_text="Например: 400, 700, 900"
    )
    body_font = models.CharField(
        max_length=50,
        default='Inter',
        verbose_name="Шрифт основного текста",
        help_text="Шрифт для обычного текста"
    )
    body_font_weight = models.CharField(
        max_length=4,
        default='400',
        verbose_name="Толщина шрифта текста",
        help_text="Например: 400, 500, 600"
    )

    # Статус активации
    is_active = models.BooleanField(default=False, verbose_name="Активная тема")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")

    class Meta:
        verbose_name = "Тема"
        verbose_name_plural = "Темы"
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        if self.is_default:
            return f"{self.name} (По умолчанию)"
        return f"{self.name}" if not self.user else f"{self.user.username} - {self.name}"

    def save(self, *args, **kwargs):
        # Если это тема по умолчанию, убедимся что она одна
        if self.is_default:
            Theme.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
            self.user = None  # Default тема не привязана к пользователю

        # Деактивировать другие темы при активации
        if self.is_active:
            if self.user:
                # Для пользовательских тем деактивируем все темы (включая default)
                Theme.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
            else:
                # Для default темы деактивируем все темы всех пользователей
                Theme.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Запретить удаление темы по умолчанию
        if self.is_default:
            raise ValueError("Нельзя удалить тему по умолчанию")
        super().delete(*args, **kwargs)