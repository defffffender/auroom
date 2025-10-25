# ⚡ Fonon Design System - Быстрый старт

## 🎯 Цель: За 5 минут превратить голый Bootstrap в стильный проект

---

## Шаг 1: Копируем файл (30 секунд)

```bash
# Скопируйте fonon-styles.css в вашу папку static
cp fonon-styles.css your_app/static/css/
```

---

## Шаг 2: Обновляем base.html (2 минуты)

### В `<head>` добавьте:

```html
<!-- Bootstrap CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- Bootstrap Icons -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">

<!-- Fonon Styles (ПОСЛЕ Bootstrap!) -->
{% load static %}
<link rel="stylesheet" href="{% static 'css/fonon-styles.css' %}">
```

### Перед `</body>` добавьте:

```html
<!-- Bootstrap JavaScript -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
```

---

## Шаг 3: Навигация (2 минуты)

Замените вашу навигацию на:

```html
<nav class="navbar navbar-expand-lg navbar-dark">
    <div class="container">
        <a class="navbar-brand" href="/">
            <i class="bi bi-app"></i> Ваш Проект
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav ms-auto">
                <li class="nav-item">
                    <a class="nav-link" href="/admin/">
                        <i class="bi bi-gear"></i> Админка
                    </a>
                </li>
            </ul>
        </div>
    </div>
</nav>
```

---

## Шаг 4: Контейнер (30 секунд)

Оберните контент в контейнер:

```html
<main class="container my-4">
    {% block content %}{% endblock %}
</main>
```

---

## ✅ Готово!

Запустите сервер и проверьте:

```bash
python manage.py runserver
```

Откройте `http://127.0.0.1:8000/`

Вы должны увидеть:
- ✅ Темно-зеленый navbar
- ✅ БЕЗ закруглений
- ✅ Бежевый фон
- ✅ Стильные кнопки

---

## 🎨 Основные компоненты

### Кнопки

```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-success">Success</button>
```

### Карточка

```html
<div class="card">
    <div class="card-header bg-primary">Заголовок</div>
    <div class="card-body">Контент</div>
</div>
```

### Заголовок страницы

```html
<div class="page-header">
    <h1>Моя страница</h1>
</div>
```

### Таблица

```html
<table class="table table-striped table-hover">
    <thead>
        <tr><th>Колонка</th></tr>
    </thead>
    <tbody>
        <tr><td>Данные</td></tr>
    </tbody>
</table>
```

---

## 🔧 Если что-то не работает

### Стили не применились?

```html
<!-- Проверьте порядок: СНАЧАЛА Bootstrap, ПОТОМ Fonon -->
<link href=".../bootstrap.min.css" rel="stylesheet">
<link rel="stylesheet" href="{% static 'css/fonon-styles.css' %}">
```

### Dropdown не открывается?

```html
<!-- Проверьте, что JS подключен -->
<script src=".../bootstrap.bundle.min.js"></script>
```

### Иконки не отображаются?

```html
<!-- Проверьте Bootstrap Icons -->
<link rel="stylesheet" href=".../bootstrap-icons.css">
```

---

## 📚 Подробная документация

- **README.md** - обзор пакета
- **INSTALLATION_GUIDE.md** - полная инструкция
- **example-components.html** - все компоненты

---

**Готово! Теперь ваш проект выглядит профессионально! 🚀**
