# Fonon Design System - Инструкция по внедрению

## Описание

Это готовый стилевой пакет из проекта Fonon Market Intelligence для переноса в другие Django проекты.

**Основные особенности:**
- ✅ Полностью совместим с Bootstrap 5.3
- ✅ БЕЗ закруглений (строгий минималистичный дизайн)
- ✅ Профессиональная цветовая схема (зеленые и бежевые тона)
- ✅ Готовые компоненты для всех Bootstrap элементов
- ✅ CSS переменные для простой кастомизации
- ✅ Responsive дизайн
- ✅ Темная навигационная панель
- ✅ Красивые карточки, формы, таблицы

---

## Содержимое пакета

```
TRANSFER_PACKAGE/
├── fonon-styles.css              # Основной файл стилей
├── base-template-example.html    # Пример базового шаблона
├── example-components.html       # Примеры всех компонентов
└── INSTALLATION_GUIDE.md        # Эта инструкция
```

---

## Шаг 1: Подготовка Django проекта

### 1.1. Убедитесь, что у вас есть структура static

```bash
your_django_project/
├── your_app/
│   ├── static/
│   │   └── css/          # Создайте эту папку, если её нет
│   └── templates/
│       └── your_app/
└── manage.py
```

Если папки `static/css/` нет, создайте её:

```bash
mkdir -p your_app/static/css
```

### 1.2. Проверьте settings.py

Убедитесь, что в `settings.py` есть настройки для статики:

```python
# settings.py

STATIC_URL = '/static/'

STATICFILES_DIRS = [
    BASE_DIR / 'your_app' / 'static',
]

# Для продакшена
STATIC_ROOT = BASE_DIR / 'staticfiles'
```

---

## Шаг 2: Копирование файлов

### 2.1. Скопируйте CSS файл

Скопируйте `fonon-styles.css` в папку `static/css/` вашего проекта:

```bash
# Windows
copy TRANSFER_PACKAGE\fonon-styles.css your_app\static\css\

# Linux/Mac
cp TRANSFER_PACKAGE/fonon-styles.css your_app/static/css/
```

### 2.2. Скопируйте примеры (опционально)

Скопируйте примеры шаблонов в папку `templates/` для справки:

```bash
# Windows
copy TRANSFER_PACKAGE\base-template-example.html your_app\templates\your_app\
copy TRANSFER_PACKAGE\example-components.html your_app\templates\your_app\

# Linux/Mac
cp TRANSFER_PACKAGE/base-template-example.html your_app/templates/your_app/
cp TRANSFER_PACKAGE/example-components.html your_app/templates/your_app/
```

---

## Шаг 3: Обновление базового шаблона

### 3.1. Откройте ваш `base.html`

Найдите файл `templates/base.html` (или как он у вас называется).

### 3.2. Добавьте необходимые зависимости в `<head>`

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Название проекта{% endblock %}</title>

    <!-- Bootstrap CSS (ОБЯЗАТЕЛЬНО) -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- Bootstrap Icons (ОБЯЗАТЕЛЬНО для иконок) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">

    <!-- Fonon Design System (после Bootstrap!) -->
    {% load static %}
    <link rel="stylesheet" href="{% static 'css/fonon-styles.css' %}">

    {% block extra_css %}{% endblock %}
</head>
```

**ВАЖНО:**
- `fonon-styles.css` должен идти ПОСЛЕ Bootstrap CSS!
- Не забудьте `{% load static %}` в начале шаблона

### 3.3. Добавьте Bootstrap JavaScript перед `</body>`

```html
    <!-- Bootstrap JavaScript (ОБЯЗАТЕЛЬНО для dropdown, modals и т.д.) -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    {% block extra_js %}{% endblock %}
