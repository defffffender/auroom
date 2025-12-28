# Инструкция по интеграции выдвижной пагинации

## Для разных платформ

### Django

**1. Скопируйте файлы:**
```
static/css/pagination-toggle.css
static/js/pagination-toggle.js
```

**2. В шаблоне подключите:**
```django
{% load static %}

{% block extra_css %}
<link rel="stylesheet" href="{% static 'css/pagination-toggle.css' %}">
{% endblock %}

{% block extra_js %}
<script src="{% static 'js/pagination-toggle.js' %}"></script>
{% endblock %}
```

**3. Добавьте HTML перед `</body>`:**
```django
<!-- Кнопка -->
<button id="paginationToggle" title="{% trans 'Показать/скрыть страницы' %}">
    <i class="bi bi-chevron-left"></i>
</button>

<!-- Панель -->
<div id="stickyPagination">
    <div class="pagination-header">{% trans 'Страница' %}</div>

    <button class="nav-btn" onclick="goToPage({{ page_obj.previous_page_number }})"
            {% if not page_obj.has_previous %}disabled{% endif %}>
        <i class="bi bi-chevron-up"></i>
    </button>

    <div class="current-page">
        {{ page_obj.number }} / {{ page_obj.paginator.num_pages }}
    </div>

    <button class="nav-btn" onclick="goToPage({{ page_obj.next_page_number }})"
            {% if not page_obj.has_next %}disabled{% endif %}>
        <i class="bi bi-chevron-down"></i>
    </button>
</div>

<script>
function goToPage(pageNum) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', pageNum);
    window.location.href = url.toString();
}
</script>
```

---

### Laravel/PHP

**1. В blade шаблоне:**
```php
<!-- CSS -->
<link rel="stylesheet" href="{{ asset('css/pagination-toggle.css') }}">

<!-- HTML -->
<button id="paginationToggle" title="Показать/скрыть страницы">
    <i class="bi bi-chevron-left"></i>
</button>

<div id="stickyPagination">
    <div class="pagination-header">Страница</div>

    <button class="nav-btn" onclick="goToPage({{ $items->currentPage() - 1 }})"
            @if(!$items->onFirstPage()) @else disabled @endif>
        <i class="bi bi-chevron-up"></i>
    </button>

    <div class="current-page">
        {{ $items->currentPage() }} / {{ $items->lastPage() }}
    </div>

    <button class="nav-btn" onclick="goToPage({{ $items->currentPage() + 1 }})"
            @if($items->hasMorePages()) @else disabled @endif>
        <i class="bi bi-chevron-down"></i>
    </button>
</div>

<!-- JavaScript -->
<script src="{{ asset('js/pagination-toggle.js') }}"></script>

<script>
function goToPage(pageNum) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', pageNum);
    window.location.href = url.toString();
}
</script>
```

---

### React

**1. Создайте компонент `PaginationToggle.jsx`:**
```jsx
import React, { useEffect, useRef } from 'react';
import './pagination-toggle.css';

export default function PaginationToggle({ currentPage, totalPages, onPageChange }) {
    const toggleBtnRef = useRef(null);
    const paginationRef = useRef(null);

    useEffect(() => {
        // Скопируйте логику из pagination-toggle.js
        // Или используйте хук usePaginationToggle()
    }, []);

    const goToPage = (pageNum) => {
        if (pageNum >= 1 && pageNum <= totalPages) {
            onPageChange(pageNum);
        }
    };

    return (
        <>
            <button ref={toggleBtnRef} id="paginationToggle" title="Показать/скрыть страницы">
                <i className="bi bi-chevron-left"></i>
            </button>

            <div ref={paginationRef} id="stickyPagination">
                <div className="pagination-header">Страница</div>

                <button
                    className="nav-btn"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <i className="bi bi-chevron-up"></i>
                </button>

                <div className="current-page">
                    {currentPage} / {totalPages}
                </div>

                <button
                    className="nav-btn"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <i className="bi bi-chevron-down"></i>
                </button>
            </div>
        </>
    );
}
```

**2. Используйте:**
```jsx
import PaginationToggle from './components/PaginationToggle';

function App() {
    const [currentPage, setCurrentPage] = useState(1);

    return (
        <div>
            {/* Контент */}
            <PaginationToggle
                currentPage={currentPage}
                totalPages={10}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
```

---

### Vue.js

**1. Создайте компонент `PaginationToggle.vue`:**
```vue
<template>
    <div>
        <button ref="toggleBtn" id="paginationToggle" title="Показать/скрыть страницы">
            <i class="bi bi-chevron-left"></i>
        </button>

        <div ref="pagination" id="stickyPagination">
            <div class="pagination-header">Страница</div>

            <button
                class="nav-btn"
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
            >
                <i class="bi bi-chevron-up"></i>
            </button>

            <div class="current-page">
                {{ currentPage }} / {{ totalPages }}
            </div>

            <button
                class="nav-btn"
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
            >
                <i class="bi bi-chevron-down"></i>
            </button>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        currentPage: Number,
        totalPages: Number
    },
    mounted() {
        // Инициализируйте логику из pagination-toggle.js
    },
    methods: {
        goToPage(pageNum) {
            if (pageNum >= 1 && pageNum <= this.totalPages) {
                this.$emit('page-change', pageNum);
            }
        }
    }
}
</script>

<style src="./pagination-toggle.css"></style>
```

