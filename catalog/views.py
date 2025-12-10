# catalog/views.py
import logging
from django.shortcuts import render, get_object_or_404, redirect
from django.db.models import Q, F, Sum, Count
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.forms import modelformset_factory
from django.http import JsonResponse
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_cookie
from django.core.paginator import Paginator

from .models import Product, Category, Material, Factory, ProductImage, Favorite, Theme
from .forms import (
    FactoryRegistrationForm,
    FactoryProfileForm,
    ProductForm,
    ProductImageForm,
    CustomerRegistrationForm
)

# Настройка логирования
logger = logging.getLogger(__name__)

# Константы
PRODUCTS_PER_PAGE = 12

def get_cached_categories():
    """Получить категории из кэша или БД"""
    categories = cache.get('categories_list')
    if categories is None:
        categories = list(Category.objects.filter(parent__isnull=True, is_active=True))
        cache.set('categories_list', categories, 60 * 60)  # Кэш на 1 час
    return categories

def get_cached_reference_data():
    """Получить справочные данные из кэша"""
    from .models import Purity, MetalColor, Style

    ref_data = cache.get('reference_data')
    if ref_data is None:
        ref_data = {
            'materials': list(Material.objects.all()),
            'purities': list(Purity.objects.all()),
            'metal_colors': list(MetalColor.objects.all()),
            'styles': list(Style.objects.all()),
        }
        cache.set('reference_data', ref_data, 60 * 60)  # Кэш на 1 час
    return ref_data

