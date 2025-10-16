# Руководство по обновлению AuRoom

## Что нового

Проект был существенно расширен согласно требованиям заказчика:

### 1. Иерархические категории
- Теперь категории могут иметь подкатегории (например: Кольца → Обручальное, Помолвочное и т.д.)
- Factory может создавать свои категории и подкатегории
- Категории создаются без модерации

### 2. Расширенные характеристики товаров
Добавлены новые поля в модель Product:
- **Проба** (метрическая и каратная система)
- **Цвет металла** (Желтое, Красное, Белое, Родированное)
- **Стиль** (Классический, Модерн, Арт-Деко, Винтаж и др.)
- **Производитель/Бренд** (свободное текстовое поле)
- **Масса металла** и **Общая масса изделия**
- **Типы вставок** (Драгоценные, Полудрагоценные, Органические, Синтетические)
- **Покрытия** (Эмалирование, Галтовка, Полировка, Матирование и др.)
- **Клеймо** (наличие и описание)

### 3. Расширенная фильтрация
В каталоге теперь можно фильтровать по:
- Категориям и подкатегориям
- Пробе
- Цвету металла
- Стилю
- Наличию вставок
- Наличию клейма
- Цене (диапазон)

### 4. Управление для Factory
Factory теперь может:
- Создавать свои категории/подкатегории
- Добавлять новые характеристики (пробы, цвета, стили, типы вставок, покрытия)
- Указывать бренд/производителя

---

## Инструкция по обновлению

### Шаг 1: Создание миграций

```bash
# Активируйте виртуальное окружение
# Windows:
venv\Scripts\activate

# Linux/Mac:
source venv/bin/activate

# Создайте миграции
python manage.py makemigrations

# Примените миграции к базе данных
python manage.py migrate
```

### Шаг 2: Загрузка базовых данных

После применения миграций загрузите базовые категории и характеристики из списка заказчика:

```bash
python manage.py load_jewelry_data
```

Эта команда загрузит:
- 7 основных категорий с 40+ подкатегориями
- 20+ проб для золота и серебра
- 4 цвета металлов
- 11 стилей
- 40+ типов вставок
- 8 типов покрытий

### Шаг 3: Обновление существующих товаров

**ВАЖНО:** Существующие товары требуют обновления, так как добавлены обязательные поля:
- `metal_weight` (масса металла)
- `total_weight` (общая масса изделия)

**Вариант 1: Через Django Admin**
1. Зайдите в админку: http://localhost:8000/admin/
2. Откройте раздел "Товары"
3. Для каждого товара заполните новые обязательные поля:
   - Масса металла (г)
   - Общая масса изделия (г)

**Вариант 2: Через скрипт (если товаров много)**

Создайте файл `update_products.py`:

```python
# update_products.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auroom.settings')
django.setup()

from catalog.models import Product

# Обновляем все товары, у которых не указан вес
products = Product.objects.filter(metal_weight__isnull=True)

for product in products:
    # Если есть старое поле weight, используем его
    if hasattr(product, 'weight'):
        product.metal_weight = product.weight
        product.total_weight = product.weight
    else:
        # Иначе ставим placeholder
        product.metal_weight = 1.0
        product.total_weight = 1.0

    product.save()
    print(f"Обновлен товар: {product.article}")

print(f"\nВсего обновлено товаров: {products.count()}")
```

Запустите:
```bash
python update_products.py
```

### Шаг 4: Запуск сервера

```bash
python manage.py runserver
```

---

## Новые URL-адреса

### Для Factory (личный кабинет):

- `/dashboard/category/add/` - Добавление категории/подкатегории
- `/dashboard/characteristic/add/` - Добавление характеристик (проба, цвет, стиль и т.д.)

### Фильтры в каталоге (GET-параметры):

```
/?category=kolca          # Категория (slug)
&purity=1                 # ID пробы
&metal_color=2            # ID цвета металла
&style=3                  # ID стиля
&has_inserts=true         # С вставками
&has_stamp=true           # С клеймом
&min_price=100            # Минимальная цена
&max_price=5000           # Максимальная цена
&search=кольцо            # Поиск
&sort=price_asc           # Сортировка
```

---

## Структура базы данных

### Новые таблицы:

1. **Purity** - Пробы металлов
   - material_type: gold/silver
   - value: "585", "750", "925" и т.д.
   - system: metric/carat
   - description: описание

2. **MetalColor** - Цвета металлов
   - name: название
   - slug: URL
   - description: описание

