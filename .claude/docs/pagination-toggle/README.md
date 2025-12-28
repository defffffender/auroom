# Выдвижная пагинация с автопоказом при скролле

## Быстрый старт

### 1. Подключите файлы

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Bootstrap Icons (или любая другая иконочная библиотека) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">

    <!-- CSS пагинации -->
    <link rel="stylesheet" href="pagination-toggle.css">
</head>
<body>
    <!-- Ваш контент -->

    <!-- HTML разметка пагинации (скопируйте из pagination-toggle.html) -->

    <!-- JavaScript пагинации -->
    <script src="pagination-toggle.js"></script>
</body>
</html>
```

### 2. Скопируйте HTML разметку

Из файла `pagination-toggle.html` скопируйте код и вставьте перед закрывающим `</body>`.

### 3. Настройте переменные

Замените Django-переменные на ваши:

```javascript
// Django шаблон:
{{ page_obj.number }}

// Чистый JavaScript:
currentPage

// PHP:
<?php echo $page; ?>

// И т.д.
```

## Структура файлов

```
pagination-toggle/
├── README.md                  # Этот файл
├── pagination-toggle.html     # HTML разметка (готова к копированию)
├── pagination-toggle.css      # CSS стили (готовы к копированию)
├── pagination-toggle.js       # JavaScript логика (готова к копированию)
└── example.html              # Полный пример интеграции
```

## Принцип работы

### Автопоказ при скролле

```
1. Пользователь скроллит → панель появляется
2. Скролл останавливается → таймер 1.5 сек
3. Панель автоматически скрывается
```

### Ручное открытие

```
1. Клик на кнопку → панель открывается
2. Нет активности 3 сек → панель закрывается
3. Наведение курсора → таймер останавливается
4. Курсор ушел → таймер возобновляется
```

## Кастомизация

### Изменить время задержек

В файле `pagination-toggle.js`:

```javascript
// Строка ~222 - задержка после остановки скролла
}, 1500);  // ← Измените здесь (миллисекунды)

// Строка ~308 - задержка при неактивности
}, 3000);  // ← Измените здесь (миллисекунды)
```

### Изменить позицию панели

В файле `pagination-toggle.css`:

```css
/* Скрытое состояние */
#stickyPagination {
    right: -160px;  /* ← Начальная позиция */
}

/* Видимое состояние */
#stickyPagination.visible,
#stickyPagination.auto-visible {
    right: 20px;  /* ← Позиция на экране */
}
```

### Изменить цвета

```css
/* Светлая тема */
#paginationToggle {
    background: white;        /* ← Цвет фона */
    border-color: #e5e7eb;    /* ← Цвет границы */
}

/* Темная тема */
.dark #paginationToggle {
    background: rgb(31 41 55);  /* ← Цвет фона */
}
```

## Требования

- Bootstrap Icons или аналог для иконок
- ES6+ поддержка (классы, стрелочные функции)
- CSS transitions

## Совместимость

✅ Chrome 60+
✅ Firefox 55+
✅ Safari 11+
✅ Edge 79+
✅ Мобильные браузеры

## Поддержка темной темы

Автоматическая! Просто добавьте класс `.dark` к `<html>` или `<body>`:

```html
<html class="dark">
```

## Без темной темы?

Удалите все блоки `.dark` из CSS файла.

## Дополнительная документация

Полная документация с диаграммами: `../pagination-toggle-feature.md`

## Лицензия

Свободное использование