@cache_page(60 * 5)  # Кэш на 5 минут
@vary_on_cookie  # Отдельный кэш для каждого пользователя (по cookies)
def home(request):
    """Главная страница с каталогом товаров с расширенными фильтрами"""
    from django.core.paginator import Paginator
    from .models import Purity, MetalColor, Style

    # Получаем параметры фильтрации из URL
    category_slug = request.GET.get('category')
    material_id = request.GET.get('material')
    purity_id = request.GET.get('purity')
    metal_color_id = request.GET.get('metal_color')
    style_id = request.GET.get('style')
    has_inserts = request.GET.get('has_inserts')
    has_stamp = request.GET.get('has_stamp')
    search_query = request.GET.get('search')
    sort_by = request.GET.get('sort', '-created_at')  # По умолчанию сортировка по новизне
    min_price = request.GET.get('min_price')
    max_price = request.GET.get('max_price')

    # Базовый запрос - только активные товары
    products = Product.objects.filter(is_active=True).select_related(
        'factory', 'category', 'material', 'purity', 'metal_color', 'style'
    ).prefetch_related('images', 'insert_types', 'coatings')

    # Фильтр по категории (включая подкатегории)
    if category_slug:
        category = Category.objects.filter(slug=category_slug).first()
        if category:
            if category.parent is None:
                # Если это главная категория, показываем товары из всех подкатегорий
                subcategory_ids = category.subcategories.values_list('id', flat=True)
                products = products.filter(Q(category=category) | Q(category_id__in=subcategory_ids))
            else:
                # Если это подкатегория, показываем только её товары
                products = products.filter(category=category)

    # Фильтр по материалу
    if material_id:
        products = products.filter(material_id=material_id)

    # Новые фильтры
    if purity_id:
        products = products.filter(purity_id=purity_id)

    if metal_color_id:
        products = products.filter(metal_color_id=metal_color_id)

    if style_id:
        products = products.filter(style_id=style_id)

    if has_inserts:
        products = products.filter(has_inserts=(has_inserts == 'true'))

    if has_stamp:
        products = products.filter(has_stamp=(has_stamp == 'true'))

    # Фильтр по цене
    if min_price:
        products = products.filter(price__gte=min_price)
    if max_price:
        products = products.filter(price__lte=max_price)

    # Поиск
    if search_query:
        products = products.filter(
            Q(name__icontains=search_query) |
            Q(article__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(manufacturer_brand__icontains=search_query)
        )

    # Сортировка
    if sort_by == 'price_asc':
        products = products.order_by('price')
    elif sort_by == 'price_desc':
        products = products.order_by('-price')
    elif sort_by == 'popular':
        products = products.order_by('-views_count')
    elif sort_by == 'name':
        products = products.order_by('name')
    else:  # -created_at (по умолчанию - новые)
        products = products.order_by('-created_at')

    # Пагинация
    paginator = Paginator(products, PRODUCTS_PER_PAGE)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Данные для фильтров (используем кэш)
    categories = get_cached_categories()
    ref_data = get_cached_reference_data()
    materials = ref_data['materials']
    purities = ref_data['purities']
    metal_colors = ref_data['metal_colors']
    styles = ref_data['styles']

    # Get selected filter objects for display
    selected_category = None
    selected_material = None
    selected_purity = None
    selected_metal_color = None
    selected_style = None

    if category_slug:
        selected_category = Category.objects.filter(slug=category_slug).first()
    if material_id:
        selected_material = Material.objects.filter(id=material_id).first()
    if purity_id:
        selected_purity = Purity.objects.filter(id=purity_id).first()
    if metal_color_id:
        selected_metal_color = MetalColor.objects.filter(id=metal_color_id).first()
    if style_id:
        selected_style = Style.objects.filter(id=style_id).first()

    context = {
        'page_obj': page_obj,
        'categories': categories,
        'materials': materials,
        'purities': purities,
        'metal_colors': metal_colors,
        'styles': styles,
        'current_category': category_slug,
        'current_material': material_id,
        'current_purity': purity_id,
        'current_metal_color': metal_color_id,
        'current_style': style_id,
        'selected_category': selected_category,
        'selected_material': selected_material,
        'selected_purity': selected_purity,
        'selected_metal_color': selected_metal_color,
        'selected_style': selected_style,
        'current_has_inserts': has_inserts,
        'current_has_stamp': has_stamp,
        'search_query': search_query,
        'sort_by': sort_by,
        'min_price': min_price,
        'max_price': max_price,
    }

    return render(request, 'catalog/home.html', context)


def product_detail(request, article):
    """Страница товара"""
    # Оптимизировано: загружаем все связанные объекты сразу (fix N+1)
    product = get_object_or_404(
        Product.objects.select_related(
            'factory', 'category', 'material', 'purity', 'metal_color', 'style'
        ).prefetch_related('images', 'insert_types', 'coatings'),
        article=article,
        is_active=True
    )

    # Оптимизировано: используем F-выражение для избежания race condition
    from django.db.models import F
    Product.objects.filter(article=article).update(views_count=F('views_count') + 1)
    # Перезагружаем объект чтобы получить обновленный счетчик
    product.refresh_from_db(fields=['views_count'])
    
    # Похожие товары (из той же категории)
    similar_products = Product.objects.filter(
        category=product.category,
        is_active=True
    ).exclude(id=product.id)[:4]
    
    context = {
        'product': product,
        'similar_products': similar_products,
    }
    
    return render(request, 'catalog/product_detail.html', context)


def product_fullscreen(request, article):
    """Полноэкранный просмотр изображения товара"""
    product = get_object_or_404(
        Product.objects.select_related('factory', 'category').prefetch_related('images'),
        article=article,
        is_active=True
    )

    context = {
        'product': product,
    }

    return render(request, 'catalog/product_fullscreen.html', context)


def factory_detail(request, factory_id):
    """Страница завода со всеми его товарами"""
    factory = get_object_or_404(Factory, id=factory_id)

    products_list = Product.objects.filter(
        factory=factory,
        is_active=True
    ).select_related('category', 'material', 'purity', 'metal_color', 'style').prefetch_related('images')

    # Пагинация (12 товаров на странице)
    paginator = Paginator(products_list, 12)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    context = {
        'factory': factory,
        'page_obj': page_obj,
    }

    return render(request, 'catalog/factory_detail.html', context)

def factory_register(request):
    """Регистрация завода"""
    if request.method == 'POST':
        form = FactoryRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Регистрация прошла успешно! Добро пожаловать!')
            return redirect('catalog:factory_dashboard')
    else:
        form = FactoryRegistrationForm()
    
    return render(request, 'catalog/factory_register.html', {'form': form})


@login_required
def factory_dashboard(request):
    """Главная страница личного кабинета завода"""
    try:
        factory = request.user.factory
    except Factory.DoesNotExist:
        messages.error(request, 'У вас нет профиля завода')
        return redirect('catalog:home')
    
    products = Product.objects.filter(factory=factory).select_related(
        'category', 'material'
    ).prefetch_related('images')

    # Оптимизировано: используем aggregate вместо загрузки всех объектов
    from django.db.models import Sum, Count, Q
    stats = products.aggregate(
        total_products=Count('id'),
        active_products=Count('id', filter=Q(is_active=True)),
        total_views=Sum('views_count'),
        in_stock=Count('id', filter=Q(stock_quantity__gt=0))
    )

    total_products = stats['total_products'] or 0
    active_products = stats['active_products'] or 0
    total_views = stats['total_views'] or 0
    in_stock = stats['in_stock'] or 0
    
    context = {
        'factory': factory,
        'products': products,
        'stats': {
            'total_products': total_products,
            'active_products': active_products,
            'total_views': total_views,
            'in_stock': in_stock,
        }
    }
    
    return render(request, 'catalog/factory_dashboard.html', context)


@login_required
def factory_profile_edit(request):
    """Редактирование профиля завода"""
    try:
        factory = request.user.factory
    except Factory.DoesNotExist:
        messages.error(request, 'У вас нет профиля завода')
        return redirect('catalog:home')
    
    if request.method == 'POST':
        form = FactoryProfileForm(request.POST, request.FILES, instance=factory)
        if form.is_valid():
            form.save()
            messages.success(request, 'Профиль успешно обновлён!')
            return redirect('catalog:factory_dashboard')
    else:
        form = FactoryProfileForm(instance=factory)
    
    return render(request, 'catalog/factory_profile_edit.html', {'form': form, 'factory': factory})


@login_required
def product_add(request):
    """Добавление нового товара"""
    try:
        factory = request.user.factory
    except Factory.DoesNotExist:
        messages.error(request, 'У вас нет профиля завода')
        return redirect('catalog:home')
    
    if request.method == 'POST':
        form = ProductForm(request.POST)
        
        if form.is_valid():
            product = form.save(commit=False)
            product.factory = factory
            product.save()
            
            # Обрабатываем изображение из canvas (если есть)
            canvas_image = request.FILES.get('canvas_image')
            
            if canvas_image:
                try:
                    ProductImage.objects.create(
                        product=product,
                        image=canvas_image,
                        is_main=True,
                        order=0
                    )
                    logger.info(f"Canvas image saved for product {product.article}: {canvas_image.name}")
                except Exception as e:
                    logger.error(f"Failed to save canvas image for product {product.article}: {e}")
                    messages.error(request, 'Ошибка при сохранении изображения')
            
            messages.success(request, f'Товар "{product.name}" успешно добавлен!')
            
            # 🔧 ФИКС: Проверяем тип запроса
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                # Для AJAX запросов возвращаем JSON
                from django.http import JsonResponse
                return JsonResponse({
                    'success': True,
                    'message': f'Товар "{product.name}" успешно добавлен!',
                    'redirect_url': '/dashboard/'
                })
            else:
                # Для обычных запросов делаем редирект
                return redirect('catalog:factory_dashboard')
        else:
            # 🔧 ФИКС: Для AJAX возвращаем ошибки
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                from django.http import JsonResponse
                # 🔧 НОВОЕ: Логируем ошибки на сервере
                print("❌ Ошибки валидации формы:")
                for field, errors in form.errors.items():
                    print(f"  - {field}: {errors}")
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                }, status=400)
            else:
                messages.error(request, 'Пожалуйста, исправьте ошибки в форме.')
    else:
        form = ProductForm()
    
    return render(request, 'catalog/product_add.html', {
        'form': form,
        'factory': factory
    })