3. **Style** - Стили ювелирных изделий
   - name: название
   - slug: URL
   - description: описание

4. **InsertType** - Типы вставок
   - name: название
   - slug: URL
   - category: precious/semi_precious/organic/synthetic
   - description: описание

5. **Coating** - Покрытия
   - name: название
   - slug: URL
   - description: описание

### Изменения в существующих таблицах:

**Category:**
- Добавлено поле `parent` (ForeignKey to self) - для подкатегорий
- Добавлено поле `created_by` (ForeignKey to Factory) - кто создал
- Добавлено поле `is_active` - активна ли
- Добавлено поле `created_at` - дата создания

**Product:**
- Добавлены связи: `purity`, `metal_color`, `style`
- Добавлены ManyToMany: `insert_types`, `coatings`
- Добавлены поля: `manufacturer_brand`, `metal_weight`, `total_weight`
- Добавлены поля: `has_inserts`, `insert_description`, `has_stamp`, `stamp_description`
- Удалено устаревшее поле `has_stones` → заменено на `has_inserts`
- Удалено устаревшее поле `stone_description` → заменено на `insert_description`

---

## Примеры использования

### 1. Создание категории через Factory

```python
from catalog.models import Category, Factory

factory = Factory.objects.first()

# Главная категория
category = Category.objects.create(
    name="Серьги",
    slug="sergi",
    created_by=factory,
    is_active=True
)

# Подкатегория
subcategory = Category.objects.create(
    name="Пусеты (Гвоздики)",
    slug="pusety",
    parent=category,
    created_by=factory,
    is_active=True
)
```

### 2. Создание товара с новыми характеристиками

```python
from catalog.models import Product, Purity, MetalColor, Style

purity = Purity.objects.get(material_type='gold', value='585')
color = MetalColor.objects.get(slug='zheltoe-klassicheskoe')
style = Style.objects.get(slug='klassicheskii')

product = Product.objects.create(
    factory=factory,
    category=category,
    material=material,
    name="Кольцо обручальное классическое",
    description="Традиционное обручальное кольцо",
    manufacturer_brand="Золотая Мечта",
    purity=purity,
    metal_color=color,
    style=style,
    metal_weight=3.5,
    total_weight=3.5,
    price=15000,
    stock_quantity=10,
    has_inserts=False,
    has_stamp=True,
    stamp_description="585 ММД"
)
```

### 3. Фильтрация товаров

```python
# Все золотые кольца 585 пробы
products = Product.objects.filter(
    category__parent__slug='kolca',
    material__material_type='gold',
    purity__value='585',
    is_active=True
)

# Товары со вставками
products_with_inserts = Product.objects.filter(
    has_inserts=True,
    insert_types__category='precious'
)

# Товары с клеймом и определенным стилем
stamped_products = Product.objects.filter(
    has_stamp=True,
    style__slug='klassicheskii'
)
```

---

## Проблемы и решения

### Проблема: Ошибка миграции с Material.MATERIAL_TYPES

**Решение:** В новой версии Material.MATERIAL_TYPES содержит только 'gold' и 'silver'. Если у вас есть старые товары с 'platinum' или 'palladium', обновите их перед миграцией.

### Проблема: Старые товары не отображаются

**Решение:** Проверьте, заполнены ли обязательные поля `metal_weight` и `total_weight`. Выполните скрипт обновления из Шага 3.

### Проблема: Формы не показывают новые поля

**Решение:** Очистите кеш Django и перезапустите сервер:
```bash
python manage.py collectstatic --clear --noinput
python manage.py runserver
```

---

## Контрольный список после обновления

- [ ] Миграции применены успешно
- [ ] Базовые данные загружены (категории, пробы, цвета и т.д.)
- [ ] Существующие товары обновлены (metal_weight, total_weight)
- [ ] Админка отображает новые поля корректно
- [ ] Фильтры в каталоге работают
- [ ] Factory может создавать категории
- [ ] Factory может добавлять характеристики
- [ ] Формы добавления/редактирования товара содержат все новые поля

---

## Поддержка

При возникновении проблем проверьте:
1. Логи Django: `python manage.py runserver` покажет ошибки
2. Админку: http://localhost:8000/admin/
3. База данных: все ли миграции применены (`python manage.py showmigrations`)

Если проблема не решается:
- Создайте бэкап БД перед любыми изменениями
- Проверьте, что все зависимости установлены (`pip install -r requirements.txt`)
- Убедитесь, что используете правильное виртуальное окружение
