# Функционал скрываемой пагинации с автоматическим появлением

## Описание

Это функционал для создания выдвижной панели пагинации, которая:
- По умолчанию скрыта за правым краем экрана
- Имеет кнопку-переключатель у правого края
- Автоматически появляется при скролле страницы
- Автоматически скрывается через 3 секунды после остановки скролла
- Автоматически скрывается через 3 секунды после открытия вручную (если нет активности)
- Остается видимой при наведении курсора мыши
- Кнопка-переключатель исчезает когда панель видима

## Структура файлов

Функционал состоит из трех частей:
1. **HTML разметка** - кнопка переключения и панель пагинации
2. **CSS стили** - оформление и анимации
3. **JavaScript логика** - обработка событий и таймеров

---

## 1. HTML разметка

Добавьте в ваш шаблон (обычно в конец страницы, перед закрывающим `</body>`):

```html
<!-- Кнопка-переключатель пагинации (у правого края экрана) -->
<button id="paginationToggle" title="Показать/скрыть страницы">
    <i class="bi bi-chevron-left"></i>
</button>

<!-- Липкая панель пагинации (скрыта по умолчанию) -->
<div id="stickyPagination">
    <div class="pagination-header">Страница</div>

    <!-- Кнопка "Предыдущая" -->
    <button class="nav-btn" id="prevPageBtn" onclick="goToPage({{ page_obj.previous_page_number }})"
            {% if not page_obj.has_previous %}disabled{% endif %}>
        <i class="bi bi-chevron-up"></i>
    </button>

    <!-- Текущая страница -->
    <div class="current-page">
        {{ page_obj.number }} / {{ page_obj.paginator.num_pages }}
    </div>

    <!-- Номера страниц (опционально, можно добавить кнопки для конкретных страниц) -->
    <div id="paginationNumbers"></div>

    <!-- Кнопка "Следующая" -->
    <button class="nav-btn" id="nextPageBtn" onclick="goToPage({{ page_obj.next_page_number }})"
            {% if not page_obj.has_next %}disabled{% endif %}>
        <i class="bi bi-chevron-down"></i>
    </button>
</div>

<!-- Функция перехода на страницу -->
<script>
function goToPage(pageNum) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', pageNum);
    window.location.href = url.toString();
}
</script>
```

**Примечания:**
- Используются иконки Bootstrap Icons (`bi bi-chevron-left`, `bi bi-chevron-up` и т.д.)
- Можно заменить на любую другую иконочную библиотеку
- `page_obj` - это объект пагинации Django, замените на ваш контекст

---

## 2. CSS стили

Создайте файл `pagination-toggle.css` или добавьте в ваш основной CSS:

```css
/* ==========================================
   КНОПКА-ПЕРЕКЛЮЧАТЕЛЬ ПАГИНАЦИИ
   ========================================== */

#paginationToggle {
    position: fixed;
    top: 50%;                      /* По центру вертикально */
    right: 0;                      /* Прижата к правому краю */
    transform: translateY(-50%);   /* Центрирование */
    z-index: 41;                   /* Выше панели пагинации */

    /* Оформление */
    background: white;
    border: 1px solid #e5e7eb;
    border-right: none;            /* Убираем правую границу */
    border-radius: 12px 0 0 12px;  /* Скругление только слева */
    padding: 12px 8px;
    cursor: pointer;
    box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.1);

    /* Анимация */
    transition: all 0.3s ease;

    /* Размеры */
    width: 40px;
    height: 50px;

    /* Flexbox для центрирования иконки */
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Темная тема для кнопки */
.dark #paginationToggle {
    background: rgb(31 41 55);
    border-color: rgb(75 85 99);
    color: white;
}

/* Hover эффект */
#paginationToggle:hover {
    background: #f3f4f6;
    width: 45px;  /* Немного расширяется */
}

.dark #paginationToggle:hover {
    background: rgb(55 65 81);
}

/* Иконка внутри кнопки */
#paginationToggle i {
    font-size: 1.25rem;
    transition: transform 0.3s ease;
}

/* Поворот иконки когда панель открыта */
#paginationToggle.open i {
    transform: rotate(180deg);
}

/* ==========================================
   ПАНЕЛЬ ПАГИНАЦИИ
   ========================================== */

#stickyPagination {
    position: fixed;
    top: 50%;
    right: -160px;                 /* СКРЫТА ПО УМОЛЧАНИЮ (за правым краем) */
    transform: translateY(-50%);
    z-index: 40;                   /* Ниже кнопки переключателя */

    /* Оформление */
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    min-width: 120px;

    /* Анимация появления/скрытия */
    transition: right 0.3s ease, opacity 0.3s ease;
    opacity: 0;  /* Невидима по умолчанию */
}

/* ВИДИМОЕ СОСТОЯНИЕ - когда панель должна быть видна */
#stickyPagination.visible,
#stickyPagination.auto-visible {
    right: 20px;   /* Сдвигается на экран */
    opacity: 1;    /* Становится видимой */
}

/* Темная тема для панели */
.dark #stickyPagination {
    background: rgb(31 41 55);
    border-color: rgb(75 85 99);
}

/* Hover эффект для панели */
#stickyPagination:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* ==========================================
   ВНУТРЕННИЕ ЭЛЕМЕНТЫ ПАНЕЛИ
   ========================================== */

/* Заголовок "Страница" */
#stickyPagination .pagination-header {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 0.5rem;
    text-align: center;
}

.dark #stickyPagination .pagination-header {
    color: rgb(156 163 175);
}

/* Кнопки навигации (Вперед/Назад) */
#stickyPagination .nav-btn {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
}

.dark #stickyPagination .nav-btn {
    background: rgb(55 65 81);
    border-color: rgb(75 85 99);
    color: white;
}

/* Hover для кнопок */
#stickyPagination .nav-btn:hover:not(:disabled) {
    background: #e5e7eb;
    transform: translateY(-1px);
}

.dark #stickyPagination .nav-btn:hover:not(:disabled) {
    background: rgb(75 85 99);
}

/* Заблокированные кнопки */
#stickyPagination .nav-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Текущая страница */
#stickyPagination .current-page {
    font-size: 1rem;
    font-weight: 700;
    text-align: center;
    padding: 0.5rem;
    margin: 0.5rem 0;
}

/* ==========================================
   АДАПТИВНОСТЬ
   ========================================== */

/* Планшеты (до 768px) */
@media (max-width: 768px) {
    #paginationToggle {
        width: 36px;
        height: 48px;
    }

    #stickyPagination {
        right: -140px;  /* Скрыта немного меньше */
        padding: 0.75rem;
        min-width: 100px;
        font-size: 0.875rem;
    }

    #stickyPagination.visible,
    #stickyPagination.auto-visible {
        right: 10px;  /* Ближе к краю */
    }

    #stickyPagination .nav-btn {
        min-height: 44px;  /* Touch-friendly размер */
        font-size: 1rem;
    }
}

/* Мобильные (до 480px) */
@media (max-width: 480px) {
    #paginationToggle {
        width: 32px;
        height: 44px;
        padding: 8px 6px;
    }

    #paginationToggle i {
        font-size: 1rem;
    }

    #stickyPagination {
        right: -100px;
        padding: 0.5rem;
        min-width: 80px;
        font-size: 0.75rem;
        max-width: 90px;
    }

    #stickyPagination.visible,
    #stickyPagination.auto-visible {
        right: 5px;
    }

    #stickyPagination .pagination-header {
        font-size: 0.65rem;
        margin-bottom: 0.25rem;
    }

    #stickyPagination .current-page {
        font-size: 0.75rem;
        padding: 0.25rem;
        margin: 0.25rem 0;
    }

    #stickyPagination .nav-btn {
        min-height: 40px;
        padding: 0.4rem;
        margin-bottom: 0.25rem;
        font-size: 0.875rem;
    }
}
```

