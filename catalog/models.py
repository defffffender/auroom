# catalog/models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator


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
    """Категории ювелирных изделий"""
    name = models.CharField(max_length=100, verbose_name="Название")
    slug = models.SlugField(unique=True, verbose_name="URL")
    description = models.TextField(blank=True, verbose_name="Описание")
    image = models.ImageField(upload_to='categories/', blank=True, null=True, verbose_name="Изображение")

    class Meta:
        verbose_name = "Категория"
        verbose_name_plural = "Категории"
        ordering = ['name']

    def __str__(self):
        return self.name


class Material(models.Model):
    """Материалы (золото, серебро и т.д.)"""
    MATERIAL_TYPES = [
        ('gold', 'Золото'),
        ('silver', 'Серебро'),
        ('platinum', 'Платина'),
        ('palladium', 'Палладий'),
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


class Product(models.Model):
    """Модель ювелирного изделия"""
    factory = models.ForeignKey(Factory, on_delete=models.CASCADE, related_name='products', verbose_name="Завод")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products', verbose_name="Категория")
    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name='products', verbose_name="Материал")
    
    name = models.CharField(max_length=200, verbose_name="Название")
    article = models.CharField(max_length=50, verbose_name="Артикул", unique=True)
    description = models.TextField(verbose_name="Описание")
    
    weight = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(0.01)], 
                                 verbose_name="Вес (г)")
    size = models.CharField(max_length=50, blank=True, verbose_name="Размер")
    
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], 
                                verbose_name="Цена")
    stock_quantity = models.IntegerField(default=0, validators=[MinValueValidator(0)], 
                                        verbose_name="Количество на складе")
    
    has_stones = models.BooleanField(default=False, verbose_name="Со вставками")
    stone_description = models.TextField(blank=True, verbose_name="Описание вставок")
    
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата добавления")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    
    views_count = models.IntegerField(default=0, verbose_name="Количество просмотров")

    class Meta:
        verbose_name = "Товар"
        verbose_name_plural = "Товары"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['article']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['factory', 'is_active']),
        ]

    def __str__(self):
        return f"{self.article} - {self.name}"

    @property
    def in_stock(self):
        return self.stock_quantity > 0


class ProductImage(models.Model):
    """Изображения товаров"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images', verbose_name="Товар")
    image = models.ImageField(upload_to='products/', verbose_name="Изображение")
    is_main = models.BooleanField(default=False, verbose_name="Главное фото")
    order = models.IntegerField(default=0, verbose_name="Порядок")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата загрузки")

    class Meta:
        verbose_name = "Изображение товара"
        verbose_name_plural = "Изображения товаров"
        ordering = ['order', 'uploaded_at']

    def __str__(self):
        return f"Фото {self.product.article}"


class Favorite(models.Model):
    """Избранные товары клиентов"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites', verbose_name="Пользователь")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='favorited_by', verbose_name="Товар")
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата добавления")

    class Meta:
        verbose_name = "Избранное"
        verbose_name_plural = "Избранное"
        unique_together = ['user', 'product']
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user.username} - {self.product.name}"