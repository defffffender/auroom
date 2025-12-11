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

        // Кнопка "Вернуться к началу"
        this.setupScrollToTop();
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

            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            if (data.products && data.products.length > 0) {
                this.appendProducts(data.products);
                this.currentPage = data.current_page;
                this.updatePagination();

                // Обновляем URL без перезагрузки
                window.history.pushState({}, '', url);
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

    async goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;

        // Скроллим к началу каталога
        const catalogTop = document.getElementById('catalogTop');
        if (catalogTop) {
            catalogTop.scrollIntoView({ behavior: 'smooth' });
        }

        // Загружаем страницу
        this.currentPage = page - 1; // Будет инкрементирована в loadMore
        await this.loadMore();
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