---

## 3. JavaScript логика

Создайте файл `pagination-toggle.js` или добавьте в ваш основной JS:

```javascript
/**
 * ФУНКЦИОНАЛ ВЫДВИЖНОЙ ПАГИНАЦИИ
 *
 * Механика работы:
 *
 * 1. ИНИЦИАЛИЗАЦИЯ:
 *    - Панель пагинации скрыта (right: -160px, opacity: 0)
 *    - Кнопка-переключатель видима у правого края
 *
 * 2. АВТОМАТИЧЕСКОЕ ПОЯВЛЕНИЕ ПРИ СКРОЛЛЕ:
 *    - При скролле страницы вызывается handleScroll()
 *    - Устанавливается флаг isScrolling = true
 *    - Панель получает класс 'auto-visible' и становится видимой
 *    - Кнопка-переключатель скрывается (opacity: 0)
 *    - Запускается таймер автоскрытия (1.5 сек)
 *
 * 3. АВТОСКРЫТИЕ ПОСЛЕ ОСТАНОВКИ СКРОЛЛА:
 *    - Через 1.5 сек после остановки скролла срабатывает hideTimeout
 *    - Если панель не была открыта вручную, она скрывается
 *    - Класс 'auto-visible' удаляется
 *    - Кнопка-переключатель появляется снова
 *
 * 4. РУЧНОЕ ОТКРЫТИЕ/ЗАКРЫТИЕ:
 *    - Клик по кнопке-переключателю добавляет класс 'visible'
 *    - Устанавливается флаг isManuallyOpen = true
 *    - Запускается таймер неактивности (3 сек)
 *
 * 5. ТАЙМЕР НЕАКТИВНОСТИ:
 *    - Если панель открыта вручную или автоматически
 *    - И пользователь не взаимодействует с ней 3 секунды
 *    - Панель автоматически закрывается
 *
 * 6. ПРЕДОТВРАЩЕНИЕ АВТОЗАКРЫТИЯ:
 *    - При наведении курсора (mouseenter) таймеры сбрасываются
 *    - При уходе курсора (mouseleave) таймеры запускаются заново
 *    - При клике внутри панели таймер неактивности перезапускается
 *
 * 7. СБРОС ТАЙМЕРА ПРИ СКРОЛЛЕ:
 *    - Если панель открыта и пользователь скроллит
 *    - Таймер неактивности перезапускается
 *    - Панель остается видимой еще 3 секунды
 */

class PaginationToggle {
    constructor() {
        // DOM элементы
        this.toggleBtn = document.getElementById('paginationToggle');
        this.pagination = document.getElementById('stickyPagination');

        // Состояние
        this.isManuallyOpen = false;  // Открыта ли панель вручную (кликом)
        this.isScrolling = false;     // Происходит ли сейчас скролл

        // Таймеры
        this.hideTimeout = null;       // Таймер автоскрытия после остановки скролла
        this.inactivityTimeout = null; // Таймер автоскрытия при неактивности

        // Инициализация
        this.init();
    }

    init() {
        if (!this.toggleBtn || !this.pagination) {
            console.warn('Pagination toggle elements not found');
            return;
        }

        // Обработчик клика по кнопке-переключателю
        this.toggleBtn.addEventListener('click', () => this.togglePagination());

        // Обработчик скролла страницы
        window.addEventListener('scroll', () => this.handleScroll());

        // Обработчики для предотвращения автозакрытия при наведении
        this.pagination.addEventListener('mouseenter', () => this.pauseTimers());
        this.pagination.addEventListener('mouseleave', () => this.resumeTimers());

        // Обработчик кликов внутри панели (сброс таймера неактивности)
        this.pagination.addEventListener('click', () => this.resetInactivityTimer());
    }

    /**
     * ПЕРЕКЛЮЧЕНИЕ ПАНЕЛИ ПО КЛИКУ НА КНОПКУ
     */
    togglePagination() {
        this.isManuallyOpen = !this.isManuallyOpen;

        if (this.isManuallyOpen) {
            // ОТКРЫВАЕМ панель
            this.pagination.classList.add('visible');
            this.toggleBtn.classList.add('open');
            this.updateToggleButtonVisibility();
            this.resetInactivityTimer();
        } else {
            // ЗАКРЫВАЕМ панель
            this.closePagination();
        }
    }

    /**
     * ОБРАБОТЧИК СКРОЛЛА СТРАНИЦЫ
     */
    handleScroll() {
        this.isScrolling = true;

        // Показываем панель при скролле
        this.pagination.classList.add('auto-visible');
        this.updateToggleButtonVisibility();

        // Сбрасываем таймер автоскрытия
        clearTimeout(this.hideTimeout);

        // Запускаем новый таймер автоскрытия (1.5 сек после остановки скролла)
        this.hideTimeout = setTimeout(() => {
            this.isScrolling = false;

            // Закрываем только если не открыта вручную
            if (!this.isManuallyOpen) {
                this.pagination.classList.remove('auto-visible');
                this.updateToggleButtonVisibility();
            }
        }, 1500);

        // Если панель открыта (вручную или автоматически), перезапускаем таймер неактивности
        this.resetInactivityTimer();
    }

    /**
     * ЗАКРЫТИЕ ПАНЕЛИ
     */
    closePagination() {
        this.isManuallyOpen = false;
        this.pagination.classList.remove('visible');
        this.pagination.classList.remove('auto-visible');
        this.toggleBtn.classList.remove('open');
        this.updateToggleButtonVisibility();
        this.clearTimers();
    }

    /**
     * ОБНОВЛЕНИЕ ВИДИМОСТИ КНОПКИ-ПЕРЕКЛЮЧАТЕЛЯ
     * Кнопка скрывается когда панель видима
     */
    updateToggleButtonVisibility() {
        const isPaginationVisible =
            this.pagination.classList.contains('visible') ||
            this.pagination.classList.contains('auto-visible');

        if (isPaginationVisible) {
            // Панель видима → скрываем кнопку
            this.toggleBtn.style.opacity = '0';
            this.toggleBtn.style.pointerEvents = 'none';
        } else {
            // Панель скрыта → показываем кнопку
            this.toggleBtn.style.opacity = '1';
            this.toggleBtn.style.pointerEvents = 'auto';
        }
    }

    /**
     * СБРОС ТАЙМЕРА НЕАКТИВНОСТИ
     * Вызывается при любой активности пользователя
     */
    resetInactivityTimer() {
        clearTimeout(this.inactivityTimeout);

        // Если панель открыта или происходит скролл
        if (this.isManuallyOpen || this.isScrolling) {
            // Запускаем таймер на 3 секунды
            this.inactivityTimeout = setTimeout(() => {
                this.closePagination();
            }, 3000);
        }
    }

    /**
     * ПАУЗА ВСЕХ ТАЙМЕРОВ
     * Вызывается при наведении курсора на панель
     */
    pauseTimers() {
        clearTimeout(this.hideTimeout);
        clearTimeout(this.inactivityTimeout);
    }

    /**
     * ВОЗОБНОВЛЕНИЕ ТАЙМЕРОВ
     * Вызывается при уходе курсора с панели
     */
    resumeTimers() {
        this.resetInactivityTimer();
    }

    /**
     * ОЧИСТКА ВСЕХ ТАЙМЕРОВ
     */
    clearTimers() {
        clearTimeout(this.hideTimeout);
        clearTimeout(this.inactivityTimeout);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    new PaginationToggle();
});
```