@login_required
def product_edit(request, article):
    """Редактирование товара"""
    try:
        factory = request.user.factory
    except Factory.DoesNotExist:
        messages.error(request, 'У вас нет профиля завода')
        return redirect('catalog:home')
    
    product = get_object_or_404(Product, article=article, factory=factory)
    ImageFormSet = modelformset_factory(ProductImage, form=ProductImageForm, extra=2, can_delete=True)
    
    if request.method == 'POST':
        form = ProductForm(request.POST, instance=product)
        formset = ImageFormSet(request.POST, request.FILES, queryset=product.images.all())
        
        if form.is_valid() and formset.is_valid():
            form.save()
            
            # Сохраняем изображения
            for image_form in formset:
                if image_form.cleaned_data.get('DELETE'):
                    if image_form.instance.pk:
                        image_form.instance.delete()
                elif image_form.cleaned_data.get('image'):
                    image = image_form.save(commit=False)
                    image.product = product
                    image.save()
            
            messages.success(request, f'Товар "{product.name}" успешно обновлён!')
            return redirect('catalog:factory_dashboard')
    else:
        form = ProductForm(instance=product)
        formset = ImageFormSet(queryset=product.images.all())
    
    return render(request, 'catalog/product_edit.html', {
        'form': form,
        'formset': formset,
        'product': product,
        'factory': factory
    })


