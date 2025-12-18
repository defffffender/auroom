# catalog/views.py
import logging
from django.shortcuts import render, get_object_or_404, redirect
from django.db.models import Q, F, Sum, Count
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils.translation import gettext as _
from django.forms import modelformset_factory
from django.http import JsonResponse
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_cookie
from django.core.paginator import Paginator

from .models import Product, Category, Material, Factory, ProductImage, Favorite, FavoriteList, Theme
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

    # Проверяем, это AJAX запрос для бесконечного скролла?
    # Используем URL параметр для определения формата ответа
    is_ajax = request.GET.get('format') == 'json'

    if is_ajax:
        from django.http import JsonResponse

        # Формируем JSON ответ с товарами
        products_data = []
        for product in page_obj:
            image_url = product.images.all()[0].image.url if product.images.exists() else None
            products_data.append({
                'article': product.article,
                'name': product.name,
                'price': str(product.price),
                'image_url': image_url,
                'category_name': product.category.name,
                'in_stock': product.in_stock,
                'stock_quantity': product.stock_quantity if product.in_stock else 0,
                'material_name': product.material.name if product.material else '',
                'metal_weight': str(product.metal_weight) if product.metal_weight else '—',
                'factory_name': product.factory.name if product.factory else '',
                'detail_url': f'/product/{product.article}/',
            })

        return JsonResponse({
            'products': products_data,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'current_page': page_obj.number,
            'total_pages': page_obj.paginator.num_pages,
            'total_count': page_obj.paginator.count,
        })

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
            messages.success(request, _('Регистрация прошла успешно! Добро пожаловать!'))
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
        messages.error(request, _('У вас нет профиля завода'))
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
        messages.error(request, _('У вас нет профиля завода'))
        return redirect('catalog:home')
    
    if request.method == 'POST':
        form = FactoryProfileForm(request.POST, request.FILES, instance=factory)
        if form.is_valid():
            form.save()
            messages.success(request, _('Профиль успешно обновлён!'))
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
        messages.error(request, _('У вас нет профиля завода'))
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
                    messages.error(request, _('Ошибка при сохранении изображения'))
            
            messages.success(request, _(f'Товар \"{product.name}\" успешно добавлен!'))
            
            # 🔧 ФИКС: Проверяем тип запроса
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                # Для AJAX запросов возвращаем JSON
                from django.http import JsonResponse
                return JsonResponse({
                    'success': True,
                    'message': _(f'Товар \"{product.name}\" успешно добавлен!'),
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
                messages.error(request, _('Пожалуйста, исправьте ошибки в форме.'))
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
        messages.error(request, _('У вас нет профиля завода'))
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
            
            messages.success(request, _(f'Товар \"{product.name}\" успешно обновлён!'))
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
        messages.error(request, _('У вас нет профиля завода'))
        return redirect('catalog:home')
    
    product = get_object_or_404(Product, article=article, factory=factory)
    
    if request.method == 'POST':
        product_name = product.name
        product.delete()
        messages.success(request, _(f'Товар \"{product_name}\" успешно удалён!'))
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
            messages.success(request, _('Регистрация прошла успешно! Добро пожаловать!'))
            return redirect('catalog:home')
    else:
        form = CustomerRegistrationForm()
    
    return render(request, 'catalog/customer_register.html', {'form': form})


@login_required
def toggle_favorite(request, article):
    """Добавить/удалить товар из избранного (AJAX)"""
    product = get_object_or_404(Product, article=article, is_active=True)

    # Для AJAX запросов
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        import json
        from django.http import JsonResponse

        # GET запрос - просто возвращаем списки для показа модалки
        if request.method == 'GET':
            # Создаём или получаем дефолтный список
            FavoriteList.objects.get_or_create(
                user=request.user,
                is_default=True,
                defaults={'name': 'Мои избранные', 'description': 'Список по умолчанию'}
            )

            # Получаем все списки пользователя для popup
            user_lists = FavoriteList.objects.filter(user=request.user).order_by('-is_default', 'name')
            lists_data = [{
                'id': lst.id,
                'name': lst.name,
                'is_default': lst.is_default,
                'items_count': lst.items_count
            } for lst in user_lists]

            return JsonResponse({
                'lists': lists_data
            })

        # POST запрос - добавляем/удаляем товар
        if request.method == 'POST':
            list_id = request.POST.get('list_id')

            if list_id:
                favorite_list = get_object_or_404(FavoriteList, id=list_id, user=request.user)
            else:
                # Создаём или получаем дефолтный список
                favorite_list, _ = FavoriteList.objects.get_or_create(
                    user=request.user,
                    is_default=True,
                    defaults={'name': 'Мои избранные', 'description': 'Список по умолчанию'}
                )

            # Проверяем, есть ли товар в ЭТОМ списке
            favorite = Favorite.objects.filter(
                user=request.user,
                product=product,
                favorite_list=favorite_list
            ).first()

            if favorite:
                # Если уже есть в этом списке - сообщаем
                is_favorite = True
                message = f'Товар уже в списке "{favorite_list.name}"'
            else:
                # Добавляем в выбранный список
                Favorite.objects.create(
                    user=request.user,
                    product=product,
                    favorite_list=favorite_list
                )
                is_favorite = True
                message = f'Добавлено в список "{favorite_list.name}"'

            # Получаем все списки пользователя для popup
            user_lists = FavoriteList.objects.filter(user=request.user).order_by('-is_default', 'name')
            lists_data = [{
                'id': lst.id,
                'name': lst.name,
                'is_default': lst.is_default,
                'items_count': lst.items_count
            } for lst in user_lists]

            return JsonResponse({
                'is_favorite': is_favorite,
                'message': message,
                'lists': lists_data,
                'current_list_id': favorite_list.id
            })

    # Для обычных запросов (не AJAX)
    if request.method == 'POST':
        list_id = request.POST.get('list_id')

        if list_id:
            favorite_list = get_object_or_404(FavoriteList, id=list_id, user=request.user)
        else:
            favorite_list, _ = FavoriteList.objects.get_or_create(
                user=request.user,
                is_default=True,
                defaults={'name': 'Мои избранные', 'description': 'Список по умолчанию'}
            )

        favorite = Favorite.objects.filter(
            user=request.user,
            product=product,
            favorite_list=favorite_list
        ).first()

        if favorite:
            message = _(f'Товар уже в списке "{favorite_list.name}"')
        else:
            Favorite.objects.create(
                user=request.user,
                product=product,
                favorite_list=favorite_list
            )
            message = _(f'Добавлено в список "{favorite_list.name}"')

        messages.success(request, message)

    return redirect('catalog:product_detail', article=article)


@login_required
def favorites_list(request, list_id=None):
    """Список избранных товаров (с поддержкой списков)"""
    # Получаем или создаём дефолтный список
    default_list, _ = FavoriteList.objects.get_or_create(
        user=request.user,
        is_default=True,
        defaults={'name': _('Мои избранные'), 'description': _('Список по умолчанию')}
    )

    # Определяем текущий список
    if list_id:
        current_list = get_object_or_404(FavoriteList, id=list_id, user=request.user)
    else:
        current_list = default_list

    # Получаем все списки пользователя
    user_lists = FavoriteList.objects.filter(user=request.user).order_by('-is_default', 'name')

    # Получаем товары из текущего списка
    favorites = Favorite.objects.filter(
        user=request.user,
        favorite_list=current_list
    ).select_related(
        'product__factory', 'product__category', 'product__material'
    ).prefetch_related('product__images').order_by('-added_at')

    context = {
        'favorites': favorites,
        'current_list': current_list,
        'user_lists': user_lists,
    }

    return render(request, 'catalog/favorites_list.html', context)


@login_required
def favorite_list_create(request):
    """Создать новый список избранного (AJAX)"""
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()

        if not name:
            return JsonResponse({'success': False, 'error': 'Название списка не может быть пустым'}, status=400)

        # Проверяем уникальность
        if FavoriteList.objects.filter(user=request.user, name=name).exists():
            return JsonResponse({'success': False, 'error': 'Список с таким названием уже существует'}, status=400)

        # Создаём новый список
        favorite_list = FavoriteList.objects.create(
            user=request.user,
            name=name,
            description=request.POST.get('description', ''),
            is_default=False
        )

        return JsonResponse({
            'success': True,
            'list': {
                'id': favorite_list.id,
                'name': favorite_list.name,
                'is_default': favorite_list.is_default,
                'items_count': 0
            }
        })

    return JsonResponse({'success': False, 'error': 'Метод не поддерживается'}, status=405)


@login_required
def favorite_list_delete(request, list_id):
    """Удалить список избранного (AJAX)"""
    if request.method == 'POST':
        favorite_list = get_object_or_404(FavoriteList, id=list_id, user=request.user)

        # Нельзя удалить дефолтный список
        if favorite_list.is_default:
            return JsonResponse({'success': False, 'error': 'Нельзя удалить основной список'}, status=400)

        favorite_list.delete()
        return JsonResponse({'success': True})

    return JsonResponse({'success': False, 'error': 'Метод не поддерживается'}, status=405)


@login_required
def favorite_list_rename(request, list_id):
    """Переименовать список избранного (AJAX)"""
    if request.method == 'POST':
        favorite_list = get_object_or_404(FavoriteList, id=list_id, user=request.user)
        new_name = request.POST.get('name', '').strip()

        if not new_name:
            return JsonResponse({'success': False, 'error': 'Название не может быть пустым'}, status=400)

        # Проверяем уникальность (кроме текущего списка)
        if FavoriteList.objects.filter(user=request.user, name=new_name).exclude(id=list_id).exists():
            return JsonResponse({'success': False, 'error': 'Список с таким названием уже существует'}, status=400)

        favorite_list.name = new_name
        favorite_list.description = request.POST.get('description', favorite_list.description)
        favorite_list.save()

        return JsonResponse({
            'success': True,
            'list': {
                'id': favorite_list.id,
                'name': favorite_list.name,
                'is_default': favorite_list.is_default
            }
        })

    return JsonResponse({'success': False, 'error': 'Метод не поддерживается'}, status=405)


def logout_view(request):
    """Выход из системы"""
    logout(request)
    messages.success(request, _('Вы успешно вышли из системы'))
    return redirect('catalog:home')


@login_required
def factory_category_add(request):
    """Добавление новой категории/подкатегории заводом"""
    try:
        factory = request.user.factory
    except Factory.DoesNotExist:
        messages.error(request, _('У вас нет профиля завода'))
        return redirect('catalog:home')

    from .forms import CategoryForm

    if request.method == 'POST':
        form = CategoryForm(request.POST, request.FILES)
        if form.is_valid():
            category = form.save(commit=False, factory=factory)
            category.save()
            messages.success(request, _(f'Категория \"{category.name}\" успешно добавлена!'))
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
        messages.error(request, _('У вас нет профиля завода'))
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

                messages.success(request, _(f'Характеристика \"{name}\" успешно добавлена!'))
                return redirect('catalog:factory_dashboard')
            except Exception as e:
                messages.error(request, _(f'Ошибка при добавлении: {str(e)}'))
    else:
        form = CharacteristicForm()

    return render(request, 'catalog/factory_characteristic_add.html', {
        'form': form,
        'factory': factory
    })

@login_required
def theme_editor(request):
    """Редактор цветовой схемы (только для superuser)"""
    # Проверяем, что пользователь - суперюзер
    if not request.user.is_superuser:
        messages.error(request, _('Доступ запрещен. Только администратор может редактировать темы.'))
        return redirect('catalog:home')

    # Получаем дефолтную тему для редактирования
    default_theme = Theme.objects.filter(is_default=True).first()

    return render(request, 'catalog/theme_editor.html', {
        'default_theme': default_theme,
        'user_themes': []  # Обычных пользовательских тем больше нет
    })


@login_required
def theme_save(request):
    """Сохранение темы (только для superuser)"""
    # Только superuser может сохранять темы
    if not request.user.is_superuser:
        return JsonResponse({'success': False, 'error': _('Доступ запрещен. Только администратор может редактировать темы.')})

    if request.method == 'POST':
        import json
        data = json.loads(request.body)

        theme_id = data.get('id')

        # Если передан ID, обновляем существующую тему
        if theme_id:
            try:
                theme = Theme.objects.get(id=theme_id)

                # Superuser может редактировать только дефолтную тему
                if not theme.is_default:
                    return JsonResponse({'success': False, 'error': 'Можно редактировать только дефолтную тему'})

            except Theme.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Тема не найдена'})
        else:
            # Создание новых тем запрещено
            return JsonResponse({'success': False, 'error': 'Создание новых тем запрещено. Можно редактировать только дефолтную тему.'})

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
    """Загрузка темы (только для superuser)"""
    # Только superuser может загружать темы
    if not request.user.is_superuser:
        return JsonResponse({'success': False, 'error': 'Доступ запрещен'})

    try:
        theme = Theme.objects.get(id=theme_id)
        # Superuser может загружать только дефолтную тему
        if not theme.is_default:
            return JsonResponse({'success': False, 'error': 'Можно загружать только дефолтную тему'})

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
    """Удаление темы (запрещено - можно только редактировать дефолтную)"""
    # Удаление тем полностью запрещено
    return JsonResponse({'success': False, 'error': 'Удаление тем запрещено. Можно только редактировать дефолтную тему.'})


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