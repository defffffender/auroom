/**
 * ФУНКЦИОНАЛ ВЫДВИЖНОЙ ПАГИНАЦИИ
 *
 * @file pagination-toggle.js
 * @version 1.0.0
 * @description Управление выдвижной панелью пагинации с автоматическим появлением при скролле
 *
 * МЕХАНИКА РАБОТЫ:
 *
 * 1. ИНИЦИАЛИЗАЦИЯ:
 *    - Панель пагинации скрыта за правым краем экрана (right: -160px, opacity: 0)
 *    - Кнопка-переключатель видима у правого края экрана
 *
 * 2. АВТОМАТИЧЕСКОЕ ПОЯВЛЕНИЕ ПРИ СКРОЛЛЕ:
 *    - Пользователь начинает скроллить страницу
 *    - Вызывается handleScroll()
 *    - Устанавливается флаг isScrolling = true
 *    - Панель получает класс 'auto-visible' → становится видимой (right: 20px, opacity: 1)
 *    - Кнопка-переключатель скрывается (opacity: 0, pointer-events: none)
 *    - Запускается таймер hideTimeout на 1.5 секунды
 *
 * 3. АВТОМАТИЧЕСКОЕ СКРЫТИЕ ПОСЛЕ ОСТАНОВКИ СКРОЛЛА:
 *    - Пользователь останавливает скролл
 *    - Через 1.5 секунды срабатывает hideTimeout
 *    - Если панель НЕ была открыта вручную (isManuallyOpen = false):
 *      → Класс 'auto-visible' удаляется
 *      → Панель скрывается (right: -160px, opacity: 0)
 *      → Кнопка-переключатель появляется снова
 *
 * 4. РУЧНОЕ ОТКРЫТИЕ/ЗАКРЫТИЕ:
 *    - Пользователь кликает на кнопку-переключатель
 *    - Вызывается togglePagination()
 *    - Если закрыта: добавляется класс 'visible', isManuallyOpen = true
 *    - Если открыта: вызывается closePagination(), isManuallyOpen = false
 *    - Запускается таймер неактивности на 3 секунды
 *
 * 5. ТАЙМЕР НЕАКТИВНОСТИ (3 СЕКУНДЫ):
 *    - Если панель открыта (вручную ИЛИ автоматически)
 *    - И пользователь НЕ взаимодействует с ней 3 секунды
 *    - Вызывается closePagination() → панель закрывается
 *
 * 6. ПРЕДОТВРАЩЕНИЕ АВТОЗАКРЫТИЯ:
 *    - Пользователь наводит курсор на панель → pauseTimers()
 *      → Все таймеры (hideTimeout, inactivityTimeout) сбрасываются
 *    - Пользователь убирает курсор → resumeTimers()
 *      → Таймеры запускаются заново
 *    - Пользователь кликает внутри панели → resetInactivityTimer()
 *      → Таймер неактивности перезапускается на 3 секунды
 *
 * 7. СБРОС ТАЙМЕРА ПРИ СКРОЛЛЕ:
 *    - Если панель открыта и пользователь снова начинает скроллить
 *    - Таймер неактивности перезапускается
 *    - Панель остается видимой еще 3 секунды после остановки скролла
 *
 * СОСТОЯНИЯ ПАНЕЛИ:
 * - Скрыта: нет классов 'visible' и 'auto-visible'
 * - Открыта вручную: класс 'visible', isManuallyOpen = true
 * - Открыта автоматически: класс 'auto-visible', isScrolling = true
 *
 * ВИДИМОСТЬ КНОПКИ-ПЕРЕКЛЮЧАТЕЛЯ:
 * - Видима: когда панель скрыта
 * - Скрыта: когда панель видима (любым способом)
 */

class PaginationToggle {
    constructor() {
        // ===== DOM ЭЛЕМЕНТЫ =====
        this.toggleBtn = document.getElementById('paginationToggle');
        this.pagination = document.getElementById('stickyPagination');

        // ===== ФЛАГИ СОСТОЯНИЯ =====
        /**
         * Открыта ли панель вручную через кнопку-переключатель
         * @type {boolean}
         */
        this.isManuallyOpen = false;

        /**
         * Происходит ли сейчас скролл страницы
         * @type {boolean}
         */
        this.isScrolling = false;

        // ===== ТАЙМЕРЫ =====
        /**
         * Таймер автоскрытия панели после остановки скролла (1.5 сек)
         * @type {number|null}
         */
        this.hideTimeout = null;

        /**
         * Таймер автоскрытия панели при неактивности пользователя (3 сек)
         * @type {number|null}
         */
        this.inactivityTimeout = null;

        // Инициализация
        this.init();
    }

    /**
     * ИНИЦИАЛИЗАЦИЯ
     * Настройка всех обработчиков событий
     */
    init() {
        // Проверка наличия элементов в DOM
        if (!this.toggleBtn || !this.pagination) {
            console.warn('PaginationToggle: Required elements not found');
            return;
        }

        // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====

        // Клик по кнопке-переключателю → открыть/закрыть панель вручную
        this.toggleBtn.addEventListener('click', () => this.togglePagination());

        // Скролл страницы → показать панель автоматически
        window.addEventListener('scroll', () => this.handleScroll());

        // Наведение курсора на панель → пауза всех таймеров
        this.pagination.addEventListener('mouseenter', () => this.pauseTimers());

        // Курсор покинул панель → возобновление таймеров
        this.pagination.addEventListener('mouseleave', () => this.resumeTimers());

        // Клик внутри панели → сброс таймера неактивности
        this.pagination.addEventListener('click', () => this.resetInactivityTimer());

        console.log('PaginationToggle: Initialized successfully');
    }

