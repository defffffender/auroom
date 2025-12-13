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

        // Кнопка "первая видимая страница" (две стрелки вверх)
        const firstVisibleBtn = document.getElementById('firstVisiblePageBtn');
        if (firstVisibleBtn) {
            firstVisibleBtn.addEventListener('click', () => {
                const startPage = Math.max(1, this.currentPage - 2);
                this.goToPage(startPage);
            });
        }

        // Кнопка "последняя видимая страница" (две стрелки вниз)
        const lastVisibleBtn = document.getElementById('lastVisiblePageBtn');
        if (lastVisibleBtn) {
            lastVisibleBtn.addEventListener('click', () => {
                const endPage = Math.min(this.totalPages, this.currentPage + 2);
                this.goToPage(endPage);
            });
        }
    }

    setupIntersectionObserver() {
        const sentinel = document.getElementById('scrollSentinel');
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isLoading && this.currentPage < this.totalPages) {
                    this.loadMore();
                }
            });
        }, {
            rootMargin: '200px'
        });

        observer.observe(sentinel);
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
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow hover:shadow-lg transition-shadow';

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
        const firstVisibleBtn = document.getElementById('firstVisiblePageBtn');
        const lastVisibleBtn = document.getElementById('lastVisiblePageBtn');

        // Определяем диапазон видимых страниц
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        // Кнопка "предыдущая страница"
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        // Кнопка "следующая страница"
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }

        // Кнопка "первая видимая"
        if (firstVisibleBtn) {
            firstVisibleBtn.disabled = this.currentPage === startPage;
        }

        // Кнопка "последняя видимая"
        if (lastVisibleBtn) {
            lastVisibleBtn.disabled = this.currentPage === endPage;
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

            // Если переход назад (например с 4 на 2)
            if (targetPage < this.currentPage) {
                // Вычисляем какие товары нужно удалить (всё после целевой страницы)
                const itemsPerPage = 12;
                const keepItemsCount = targetPage * itemsPerPage;

                // Сначала находим карточку целевой страницы до удаления
                const targetCardIndex = (targetPage - 1) * itemsPerPage;
                if (this.productsGrid.children[targetCardIndex]) {
                    firstCardOfTargetPage = this.productsGrid.children[targetCardIndex];
                    firstCardOfTargetPage.id = `page-${targetPage}-start`;
                    firstCardOfTargetPage.style.scrollMarginTop = '100px';

                    // Плавно скроллим к целевой странице ДО удаления
                    firstCardOfTargetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });

                    // Ждём завершения скролла перед удалением
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Теперь удаляем лишние товары (после целевой страницы)
                while (this.productsGrid.children.length > keepItemsCount) {
                    this.productsGrid.removeChild(this.productsGrid.lastChild);
                }

                this.currentPage = targetPage;
                this.updatePagination();

            } else {
                // Переход вперёд (например с 2 на 4) - загружаем недостающие страницы
                for (let page = this.currentPage + 1; page <= targetPage; page++) {
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