@login_required
def product_delete(request, article):
    """Удаление товара"""
    try:
        factory = request.user.factory
    except Factory.DoesNotExist:
        messages.error(request, 'У вас нет профиля завода')
        return redirect('catalog:home')
    
    product = get_object_or_404(Product, article=article, factory=factory)
    
    if request.method == 'POST':
        product_name = product.name
        product.delete()
        messages.success(request, f'Товар "{product_name}" успешно удалён!')
        return redirect('catalog:factory_dashboard')
    
    return render(request, 'catalog/product_delete.html', {
        'product': product,
        'factory': factory
    })

def customer_register(request):
    """Регистрация покупателя"""
    if request.method == 'POST':
        form = CustomerRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Регистрация прошла успешно! Добро пожаловать!')
            return redirect('catalog:home')
    else:
        form = CustomerRegistrationForm()
    
    return render(request, 'catalog/customer_register.html', {'form': form})


@login_required
def toggle_favorite(request, article):
    """Добавить/удалить товар из избранного (AJAX)"""
    product = get_object_or_404(Product, article=article, is_active=True)
    
    favorite, created = Favorite.objects.get_or_create(
        user=request.user,
        product=product
    )
    
    if not created:
        # Если уже был в избранном - удаляем
        favorite.delete()
        is_favorite = False
        message = 'Удалено из избранного'
    else:
        is_favorite = True
        message = 'Добавлено в избранное'
    
    # Для AJAX запросов
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        import json
        from django.http import JsonResponse
        return JsonResponse({
            'is_favorite': is_favorite,
            'message': message
        })
    
    # Для обычных запросов
    messages.success(request, message)
    return redirect('catalog:product_detail', article=article)


@login_required
def favorites_list(request):
    """Список избранных товаров"""
    favorites = Favorite.objects.filter(user=request.user).select_related(
        'product__factory', 'product__category', 'product__material'
    ).prefetch_related('product__images').order_by('-added_at')
    
    context = {
        'favorites': favorites,
    }
    
    return render(request, 'catalog/favorites_list.html', context)

def logout_view(request):
    """Выход из системы"""
    logout(request)
    messages.success(request, 'Вы успешно вышли из системы')
    return redirect('catalog:home')