---

## 4. Интеграция в проект

### Шаг 1: Подключение стилей

В вашем HTML шаблоне добавьте в `<head>`:

```html
<link rel="stylesheet" href="/static/css/pagination-toggle.css">
```

### Шаг 2: Подключение JavaScript

Перед закрывающим `</body>`:

```html
<script src="/static/js/pagination-toggle.js"></script>
```

### Шаг 3: Добавление HTML разметки

В ваш шаблон (обычно в конец, перед `</body>`):

```html
<!-- Кнопка переключения -->
<button id="paginationToggle" title="Показать/скрыть страницы">
    <i class="bi bi-chevron-left"></i>
</button>

<!-- Панель пагинации -->
<div id="stickyPagination">
    <!-- Ваш код пагинации -->
</div>
```

---

## 5. Настройка и кастомизация

### Изменение времени задержек

В `pagination-toggle.js` измените значения:

```javascript
// Задержка автоскрытия после остановки скролла (по умолчанию 1500 мс = 1.5 сек)
this.hideTimeout = setTimeout(() => {
    // ...
}, 1500);  // ← Измените это значение

// Задержка автоскрытия при неактивности (по умолчанию 3000 мс = 3 сек)
this.inactivityTimeout = setTimeout(() => {
    // ...
}, 3000);  // ← Измените это значение
```

