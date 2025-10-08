from django.contrib import admin
from .models import Factory, Category, Material, Product, ProductImage, Favorite


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
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ['name', 'material_type', 'purity']
    list_filter = ['material_type']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['article', 'name', 'factory', 'category', 'price', 'stock_quantity', 
                    'show_ruler', 'has_dimensions_display', 'is_active']
    list_filter = ['category', 'material', 'is_active', 'has_stones', 'created_at', 
                   'reference_photo_type', 'show_ruler']
    search_fields = ['article', 'name', 'description']
    list_editable = ['is_active', 'price']
    readonly_fields = ['views_count', 'created_at', 'updated_at', 'dimensions_text']
    inlines = [ProductImageInline]
    
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
        ('📏 Размеры и линейка', {
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
    
    def has_dimensions_display(self, obj):
        """Отображение наличия размеров"""
        return "✅" if obj.has_dimensions else "❌"
    has_dimensions_display.short_description = 'Размеры указаны'


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