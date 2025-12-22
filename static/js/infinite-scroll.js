/**
 * Infinite Scroll для каталога товаров AuRoom
 */

class InfiniteScroll {
    constructor() {
        this.currentPage = parseInt(document.getElementById('productsGrid')?.dataset.currentPage) || 1;
        this.totalPages = parseInt(document.getElementById('productsGrid')?.dataset.totalPages) || 1;
        this.isLoading = false;
        this.productsGrid = document.getElementById('productsGrid');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.paginationButtons = document.querySelectorAll('.pagination-btn');

        this.init();
    }

    init() {
        if (!this.productsGrid) return;

        // Intersection Observer для автозагрузки при скролле
        this.setupIntersectionObserver();

        // Обновляем пагинацию справа
        this.updatePagination();

        // Настройка кнопок навигации пагинации
        this.setupPaginationButtons();

        // Кнопка "Вернуться к началу"
        this.setupScrollToTop();
    }

    setupPaginationButtons() {
        // Кнопка "предыдущая страница" (одна стрелка вверх)
        const prevBtn = document.getElementById('prevPageBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.goToPage(this.currentPage - 1);
                }
            });
        }

        // Кнопка "следующая страница" (одна стрелка вниз)
        const nextBtn = document.getElementById('nextPageBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.goToPage(this.currentPage + 1);
                }
            });
        }

        // Кнопка "к первой странице" (две стрелки вверх)
        const firstPageBtn = document.getElementById('firstPageBtn');
        if (firstPageBtn) {
            firstPageBtn.addEventListener('click', () => {
                this.goToPage(1);
            });
        }

        // Кнопка "к последней странице" (две стрелки вниз)
        const lastPageBtn = document.getElementById('lastPageBtn');
        if (lastPageBtn) {
            lastPageBtn.addEventListener('click', () => {
                this.goToPage(this.totalPages);
            });
        }

        // Быстрый переход на страницу по номеру
        const pageJumpInput = document.getElementById('pageJumpInput');
        const pageJumpBtn = document.getElementById('pageJumpBtn');

        if (pageJumpBtn && pageJumpInput) {
            // Обработчик кнопки "Go"
            pageJumpBtn.addEventListener('click', () => {
                this.jumpToPage(pageJumpInput);
            });

            // Обработчик Enter в input
            pageJumpInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.jumpToPage(pageJumpInput);
                }
            });

            // Ограничение ввода только цифрами
            pageJumpInput.addEventListener('input', (e) => {
                let value = parseInt(e.target.value);
                if (value < 1) e.target.value = '';
                if (value > this.totalPages) e.target.value = this.totalPages;
            });
        }
    }

    jumpToPage(input) {
        const pageNumber = parseInt(input.value);
        if (pageNumber && pageNumber >= 1 && pageNumber <= this.totalPages) {
            this.goToPage(pageNumber);
            input.value = ''; // Очищаем поле после перехода
        } else {
            // Показываем ошибку если номер некорректный
            input.classList.add('border-red-500', 'ring-2', 'ring-red-500');
            setTimeout(() => {
                input.classList.remove('border-red-500', 'ring-2', 'ring-red-500');
            }, 1000);
        }
    }

    setupIntersectionObserver() {
        const sentinel = document.getElementById('scrollSentinel');
        if (!sentinel) return;

        // Observer для автозагрузки при скролле вниз
        const sentinelObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isLoading && this.currentPage < this.totalPages) {
                    this.loadMore();
                }
            });
        }, {
            rootMargin: '200px'
        });

        sentinelObserver.observe(sentinel);

        // Observer для отслеживания видимых карточек и определения текущей страницы
        this.setupPageTracker();
    }

    setupPageTracker() {
        // Наблюдатель за видимыми карточками для определения текущей страницы
        const trackObserver = new IntersectionObserver((entries) => {
            // Находим все видимые карточки
            const visibleCards = entries
                .filter(entry => entry.isIntersecting)
                .map(entry => entry.target);

            if (visibleCards.length > 0) {
                // Берём первую видимую карточку в центре экрана
                const centerCard = visibleCards[Math.floor(visibleCards.length / 2)];
                const cardIndex = Array.from(this.productsGrid.children).indexOf(centerCard);

                if (cardIndex >= 0) {
                    // Вычисляем номер страницы по индексу карточки (12 товаров на страницу)
                    const pageNumber = Math.floor(cardIndex / 12) + 1;

                    // Обновляем currentPage только если изменилась
                    if (pageNumber !== this.currentPage && pageNumber <= this.totalPages) {
                        this.currentPage = pageNumber;
                        this.updatePagination();

                        // Обновляем URL без перезагрузки
                        const displayUrl = new URL(window.location.href);
                        displayUrl.searchParams.set('page', this.currentPage);
                        displayUrl.searchParams.delete('format');
                        window.history.replaceState({}, '', displayUrl);
                    }
                }
            }
        }, {
            threshold: 0.5,  // Карточка считается видимой если видно 50%
            rootMargin: '-20% 0px -20% 0px'  // Отслеживаем центральную часть экрана
        });

        // Наблюдаем за всеми карточками товаров
        this.observeProductCards(trackObserver);
    }

    observeProductCards(observer) {
        // Наблюдаем за существующими карточками
        const cards = this.productsGrid.querySelectorAll('.bg-white');
        cards.forEach(card => observer.observe(card));

        // Сохраняем observer для новых карточек
        this.pageTrackObserver = observer;
    }

    async loadMore() {
        if (this.isLoading || this.currentPage >= this.totalPages) return;

        this.isLoading = true;
        this.showLoading();

        try {
            const nextPage = this.currentPage + 1;
            const url = new URL(window.location.href);
            url.searchParams.set('page', nextPage);
            url.searchParams.set('format', 'json');

            const response = await fetch(url);

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            if (data.products && data.products.length > 0) {
                this.appendProducts(data.products);
                this.currentPage = data.current_page;
                this.updatePagination();

                // Обновляем URL без перезагрузки (убираем format=json из URL)
                const displayUrl = new URL(window.location.href);
                displayUrl.searchParams.set('page', this.currentPage);
                displayUrl.searchParams.delete('format');
                window.history.pushState({}, '', displayUrl);
            }

        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    appendProducts(products) {
        products.forEach(product => {
            const productCard = this.createProductCard(product);
            this.productsGrid.appendChild(productCard);

            // Добавляем наблюдение за новой карточкой для отслеживания страницы
            if (this.pageTrackObserver) {
                this.pageTrackObserver.observe(productCard);
            }
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow hover:shadow-lg transition-shadow relative';

        const isAuthenticated = typeof userIsAuthenticated !== 'undefined' ? userIsAuthenticated : false;

        card.innerHTML = `
            ${product.image_url ? `
                <a href="${product.detail_url}">
                    <img class="rounded-t-lg h-64 w-full object-contain bg-gray-50 dark:bg-gray-700" src="${product.image_url}" alt="${product.name}" loading="lazy" />
                </a>
            ` : `
                <div class="rounded-t-lg h-64 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <i class="bi bi-image text-gray-400 dark:text-gray-500" style="font-size: 3rem;"></i>
                </div>
            `}

            ${isAuthenticated ? `
            <button onclick="showFavoriteModalFromCard('${product.article}')"
                    class="absolute top-3 right-3 text-white bg-red-500/80 hover:bg-red-600 backdrop-blur-sm focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-full text-sm p-2 shadow-lg transition"
                    title="Добавить в избранное">
                <i class="bi bi-heart text-lg"></i>
            </button>
            ` : `
            <button onclick="addToLocalStorageFavorites('${product.article}')"
                    class="absolute top-3 right-3 text-white bg-red-500/80 hover:bg-red-600 backdrop-blur-sm focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-full text-sm p-2 shadow-lg transition"
                    title="Добавить в избранное">
                <i class="bi bi-heart text-lg"></i>
            </button>
            `}

            <div class="p-5">
                <span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded">${product.category_name}</span>

                <a href="${product.detail_url}">
                    <h5 class="mt-2 mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white hover:text-primary-600">${product.name}</h5>
                </a>

                <p class="mb-3 text-sm text-gray-700 dark:text-gray-300">
                    <i class="bi bi-hash"></i> Арт: ${product.article}<br>
                    <i class="bi bi-gem"></i> ${product.material_name} • ${product.metal_weight} г
                </p>

                ${product.in_stock ? `
                    <span class="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs font-medium px-2.5 py-0.5 rounded">
                        <i class="bi bi-check-circle"></i> В наличии
                    </span>
                ` : `
                    <span class="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs font-medium px-2.5 py-0.5 rounded">
                        <i class="bi bi-x-circle"></i> Нет в наличии
                    </span>
                `}

                <div class="mt-4">
                    <p class="text-2xl font-bold text-primary-600">$${product.price}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        <i class="bi bi-building"></i> ${product.factory_name}
                    </p>
                    <a href="${product.detail_url}" class="inline-flex items-center w-full justify-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300">
                        <i class="bi bi-eye mr-2"></i>
                        Подробнее
                    </a>
                </div>
            </div>
        `;

        return card;
    }

    updatePagination() {
        // Обновляем текущую страницу в липкой пагинации
        const currentPageSpan = document.getElementById('currentPageNumber');
        if (currentPageSpan) {
            currentPageSpan.textContent = this.currentPage;
        }

        // Генерируем кнопки страниц
        this.generatePageButtons();

        // Обновляем состояние навигационных кнопок
        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const firstPageBtn = document.getElementById('firstPageBtn');
        const lastPageBtn = document.getElementById('lastPageBtn');

        // Кнопка "предыдущая страница"
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        // Кнопка "следующая страница"
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }

        // Кнопка "к первой странице"
        if (firstPageBtn) {
            firstPageBtn.disabled = this.currentPage === 1;
        }

        // Кнопка "к последней странице"
        if (lastPageBtn) {
            lastPageBtn.disabled = this.currentPage === this.totalPages;
        }

        // Обновляем max значение для input (на случай если totalPages изменился)
        const pageJumpInput = document.getElementById('pageJumpInput');
        if (pageJumpInput) {
            pageJumpInput.max = this.totalPages;
        }

        // Обновляем отображение общего количества страниц
        const totalPageSpan = document.getElementById('totalPageNumber');
        if (totalPageSpan) {
            totalPageSpan.textContent = this.totalPages;
        }
    }

    generatePageButtons() {
        const container = document.getElementById('paginationNumbers');
        if (!container) return;

        container.innerHTML = '';

        // Определяем диапазон страниц для отображения
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const button = document.createElement('button');
            button.className = `px-3 py-1 text-sm rounded ${
                i === this.currentPage
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            } border border-gray-300 dark:border-gray-600`;
            button.textContent = i;
            button.onclick = () => this.goToPage(i);
            container.appendChild(button);
        }
    }

    async goToPage(targetPage) {
        if (targetPage < 1 || targetPage > this.totalPages || targetPage === this.currentPage) return;

        this.isLoading = true;
        this.showLoading();

        try {
            let firstCardOfTargetPage = null;
            const itemsPerPage = 12;

            // Вычисляем сколько страниц реально загружено в гриде
            const loadedItemsCount = this.productsGrid.children.length;
            const loadedPagesCount = Math.ceil(loadedItemsCount / itemsPerPage);

            // Проверяем нужно ли удалять товары или загружать новые
            if (targetPage <= loadedPagesCount) {
                // Целевая страница уже загружена в гриде
                const targetCardIndex = (targetPage - 1) * itemsPerPage;

                if (targetPage < loadedPagesCount) {
                    // Нужно удалить лишние товары после целевой страницы
                    const keepItemsCount = targetPage * itemsPerPage;

                    if (this.productsGrid.children[targetCardIndex]) {
                        firstCardOfTargetPage = this.productsGrid.children[targetCardIndex];
                        firstCardOfTargetPage.id = `page-${targetPage}-start`;
                        firstCardOfTargetPage.style.scrollMarginTop = '100px';

                        // Плавно скроллим к целевой странице ДО удаления
                        firstCardOfTargetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });

                        // Ждём завершения скролла перед удалением
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                    // Удаляем лишние товары (после целевой страницы)
                    while (this.productsGrid.children.length > keepItemsCount) {
                        this.productsGrid.removeChild(this.productsGrid.lastChild);
                    }
                } else {
                    // Просто скроллим к нужной странице (она последняя загруженная)
                    if (this.productsGrid.children[targetCardIndex]) {
                        firstCardOfTargetPage = this.productsGrid.children[targetCardIndex];
                        firstCardOfTargetPage.id = `page-${targetPage}-start`;
                        firstCardOfTargetPage.style.scrollMarginTop = '100px';
                        firstCardOfTargetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }

                this.currentPage = targetPage;
                this.updatePagination();

            } else {
                // Целевая страница НЕ загружена - нужно загрузить недостающие страницы
                for (let page = loadedPagesCount + 1; page <= targetPage; page++) {
                    const url = new URL(window.location.href);
                    url.searchParams.set('page', page);
                    url.searchParams.set('format', 'json');

                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Network response was not ok');

                    const data = await response.json();

                    if (data.products && data.products.length > 0) {
                        // Запоминаем количество товаров перед добавлением
                        const beforeCount = this.productsGrid.children.length;

                        this.appendProducts(data.products);

                        // Если это целевая страница, запоминаем первую карточку
                        if (page === targetPage && !firstCardOfTargetPage) {
                            firstCardOfTargetPage = this.productsGrid.children[beforeCount];
                            if (firstCardOfTargetPage) {
                                firstCardOfTargetPage.id = `page-${page}-start`;
                                firstCardOfTargetPage.style.scrollMarginTop = '100px';
                            }
                        }

                        this.currentPage = data.current_page;
                        this.totalPages = data.total_pages;
                    }
                }

                this.updatePagination();

                // Скроллим к началу целевой страницы
                setTimeout(() => {
                    if (firstCardOfTargetPage) {
                        firstCardOfTargetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            }

            // Обновляем URL без перезагрузки (убираем format=json из URL)
            const displayUrl = new URL(window.location.href);
            displayUrl.searchParams.set('page', targetPage);
            displayUrl.searchParams.delete('format');
            window.history.pushState({}, '', displayUrl);

        } catch (error) {
            console.error('Error loading page:', error);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    showLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('hidden');
        }
    }

    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.add('hidden');
        }
    }

    setupScrollToTop() {
        const scrollBtn = document.getElementById('scrollToTopBtn');
        if (!scrollBtn) return;

        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollBtn.classList.remove('hidden');
            } else {
                scrollBtn.classList.add('hidden');
            }
        });

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    new InfiniteScroll();
});