    /**
     * ПЕРЕКЛЮЧЕНИЕ ПАНЕЛИ ПО КЛИКУ НА КНОПКУ
     * Открывает панель если закрыта, закрывает если открыта
     */
    togglePagination() {
        // Инвертируем состояние
        this.isManuallyOpen = !this.isManuallyOpen;

        if (this.isManuallyOpen) {
            // ===== ОТКРЫВАЕМ ПАНЕЛЬ =====
            this.pagination.classList.add('visible');
            this.toggleBtn.classList.add('open');
            this.updateToggleButtonVisibility();
            this.resetInactivityTimer();

            console.log('PaginationToggle: Opened manually');
        } else {
            // ===== ЗАКРЫВАЕМ ПАНЕЛЬ =====
            this.closePagination();

            console.log('PaginationToggle: Closed manually');
        }
    }

    /**
     * ОБРАБОТЧИК СКРОЛЛА СТРАНИЦЫ
     * Показывает панель при скролле и запускает таймер автоскрытия
     */
    handleScroll() {
        // Устанавливаем флаг скролла
        this.isScrolling = true;

        // Показываем панель
        this.pagination.classList.add('auto-visible');
        this.updateToggleButtonVisibility();

        // Сбрасываем предыдущий таймер автоскрытия
        clearTimeout(this.hideTimeout);

        // Запускаем новый таймер автоскрытия (1.5 секунды)
        this.hideTimeout = setTimeout(() => {
            // Сбрасываем флаг скролла
            this.isScrolling = false;

            // Закрываем панель ТОЛЬКО если она не была открыта вручную
            if (!this.isManuallyOpen) {
                this.pagination.classList.remove('auto-visible');
                this.updateToggleButtonVisibility();

                console.log('PaginationToggle: Auto-hidden after scroll stop');
            }
        }, 1500); // 1.5 секунды

        // Если панель открыта (вручную или автоматически),
        // перезапускаем таймер неактивности
        this.resetInactivityTimer();
    }

    /**
     * ЗАКРЫТИЕ ПАНЕЛИ
     * Полностью закрывает панель и сбрасывает все состояния
     */
    closePagination() {
        // Сбрасываем флаги
        this.isManuallyOpen = false;

        // Удаляем классы видимости
        this.pagination.classList.remove('visible');
        this.pagination.classList.remove('auto-visible');

        // Сбрасываем состояние кнопки
        this.toggleBtn.classList.remove('open');

        // Показываем кнопку-переключатель
        this.updateToggleButtonVisibility();

        // Очищаем все таймеры
        this.clearTimers();

        console.log('PaginationToggle: Closed');
    }

    /**
     * ОБНОВЛЕНИЕ ВИДИМОСТИ КНОПКИ-ПЕРЕКЛЮЧАТЕЛЯ
     * Скрывает кнопку когда панель видима
     * Показывает кнопку когда панель скрыта
     */
    updateToggleButtonVisibility() {
        // Проверяем, видима ли панель (вручную ИЛИ автоматически)
        const isPaginationVisible =
            this.pagination.classList.contains('visible') ||
            this.pagination.classList.contains('auto-visible');

        if (isPaginationVisible) {
            // Панель видима → СКРЫВАЕМ кнопку
            this.toggleBtn.style.opacity = '0';
            this.toggleBtn.style.pointerEvents = 'none';
        } else {
            // Панель скрыта → ПОКАЗЫВАЕМ кнопку
            this.toggleBtn.style.opacity = '1';
            this.toggleBtn.style.pointerEvents = 'auto';
        }
    }

    /**
     * СБРОС ТАЙМЕРА НЕАКТИВНОСТИ
     * Перезапускает 3-секундный таймер автозакрытия
     * Вызывается при любой активности пользователя
     */
    resetInactivityTimer() {
        // Очищаем предыдущий таймер
        clearTimeout(this.inactivityTimeout);

        // Запускаем новый таймер ТОЛЬКО если панель открыта
        if (this.isManuallyOpen || this.isScrolling) {
            this.inactivityTimeout = setTimeout(() => {
                this.closePagination();

                console.log('PaginationToggle: Closed due to inactivity');
            }, 3000); // 3 секунды неактивности
        }
    }

    /**
     * ПАУЗА ВСЕХ ТАЙМЕРОВ
     * Вызывается при наведении курсора на панель
     * Предотвращает автозакрытие пока курсор над панелью
     */
    pauseTimers() {
        clearTimeout(this.hideTimeout);
        clearTimeout(this.inactivityTimeout);

        console.log('PaginationToggle: Timers paused (mouse hover)');
    }

    /**
     * ВОЗОБНОВЛЕНИЕ ТАЙМЕРОВ
     * Вызывается когда курсор покидает панель
     * Перезапускает таймер неактивности
     */
    resumeTimers() {
        this.resetInactivityTimer();

        console.log('PaginationToggle: Timers resumed (mouse leave)');
    }

    /**
     * ОЧИСТКА ВСЕХ ТАЙМЕРОВ
     * Сбрасывает все активные таймеры
     */
    clearTimers() {
        clearTimeout(this.hideTimeout);
        clearTimeout(this.inactivityTimeout);
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ =====
document.addEventListener('DOMContentLoaded', function() {
    // Создаем экземпляр класса
    const paginationToggle = new PaginationToggle();

    console.log('PaginationToggle: Script loaded');
});
