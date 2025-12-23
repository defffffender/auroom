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

        // Флаг для отслеживания режима "большого прыжка"
        this.isAfterBigJump = false;
        // Запоминаем стартовую страницу для больших прыжков
        this.bigJumpStartPage = null;

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

        // Observer для автозагрузки при скролле вверх
        this.setupTopSentinel();

        // Observer для отслеживания видимых карточек и определения текущей страницы
        this.setupPageTracker();
    }

    setupTopSentinel() {
        // Создаём sentinel для верхней части грида
        const topSentinel = document.createElement('div');
        topSentinel.id = 'topScrollSentinel';
        topSentinel.style.cssText = 'height: 1px; width: 1px; opacity: 0; pointer-events: none; visibility: hidden; grid-column: 1 / -1;';

        // Вставляем в начало грида
        if (this.productsGrid.firstChild) {
            this.productsGrid.insertBefore(topSentinel, this.productsGrid.firstChild);
        } else {
            this.productsGrid.appendChild(topSentinel);
        }

        // Observer для автозагрузки при скролле вверх
        const topSentinelObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isLoading) {
                    // Загружаем предыдущую страницу если она есть
                    const itemsPerPage = 12;
                    const loadedItemsCount = this.productsGrid.children.length - 1; // -1 для topSentinel

                    let firstLoadedPage;
                    if (this.bigJumpStartPage !== null) {
                        // Если был большой прыжок, первая загруженная страница это bigJumpStartPage
                        firstLoadedPage = this.bigJumpStartPage;
                    } else {
                        // Иначе первая страница это 1
                        firstLoadedPage = 1;
                    }

                    if (firstLoadedPage > 1) {
                        this.loadPrevious();
                    }
                }
            });
        }, {
            rootMargin: '200px'
        });

        topSentinelObserver.observe(topSentinel);
        this.topSentinel = topSentinel;
    }

    setupPageTracker() {
        // Наблюдатель за видимыми карточками для определения текущей страницы
        const trackObserver = new IntersectionObserver((entries) => {
            // Если мы после большого прыжка, не пересчитываем страницу по индексу
            if (this.isAfterBigJump) {
                return;
            }

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
                    let pageNumber;

                    // Если был большой прыжок, считаем страницы от bigJumpStartPage
                    if (this.bigJumpStartPage !== null) {
                        pageNumber = this.bigJumpStartPage + Math.floor(cardIndex / 12);
                    } else {
                        pageNumber = Math.floor(cardIndex / 12) + 1;
                    }

                    // Обновляем currentPage только если изменилась
                    if (pageNumber !== this.currentPage && pageNumber <= this.totalPages) {
                        this.currentPage = pageNumber;
                        this.updatePagination();

                        // Обновляем URL без перезагрузки (с debounce)
                        if (this.urlUpdateTimeout) {
                            clearTimeout(this.urlUpdateTimeout);
                        }

                        this.urlUpdateTimeout = setTimeout(() => {
                            const displayUrl = new URL(window.location.href);
                            displayUrl.searchParams.set('page', this.currentPage);
                            displayUrl.searchParams.delete('format');
                            window.history.replaceState({}, '', displayUrl);
                        }, 300); // Обновляем URL раз в 300мс, а не при каждом скролле
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
            // Вычисляем какую страницу реально нужно загрузить
            const itemsPerPage = 12;
            const loadedItemsCount = this.productsGrid.children.length - 1; // -1 для topSentinel

            // Если был большой прыжок, следующая страница = bigJumpStartPage + количество загруженных страниц
            let nextPage;
            if (this.bigJumpStartPage !== null) {
                const loadedPagesCount = Math.ceil(loadedItemsCount / itemsPerPage);
                nextPage = this.bigJumpStartPage + loadedPagesCount;
            } else {
                const actualLoadedPages = Math.ceil(loadedItemsCount / itemsPerPage);
                nextPage = actualLoadedPages + 1;
            }

            // Проверка: не пытаемся ли загрузить больше чем есть
            if (nextPage > this.totalPages) return;

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

    async loadPrevious() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            const itemsPerPage = 12;
            const loadedItemsCount = this.productsGrid.children.length - 1; // -1 для topSentinel

            // Вычисляем какую предыдущую страницу загрузить
            let prevPage;
            if (this.bigJumpStartPage !== null) {
                // Если был большой прыжок, предыдущая страница = bigJumpStartPage - 1
                prevPage = this.bigJumpStartPage - 1;
            } else {
                // Иначе это просто предыдущая страница
                prevPage = Math.floor(loadedItemsCount / itemsPerPage);
            }

            // Проверка: не пытаемся ли загрузить страницу меньше 1
            if (prevPage < 1) return;

            const url = new URL(window.location.href);
            url.searchParams.set('page', prevPage);
            url.searchParams.set('format', 'json');

            const response = await fetch(url);

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            if (data.products && data.products.length > 0) {
                // Сохраняем текущую позицию скролла относительно первого элемента
                const firstProduct = this.productsGrid.children[1]; // [0] это topSentinel
                const scrollOffset = firstProduct ? firstProduct.getBoundingClientRect().top : 0;

                // Добавляем товары в начало (после topSentinel)
                this.prependProducts(data.products);

                // Обновляем bigJumpStartPage - сдвигаем на одну страницу назад
                if (this.bigJumpStartPage !== null) {
                    this.bigJumpStartPage = prevPage;
                }

                this.currentPage = data.current_page;
                this.updatePagination();

                // Восстанавливаем позицию скролла
                if (firstProduct) {
                    const newTop = firstProduct.getBoundingClientRect().top;
                    window.scrollBy(0, newTop - scrollOffset);
                }
            }

        } catch (error) {
            console.error('Error loading previous products:', error);
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

    prependProducts(products) {
        // Вставляем товары в начало (после topSentinel)
        const topSentinel = this.topSentinel || this.productsGrid.firstChild;

        // Добавляем в обратном порядке чтобы порядок был правильный
        for (let i = products.length - 1; i >= 0; i--) {
            const productCard = this.createProductCard(products[i]);

            // Вставляем после topSentinel
            if (topSentinel && topSentinel.nextSibling) {
                this.productsGrid.insertBefore(productCard, topSentinel.nextSibling);
            } else {
                this.productsGrid.appendChild(productCard);
            }

            // Добавляем наблюдение за новой карточкой для отслеживания страницы
            if (this.pageTrackObserver) {
                this.pageTrackObserver.observe(productCard);
            }
        }
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
            const loadedItemsCount = this.productsGrid.children.length - 1; // -1 для topSentinel
            const loadedPagesCount = Math.ceil(loadedItemsCount / itemsPerPage);

            // Определяем первую и последнюю загруженную страницу
            let firstLoadedPage, lastLoadedPage;
            if (this.bigJumpStartPage !== null) {
                firstLoadedPage = this.bigJumpStartPage;
                lastLoadedPage = this.bigJumpStartPage + loadedPagesCount - 1;
            } else {
                firstLoadedPage = 1;
                lastLoadedPage = loadedPagesCount;
            }

            // Проверяем: находится ли целевая страница в диапазоне загруженных страниц
            const isTargetInLoadedRange = targetPage >= firstLoadedPage && targetPage <= lastLoadedPage;

            // Проверяем нужен ли большой прыжок (вперёд или назад)
            const forwardJump = targetPage > lastLoadedPage ? targetPage - lastLoadedPage : 0;
            const backwardJump = targetPage < firstLoadedPage ? firstLoadedPage - targetPage : 0;
            const isBigJump = forwardJump > 5 || backwardJump > 5;

            // Если целевая страница уже загружена в гриде - просто скроллим к ней
            if (isTargetInLoadedRange) {
                // Вычисляем индекс карточки относительно первой загруженной страницы
                const targetCardIndex = (targetPage - firstLoadedPage) * itemsPerPage + 1; // +1 для topSentinel

                if (this.productsGrid.children[targetCardIndex]) {
                    firstCardOfTargetPage = this.productsGrid.children[targetCardIndex];
                    firstCardOfTargetPage.id = `page-${targetPage}-start`;
                    firstCardOfTargetPage.style.scrollMarginTop = '100px';
                    firstCardOfTargetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                this.currentPage = targetPage;
                this.updatePagination();

            } else if (isBigJump) {
                    // БОЛЬШОЙ ПРЫЖОК - очищаем грид и загружаем только целевую страницу
                    this.productsGrid.innerHTML = '';

                    // Пересоздаём top sentinel после очистки
                    const topSentinel = document.createElement('div');
                    topSentinel.id = 'topScrollSentinel';
                    topSentinel.style.cssText = 'height: 1px; width: 1px; opacity: 0; pointer-events: none; visibility: hidden; grid-column: 1 / -1;';
                    this.productsGrid.appendChild(topSentinel);
                    this.topSentinel = topSentinel;

                    // Re-attach observer к новому sentinel
                    const topSentinelObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting && !this.isLoading) {
                                const itemsPerPage = 12;
                                const loadedItemsCount = this.productsGrid.children.length - 1;

                                let firstLoadedPage;
                                if (this.bigJumpStartPage !== null) {
                                    firstLoadedPage = this.bigJumpStartPage;
                                } else {
                                    firstLoadedPage = 1;
                                }

                                if (firstLoadedPage > 1) {
                                    this.loadPrevious();
                                }
                            }
                        });
                    }, {
                        rootMargin: '200px'
                    });
                    topSentinelObserver.observe(topSentinel);

                    const url = new URL(window.location.href);
                    url.searchParams.set('page', targetPage);
                    url.searchParams.set('format', 'json');

                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Network response was not ok');

                    const data = await response.json();

                    if (data.products && data.products.length > 0) {
                        this.appendProducts(data.products);
                        this.currentPage = data.current_page;
                        this.totalPages = data.total_pages;

                        // ВАЖНО: Устанавливаем флаги для режима "большого прыжка"
                        this.isAfterBigJump = true;
                        this.bigJumpStartPage = targetPage;

                        // ВАЖНО: Обновляем dataset чтобы другие функции знали текущую страницу
                        this.productsGrid.dataset.currentPage = this.currentPage;

                        // Скроллим наверх
                        window.scrollTo({ top: 0, behavior: 'smooth' });

                        // Через 1 секунду включаем обратно отслеживание
                        setTimeout(() => {
                            this.isAfterBigJump = false;
                        }, 1000);
                    }

                this.updatePagination();

            } else {
                // МАЛЕНЬКИЙ ПРЫЖОК вперёд - загружаем промежуточные страницы
                if (forwardJump > 0) {
                    for (let page = lastLoadedPage + 1; page <= targetPage; page++) {
                        const url = new URL(window.location.href);
                        url.searchParams.set('page', page);
                        url.searchParams.set('format', 'json');

                        const response = await fetch(url);
                        if (!response.ok) throw new Error('Network response was not ok');

                        const data = await response.json();

                        if (data.products && data.products.length > 0) {
                            const beforeCount = this.productsGrid.children.length;
                            this.appendProducts(data.products);

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

                    // Скроллим к началу целевой страницы
                    setTimeout(() => {
                        if (firstCardOfTargetPage) {
                            firstCardOfTargetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 100);
                }
                // МАЛЕНЬКИЙ ПРЫЖОК назад - загружаем промежуточные страницы
                else if (backwardJump > 0) {
                    for (let page = firstLoadedPage - 1; page >= targetPage; page--) {
                        const url = new URL(window.location.href);
                        url.searchParams.set('page', page);
                        url.searchParams.set('format', 'json');

                        const response = await fetch(url);
                        if (!response.ok) throw new Error('Network response was not ok');

                        const data = await response.json();

                        if (data.products && data.products.length > 0) {
                            this.prependProducts(data.products);

                            // Обновляем bigJumpStartPage если он был установлен
                            if (this.bigJumpStartPage !== null) {
                                this.bigJumpStartPage = page;
                            }

                            this.currentPage = data.current_page;
                            this.totalPages = data.total_pages;
                        }
                    }

                    // Скроллим к целевой странице (первая карточка после top sentinel)
                    if (this.productsGrid.children[1]) {
                        this.productsGrid.children[1].scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }

                this.updatePagination();
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