</body>
```

---

## Шаг 4: Применение стилей к навигации

### Пример навигационной панели

Замените вашу текущую навигацию на эту (или адаптируйте):

```html
<nav class="navbar navbar-expand-lg navbar-dark">
    <div class="container">
        <a class="navbar-brand" href="/">
            <i class="bi bi-app"></i> Название проекта
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav ms-auto">
                <!-- Ваши пункты меню -->
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                        <i class="bi bi-list"></i> Меню
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#">
                            <i class="bi bi-plus-circle"></i> Добавить
                        </a></li>
                        <li><a class="dropdown-item" href="#">
                            <i class="bi bi-list-ul"></i> Список
                        </a></li>
                    </ul>
                </li>

                <!-- Админка -->
                <li class="nav-item">
                    <a class="nav-link" href="/admin/">
                        <i class="bi bi-gear"></i> Админка
                    </a>
                </li>

                <!-- Пользователь -->
                <li class="nav-item">
                    <span class="nav-link">
                        <i class="bi bi-person-circle"></i> {{ user.username }}
                    </span>
                </li>
            </ul>
        </div>
    </div>
</nav>
```

---

## Шаг 5: Применение стилей к контенту

### 5.1. Добавьте контейнер для основного контента

```html
<main class="container my-4">
    {% block content %}{% endblock %}
</main>
```

### 5.2. Используйте готовые компоненты

#### Заголовок страницы с градиентом

```html
{% block content %}
<div class="page-header">
    <h1>Заголовок страницы</h1>
    <p class="mb-0">Описание страницы</p>
</div>

<!-- Ваш контент -->
{% endblock %}
```

#### Карточки

```html
<div class="card">
    <div class="card-header bg-primary">
        <i class="bi bi-star"></i> Заголовок
    </div>
    <div class="card-body">
        <p>Содержимое карточки</p>
    </div>
</div>
```

#### Кнопки

```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-success">Success</button>
<button class="btn btn-info">Info</button>
```

#### Формы

```html
<form>
    <div class="mb-3">
        <label for="inputField" class="form-label">Поле ввода</label>
        <input type="text" class="form-control" id="inputField">
    </div>
    <button type="submit" class="btn btn-primary">Отправить</button>
</form>
```

#### Таблицы

```html
<table class="table table-striped table-hover">
    <thead>
        <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Статус</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>1</td>
            <td>Элемент 1</td>
            <td><span class="badge bg-success">Активен</span></td>
        </tr>
    </tbody>
</table>
```

---

## Шаг 6: Сбор статики (для продакшена)

Когда всё готово, соберите статические файлы:

```bash
python manage.py collectstatic
```

---

## Шаг 7: Проверка результата

1. Запустите сервер разработки:

```bash
python manage.py runserver
```

2. Откройте браузер: `http://127.0.0.1:8000/`

3. Проверьте:
   - ✅ Навигация имеет темно-зеленый фон
   - ✅ Все элементы БЕЗ закруглений
   - ✅ Кнопки имеют зеленые и бежевые цвета
   - ✅ Карточки и формы выглядят стильно

---

## Кастомизация цветовой схемы

Если хотите изменить цвета, откройте `fonon-styles.css` и измените переменные в разделе `:root`:

```css
:root {
    /* Основные цвета - ИЗМЕНИТЕ ЗДЕСЬ */
    --light-beige: #F2EAE4;      /* Светлый бежевый */
    --dusty-green: #5E8579;      /* Пыльно-зеленый */
    --dark-green: #1A4331;       /* Темно-зеленый (основной) */
    --mid-green: #397D54;        /* Средне-зеленый */
    --mustard: #D8973C;          /* Горчичный (вторичный) */
    --peach-beige: #F5DCC4;      /* Персиково-бежевый */
}
```

После изменения цветов перезагрузите страницу (Ctrl+F5).

---

## Полезные классы

### Карточки статистики

```html
<div class="card stats-card">
    <div class="card-body">
        <h6 class="text-muted">Заголовок</h6>
        <h3 class="mb-0">1,234</h3>
        <small class="text-success">
            <i class="bi bi-arrow-up"></i> 12.5%
        </small>
    </div>
</div>
```

**Варианты:** `stats-card`, `stats-card success`, `stats-card info`, `stats-card warning`

### Разделитель секций

```html
<div class="section-divider"></div>
```