@login_required
def factory_category_add(request):
    """Добавление новой категории/подкатегории заводом"""
    try:
        factory = request.user.factory
    except Factory.DoesNotExist:
        messages.error(request, 'У вас нет профиля завода')
        return redirect('catalog:home')

    from .forms import CategoryForm

    if request.method == 'POST':
        form = CategoryForm(request.POST, request.FILES)
        if form.is_valid():
            category = form.save(commit=False, factory=factory)
            category.save()
            messages.success(request, f'Категория "{category.name}" успешно добавлена!')
            return redirect('catalog:factory_dashboard')
    else:
        form = CategoryForm()

    return render(request, 'catalog/factory_category_add.html', {
        'form': form,
        'factory': factory
    })


@login_required
def factory_characteristic_add(request):
    """Добавление новых характеристик заводом"""
    try:
        factory = request.user.factory
    except Factory.DoesNotExist:
        messages.error(request, 'У вас нет профиля завода')
        return redirect('catalog:home')

    from .forms import CharacteristicForm
    from .models import Purity, MetalColor, Style, InsertType, Coating
    from django.utils.text import slugify

    if request.method == 'POST':
        form = CharacteristicForm(request.POST)
        if form.is_valid():
            char_type = form.cleaned_data['characteristic_type']
            name = form.cleaned_data['name']
            description = form.cleaned_data.get('description', '')

            try:
                if char_type == 'purity':
                    Purity.objects.create(
                        material_type=form.cleaned_data['material_type'],
                        value=name,
                        system=form.cleaned_data['purity_system'],
                        description=description
                    )
                elif char_type == 'metal_color':
                    MetalColor.objects.create(
                        name=name,
                        slug=slugify(name),
                        description=description
                    )
                elif char_type == 'style':
                    Style.objects.create(
                        name=name,
                        slug=slugify(name),
                        description=description
                    )
                elif char_type == 'insert_type':
                    InsertType.objects.create(
                        name=name,
                        slug=slugify(name),
                        category=form.cleaned_data['insert_category'],
                        description=description
                    )
                elif char_type == 'coating':
                    Coating.objects.create(
                        name=name,
                        slug=slugify(name),
                        description=description
                    )

                messages.success(request, f'Характеристика "{name}" успешно добавлена!')
                return redirect('catalog:factory_dashboard')
            except Exception as e:
                messages.error(request, f'Ошибка при добавлении: {str(e)}')
    else:
        form = CharacteristicForm()

    return render(request, 'catalog/factory_characteristic_add.html', {
        'form': form,
        'factory': factory
    })

@login_required
def theme_editor(request):
    """Редактор цветовой схемы (только для авторизованных пользователей)"""
    # Получаем тему по умолчанию (только superuser может её редактировать)
    default_theme = None
    if request.user.is_superuser:
        default_theme = Theme.objects.filter(is_default=True).first()

    # Получаем пользовательские темы текущего пользователя
    user_themes = Theme.objects.filter(user=request.user, is_default=False)

    return render(request, 'catalog/theme_editor.html', {
        'default_theme': default_theme,
        'user_themes': user_themes
    })


@login_required
def theme_save(request):
    """Сохранение темы (только для авторизованных пользователей)"""
    if request.method == 'POST':
        import json
        data = json.loads(request.body)

        theme_id = data.get('id')

        # Если передан ID, обновляем существующую тему
        if theme_id:
            try:
                theme = Theme.objects.get(id=theme_id)

                # Проверяем права:
                # 1. Дефолтную тему может редактировать только superuser
                if theme.is_default and not request.user.is_superuser:
                    return JsonResponse({'success': False, 'error': 'Только администратор может редактировать дефолтную тему'})

                # 2. Пользовательскую тему может редактировать только её владелец
                if not theme.is_default and theme.user != request.user:
                    return JsonResponse({'success': False, 'error': 'Нет прав для редактирования этой темы'})

            except Theme.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Тема не найдена'})
        else:
            # Создаём новую пользовательскую тему (обычные пользователи не могут создавать дефолтную)
            theme_name = data.get('name', 'Новая тема')
            theme = Theme(user=request.user, name=theme_name, is_default=False)

        # Обновляем поля темы
        if not theme.is_default:
            theme.name = data.get('name', theme.name)

        theme.primary_color = data.get('primary_color', theme.primary_color)
        theme.secondary_color = data.get('secondary_color', theme.secondary_color)
        theme.gradient_enabled = data.get('gradient_enabled', theme.gradient_enabled)
        theme.sharp_corners = data.get('sharp_corners', theme.sharp_corners)
        theme.heading_font = data.get('heading_font', theme.heading_font)
        theme.body_font = data.get('body_font', theme.body_font)
        theme.heading_font_weight = data.get('heading_font_weight', theme.heading_font_weight)
        theme.body_font_weight = data.get('body_font_weight', theme.body_font_weight)

        # Цветовая схема только для default темы (и только superuser может её менять)
        if theme.is_default and request.user.is_superuser:
            theme.color_scheme = data.get('color_scheme', theme.color_scheme)

        theme.save()

        return JsonResponse({
            'success': True,
            'theme_id': theme.id,
            'message': f'Тема "{theme.name}" сохранена'
        })

    return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})


