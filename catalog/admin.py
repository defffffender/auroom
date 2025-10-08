from django.contrib import admin
from .models import Factory, Category, Material, Product, ProductImage, Favorite


class ProductImageInline(admin.TabularInline):
    """Позволяет добавлять фото товара прямо на странице товара"""
    model = ProductImage
    extra = 3  # Показывать 3 пустых поля для загрузки фото


@admin.register(Factory)
class FactoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'is_verified', 'created_at']
    list_filter = ['is_verified', 'created_at']
    search_fields = ['name', 'phone', 'email']
    list_editable = ['is_verified']  # Можно менять прямо в списке


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}  # Автозаполнение slug из названия


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ['name', 'material_type', 'purity']
    list_filter = ['material_type']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['article', 'name', 'factory', 'category', 'price', 'stock_quantity', 'is_active']
    list_filter = ['category', 'material', 'is_active', 'has_stones', 'created_at']
    search_fields = ['article', 'name', 'description']
    list_editable = ['is_active', 'price']  # Можно менять прямо в списке
    readonly_fields = ['views_count', 'created_at', 'updated_at']
    inlines = [ProductImageInline]  # Добавление фото прямо на странице товара
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('factory', 'category', 'material', 'name', 'article')
        }),
        ('Описание', {
            'fields': ('description',)
        }),
        ('Характеристики', {
            'fields': ('weight', 'size', 'has_stones', 'stone_description')
        }),
        ('Цена и склад', {
            'fields': ('price', 'stock_quantity')
        }),
        ('Статус', {
            'fields': ('is_active', 'views_count', 'created_at', 'updated_at')
        }),
    )


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'is_main', 'order', 'uploaded_at']
    list_filter = ['is_main', 'uploaded_at']
    list_editable = ['is_main', 'order']


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'added_at']
    list_filter = ['added_at']
    search_fields = ['user__username', 'product__name']