### Цветные иконки

```html
<i class="bi bi-star icon-primary"></i>
<i class="bi bi-check icon-success"></i>
<i class="bi bi-info icon-info"></i>
```

### Sidebar (боковая панель)

```html
<div class="sidebar">
    <!-- Содержимое сайдбара -->
</div>
```

---

## Troubleshooting (Решение проблем)

### Проблема: Стили не применяются

**Решение:**
1. Проверьте, что `{% load static %}` есть в начале шаблона
2. Проверьте путь к CSS: `{% static 'css/fonon-styles.css' %}`
3. Откройте инспектор браузера (F12) → Network → проверьте, загружается ли файл
4. Попробуйте Ctrl+F5 (жесткая перезагрузка)

### Проблема: Иконки не отображаются

**Решение:**
Убедитесь, что Bootstrap Icons подключены:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
```

### Проблема: Dropdown меню не работает

**Решение:**
Убедитесь, что Bootstrap JavaScript подключен:

```html
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
```

### Проблема: Закругления всё равно видны

**Решение:**
Убедитесь, что `fonon-styles.css` подключен ПОСЛЕ Bootstrap CSS:

```html
<!-- Сначала Bootstrap -->
<link href=".../bootstrap.min.css" rel="stylesheet">

<!-- ПОТОМ Fonon styles -->
<link rel="stylesheet" href="{% static 'css/fonon-styles.css' %}">
```

---

## Дополнительные возможности

### Google Translate Widget (опционально)

Если хотите добавить переключатель языков:

1. В навигацию добавьте:

```html
<li class="nav-item">
    <div id="google_translate_element" class="nav-link"></div>
</li>
```

2. Перед `</body>` добавьте:

```html
<script type="text/javascript">
    function googleTranslateElementInit() {
        new google.translate.TranslateElement({
            pageLanguage: 'ru',
            includedLanguages: 'ru,en,uz',
            layout: google.translate.TranslateElement.InlineLayout.HORIZONTAL
        }, 'google_translate_element');
    }
</script>
<script type="text/javascript" src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>

<style>
    /* Скрываем баннер Google Translate */
    body > .skiptranslate { display: none !important; }
    .goog-te-banner-frame.skiptranslate { display: none !important; }
    iframe.goog-te-banner-frame { display: none !important; }
    body { top: 0 !important; }

    /* Только dropdown */
    .goog-te-gadget span,
    .goog-te-gadget a,
    .goog-te-gadget img { display: none !important; }
    .goog-te-gadget { font-size: 0 !important; }
</style>
```

---

## Примеры использования

Откройте файл `example-components.html` в браузере, чтобы увидеть все доступные компоненты.

Или создайте URL в Django:

```python
# urls.py
from django.urls import path
from django.views.generic import TemplateView

urlpatterns = [
    path('examples/', TemplateView.as_view(template_name='your_app/example-components.html'), name='examples'),
]
```

---

## Структура финального проекта

После внедрения структура должна выглядеть так:

```
your_django_project/
├── your_app/
│   ├── static/
│   │   └── css/
│   │       └── fonon-styles.css         # ✅ Скопирован
│   ├── templates/
│   │   └── your_app/
│   │       ├── base.html                # ✅ Обновлен
│   │       ├── example-components.html  # ✅ Для справки
│   │       └── ... (ваши шаблоны)
│   ├── views.py
│   └── ...
└── manage.py
```

---

## Поддержка

Если возникли вопросы:

1. Проверьте раздел [Troubleshooting](#troubleshooting-решение-проблем)
2. Откройте `example-components.html` для примеров
3. Изучите оригинальный `base-template-example.html`

---

## Changelog

**Версия 1.0**
- Первый релиз Fonon Design System
- Полная совместимость с Bootstrap 5.3
- 646 строк CSS кода
- Поддержка всех Bootstrap компонентов
- Готовая цветовая схема
- Responsive дизайн

---

## Лицензия

Свободное использование в личных и коммерческих проектах.

---

**Успешного внедрения! 🚀**