@login_required
def theme_load(request, theme_id):
    """Загрузка темы (только для авторизованных пользователей)"""
    try:
        theme = Theme.objects.get(id=theme_id)
        # Проверяем доступ:
        # 1. Дефолтную тему могут загружать все авторизованные пользователи
        # 2. Пользовательскую тему может загружать только её владелец
        if not theme.is_default and theme.user != request.user:
            return JsonResponse({'success': False, 'error': 'Нет доступа к этой теме'})

        return JsonResponse({
            'success': True,
            'theme': {
                'id': theme.id,
                'name': theme.name,
                'primary_color': theme.primary_color,
                'secondary_color': theme.secondary_color,
                'color_scheme': theme.color_scheme,
                'gradient_enabled': theme.gradient_enabled,
                'sharp_corners': theme.sharp_corners,
                'is_default': theme.is_default,
                'is_active': theme.is_active,
                'heading_font': theme.heading_font,
                'body_font': theme.body_font,
                'heading_font_weight': theme.heading_font_weight,
                'body_font_weight': theme.body_font_weight,
            }
        })
    except Theme.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Тема не найдена'})


@login_required
def theme_delete(request, theme_id):
    """Удаление темы (только для авторизованных пользователей)"""
    if request.method == 'POST':
        try:
            theme = Theme.objects.get(id=theme_id, user=request.user)

            # Защита от удаления default темы
            if theme.is_default:
                return JsonResponse({'success': False, 'error': 'Нельзя удалить дефолтную тему'})

            theme_name = theme.name
            theme.delete()
            return JsonResponse({
                'success': True,
                'message': f'Тема "{theme_name}" удалена'
            })
        except Theme.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Тема не найдена или нет прав для её удаления'})
        except ValueError as e:
            return JsonResponse({'success': False, 'error': str(e)})

    return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})


@login_required
def theme_activate(request, theme_id):
    """Активация темы"""
    if request.method == 'POST':
        try:
            theme = Theme.objects.get(id=theme_id)

            # Проверяем права: либо это default тема, либо тема принадлежит пользователю
            if not theme.is_default and theme.user != request.user:
                return JsonResponse({'success': False, 'error': 'Нет прав для активации этой темы'})

            theme.is_active = True
            theme.save()  # Метод save() автоматически деактивирует другие темы

            return JsonResponse({
                'success': True,
                'message': f'Тема "{theme.name}" активирована',
                'theme': {
                    'id': theme.id,
                    'name': theme.name,
                    'primary_color': theme.primary_color,
                    'secondary_color': theme.secondary_color,
                    'color_scheme': theme.color_scheme,
                    'gradient_enabled': theme.gradient_enabled,
                    'sharp_corners': theme.sharp_corners,
                    'is_default': theme.is_default,
                    'is_active': theme.is_active,
                    'heading_font': theme.heading_font,
                    'body_font': theme.body_font
                }
            })
        except Theme.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Тема не найдена'})

    return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})