---

### WordPress

**1. В `functions.php`:**
```php
function enqueue_pagination_toggle() {
    wp_enqueue_style(
        'pagination-toggle',
        get_template_directory_uri() . '/css/pagination-toggle.css'
    );

    wp_enqueue_script(
        'pagination-toggle',
        get_template_directory_uri() . '/js/pagination-toggle.js',
        array(),
        '1.0.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'enqueue_pagination_toggle');
```

**2. В шаблоне (например, `archive.php`):**
```php
<?php
global $wp_query;
$current_page = max(1, get_query_var('paged'));
$total_pages = $wp_query->max_num_pages;
?>

<button id="paginationToggle" title="Показать/скрыть страницы">
    <i class="bi bi-chevron-left"></i>
</button>

<div id="stickyPagination">
    <div class="pagination-header">Страница</div>

    <button class="nav-btn" onclick="goToPage(<?php echo $current_page - 1; ?>)"
            <?php if ($current_page <= 1) echo 'disabled'; ?>>
        <i class="bi bi-chevron-up"></i>
    </button>

    <div class="current-page">
        <?php echo $current_page; ?> / <?php echo $total_pages; ?>
    </div>

    <button class="nav-btn" onclick="goToPage(<?php echo $current_page + 1; ?>)"
            <?php if ($current_page >= $total_pages) echo 'disabled'; ?>>
        <i class="bi bi-chevron-down"></i>
    </button>
</div>

<script>
function goToPage(pageNum) {
    const baseUrl = '<?php echo get_pagenum_link(1); ?>'.replace(/\/page\/\d+\/?/, '/');
    window.location.href = baseUrl + 'page/' + pageNum + '/';
}
</script>
```

---

### Чистый HTML/JavaScript

**1. Подключите файлы:**
```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="css/pagination-toggle.css">
</head>
<body>
    <!-- Контент -->

    <!-- Пагинация -->
    <button id="paginationToggle">
        <i class="bi bi-chevron-left"></i>
    </button>

    <div id="stickyPagination">
        <div class="pagination-header">Страница</div>

        <button class="nav-btn" id="prevBtn">
            <i class="bi bi-chevron-up"></i>
        </button>

        <div class="current-page">
            <span id="currentPage">1</span> / <span id="totalPages">10</span>
        </div>

        <button class="nav-btn" id="nextBtn">
            <i class="bi bi-chevron-down"></i>
        </button>
    </div>

    <script src="js/pagination-toggle.js"></script>
    <script>
        let currentPage = 1;
        const totalPages = 10;

        function goToPage(pageNum) {
            if (pageNum < 1 || pageNum > totalPages) return;

            currentPage = pageNum;
            document.getElementById('currentPage').textContent = currentPage;

            document.getElementById('prevBtn').disabled = currentPage === 1;
            document.getElementById('nextBtn').disabled = currentPage === totalPages;

            // Загрузка данных страницы...
        }

        document.getElementById('prevBtn').addEventListener('click', () => {
            goToPage(currentPage - 1);
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            goToPage(currentPage + 1);
        });
    </script>
</body>
</html>
```

---

## Общие замечания

### Обязательные зависимости

1. **Bootstrap Icons** (или другая иконочная библиотека)
   ```html
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
   ```

2. **Элементы с ID**:
   - `paginationToggle` - кнопка переключения
   - `stickyPagination` - панель пагинации

### Порядок загрузки

```html
<!-- 1. CSS в <head> -->
<link rel="stylesheet" href="pagination-toggle.css">

<!-- 2. HTML перед </body> -->
<button id="paginationToggle">...</button>
<div id="stickyPagination">...</div>

<!-- 3. JavaScript после HTML -->
<script src="pagination-toggle.js"></script>
```

### Настройка темной темы

Добавьте класс `.dark` к `<html>` или `<body>`:

```html
<html class="dark">
```

Или через JavaScript:
```javascript
document.documentElement.classList.add('dark');
```

---

## Проверка работы

1. Откройте страницу
2. Скроллите вниз → панель появится
3. Остановите скролл → панель исчезнет через 1.5 сек
4. Нажмите кнопку справа → панель откроется
5. Не трогайте 3 сек → панель закроется
6. Наведите курсор → автозакрытие остановится

---

## Отладка

### Включите консольные логи

В `pagination-toggle.js` уже есть `console.log()` для отладки.

Откройте DevTools (F12) → вкладка Console:
- `PaginationToggle: Initialized successfully` - загрузился
- `PaginationToggle: Opened manually` - открыта вручную
- `PaginationToggle: Auto-hidden after scroll stop` - скрыта после скролла
- И т.д.

### Проверьте элементы

В DevTools → Elements найдите:
- `#paginationToggle` - должен существовать
- `#stickyPagination` - должен существовать
- Проверьте классы `.visible`, `.auto-visible`

---

## Удаление/Отключение

### Временное отключение

Закомментируйте подключение JS:
```html
<!-- <script src="pagination-toggle.js"></script> -->
```

### Полное удаление

1. Удалите HTML разметку
2. Удалите подключение CSS
3. Удалите подключение JS
4. Удалите файлы из проекта
