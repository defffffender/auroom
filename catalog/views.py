# catalog/views.py
from django.shortcuts import render, get_object_or_404
from django.db.models import Q
from .models import Product, Category, Material, Factory, ProductImage, Favorite
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login
from django.shortcuts import redirect
from django.contrib import messages
from .forms import FactoryRegistrationForm, FactoryProfileForm, ProductForm, ProductImageForm, CustomerRegistrationForm
from django.forms import modelformset_factory
from django.contrib.auth import logout

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

    # Пагинация (по 12 товаров на странице)
    paginator = Paginator(products, 12)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Данные для фильтров
    categories = Category.objects.filter(parent__isnull=True, is_active=True)
    materials = Material.objects.all()
    purities = Purity.objects.all()
    metal_colors = MetalColor.objects.all()
    styles = Style.objects.all()

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
    product = get_object_or_404(
        Product.objects.select_related('factory', 'category', 'material')
                      .prefetch_related('images'),
        article=article,
        is_active=True
    )
    
    # Увеличиваем счетчик просмотров
    product.views_count += 1
    product.save(update_fields=['views_count'])
    
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


def factory_detail(request, factory_id):
    """Страница завода со всеми его товарами"""
    factory = get_object_or_404(Factory, id=factory_id)
    
    products = Product.objects.filter(
        factory=factory,
        is_active=True
    ).select_related('category', 'material').prefetch_related('images')
    
    context = {
        'factory': factory,
        'products': products,
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
    
    # Статистика
    total_products = products.count()
    active_products = products.filter(is_active=True).count()
    total_views = sum(p.views_count for p in products)
    in_stock = products.filter(stock_quantity__gt=0).count()
    
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
                    print(f"✅ Изображение из canvas сохранено: {canvas_image.name}")
                except Exception as e:
                    print(f"❌ Ошибка при сохранении изображения: {e}")
            
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