from django.contrib import admin
from .models import (
    Factory, Category, Material, Product, ProductImage, Favorite,
    Purity, MetalColor, Style, InsertType, Coating, ReferenceImage
)


class ProductImageInline(admin.TabularInline):
    """Позволяет добавлять фото товара прямо на странице товара"""
    model = ProductImage
    extra = 3
    fields = ['image', 'is_main', 'is_reference', 'order']


@admin.register(Factory)
class FactoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'is_verified', 'created_at']
    list_filter = ['is_verified', 'created_at']
    search_fields = ['name', 'phone', 'email']
    list_editable = ['is_verified']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'created_by', 'is_active', 'created_at']
    list_filter = ['parent', 'is_active', 'created_by']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ['is_active']


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ['name', 'material_type', 'purity']
    list_filter = ['material_type']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['article', 'name', 'factory', 'category', 'price', 'stock_quantity',
                    'has_inserts', 'has_stamp', 'is_active']
    list_filter = ['category', 'material', 'purity', 'metal_color', 'style', 'is_active',
                   'has_inserts', 'has_stamp', 'created_at']
    search_fields = ['article', 'name', 'description', 'manufacturer_brand']
    list_editable = ['is_active', 'price']
    readonly_fields = ['views_count', 'created_at', 'updated_at', 'dimensions_text']
    inlines = [ProductImageInline]
    filter_horizontal = ['insert_types', 'coatings']

    fieldsets = (
        ('Основная информация', {
            'fields': ('factory', 'category', 'material', 'name', 'article', 'manufacturer_brand')
        }),
        ('Описание', {
            'fields': ('description',)
        }),
        ('Характеристики металла', {
            'fields': ('purity', 'metal_color', 'style', 'metal_weight', 'total_weight', 'size')
        }),
        ('Вставки (камни)', {
            'fields': ('has_inserts', 'insert_types', 'insert_description')
        }),
        ('Покрытие', {
            'fields': ('coatings',)
        }),
        ('Клеймо', {
            'fields': ('has_stamp', 'stamp_description')
        }),
        ('Размеры и линейка', {
            'fields': ('reference_photo_type', 'width_mm', 'height_mm', 'diameter_mm',
                      'show_ruler', 'dimensions_text'),
            'description': 'Укажите точные размеры изделия в миллиметрах для отображения интерактивной линейки'
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
    list_display = ['product', 'is_main', 'is_reference', 'order', 'uploaded_at']
    list_filter = ['is_main', 'is_reference', 'uploaded_at']
    list_editable = ['is_main', 'is_reference', 'order']


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'added_at']
    list_filter = ['added_at']
    search_fields = ['user__username', 'product__name']


@admin.register(Purity)
class PurityAdmin(admin.ModelAdmin):
    list_display = ['material_type', 'value', 'system', 'description']
    list_filter = ['material_type', 'system']
    search_fields = ['value', 'description']


@admin.register(MetalColor)
class MetalColorAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Style)
class StyleAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(InsertType)
class InsertTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'description']
    list_filter = ['category']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name', 'description']


@admin.register(Coating)
class CoatingAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(ReferenceImage)
class ReferenceImageAdmin(admin.ModelAdmin):
    list_display = ['reference_type', 'width_mm', 'height_mm', 'is_active', 'created_at']
    list_filter = ['reference_type', 'is_active']
    list_editable = ['is_active']