### Изменение позиции панели

В `pagination-toggle.css` измените:

```css
#stickyPagination {
    right: -160px;  /* Начальная позиция (скрыта) */
}

#stickyPagination.visible,
#stickyPagination.auto-visible {
    right: 20px;  /* Видимая позиция */
}
```

### Изменение цветов

Для светлой темы:
```css
#paginationToggle {
    background: white;           /* Фон кнопки */
    border-color: #e5e7eb;       /* Цвет границы */
}

#stickyPagination {
    background: white;           /* Фон панели */
    border-color: #e5e7eb;       /* Цвет границы */
}
```

Для темной темы:
```css
.dark #paginationToggle {
    background: rgb(31 41 55);   /* Фон кнопки */
    border-color: rgb(75 85 99); /* Цвет границы */
}

.dark #stickyPagination {
    background: rgb(31 41 55);   /* Фон панели */
    border-color: rgb(75 85 99); /* Цвет границы */
}
```

---

## 6. Схема работы (диаграмма состояний)

```
┌─────────────────┐
│  Начальное      │
│  состояние      │
│  (скрыта)       │
└────────┬────────┘
         │
         ├──────── Скролл ──────────────┐
         │                              ▼
         │                    ┌─────────────────┐
         │                    │  Автопоказ      │
         │                    │  (auto-visible) │
         │                    └────────┬────────┘
         │                             │
         │                             │ 1.5 сек без скролла
         │                             ▼
         │                    ┌─────────────────┐
         │                    │  Автоскрытие    │
         │                    └─────────────────┘
         │
         ├──────── Клик на кнопку ──────┐
         │                              ▼
         │                    ┌─────────────────┐
         │                    │  Ручной показ   │
         │                    │  (visible)      │
         │                    └────────┬────────┘
         │                             │
         │                             │ 3 сек без активности
         │                             │ ИЛИ клик на кнопку
         │                             ▼
         │                    ┌─────────────────┐
         └────────────────────│  Закрытие       │
                              └─────────────────┘

┌───────────────────────────────────────────────┐
│  ПРЕРЫВАНИЕ ТАЙМЕРОВ:                         │
│  • Наведение курсора → пауза                  │
│  • Клик внутри панели → сброс таймера         │
│  • Новый скролл → сброс таймера               │
└───────────────────────────────────────────────┘
```

---

## 7. Требования

- **Bootstrap Icons** (для иконок) или любая другая иконочная библиотека
- Современный браузер с поддержкой ES6 (классы, стрелочные функции)
- CSS transitions для анимаций

---

## 8. Совместимость

✅ Chrome 60+
✅ Firefox 55+
✅ Safari 11+
✅ Edge 79+
✅ Мобильные браузеры (iOS Safari, Chrome Mobile)

---

## 9. Лицензия

Свободное использование в любых проектах.

---

## 10. Автор

Создано для проекта Auroom
Дата: 2025
