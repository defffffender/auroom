// Интерактивная линейка для ювелирных изделий

class JewelryRuler {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Контейнер для линейки не найден');
            return;
        }
        
        this.options = {
            widthMm: options.widthMm || null,
            heightMm: options.heightMm || null,
            diameterMm: options.diameterMm || null,
            referenceType: options.referenceType || 'none',
            showHorizontal: true,
            showVertical: true,
            ...options
        };
        
        this.rulerVisible = false;
        this.init();
    }
    
    init() {
        this.createControls();
        this.createRulerOverlay();
        this.attachEventListeners();
    }
    
    createControls() {
        const controlsHTML = `
            <div class="ruler-controls">
                <div class="ruler-toggle">
                    <input type="checkbox" id="rulerToggle" />
                    <label for="rulerToggle">📏 Показать линейку</label>
                </div>
                ${this.options.widthMm || this.options.heightMm || this.options.diameterMm ? `
                    <button class="ruler-btn" id="showDimensions">📊 Показать размеры</button>
                ` : ''}
            </div>
            
            ${this.getReferenceInfo()}
        `;
        
        this.container.insertAdjacentHTML('afterbegin', controlsHTML);
    }
    
    getReferenceInfo() {
        const referenceTypes = {
            'ear': '👂 Фото на фоне уха (стандартный размер: ~60×50 мм)',
            'finger': '💍 Фото на пальце (диаметр пальца: ~17 мм)',
            'wrist': '⌚ Фото на запястье (обхват: ~160 мм)',
            'neck': '📿 Фото на шее (обхват: ~360 мм)'
        };
        
        if (this.options.referenceType && this.options.referenceType !== 'none') {
            return `
                <div class="reference-info">
                    <strong>Эталонное фото:</strong> ${referenceTypes[this.options.referenceType] || ''}
                </div>
            `;
        }
        return '';
    }
    
    createRulerOverlay() {
        const imageWrapper = this.container.querySelector('.ruler-image-wrapper');
        if (!imageWrapper) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'ruler-overlay';
        overlay.id = 'rulerOverlay';
        overlay.style.display = 'none';
        
        // Горизонтальная линейка
        if (this.options.showHorizontal && this.options.widthMm) {
            const horizontal = document.createElement('div');
            horizontal.className = 'ruler-horizontal';
            
            const label = document.createElement('div');
            label.className = 'ruler-label ruler-label-horizontal';
            label.textContent = `${this.options.widthMm} мм`;
            
            horizontal.appendChild(label);
            overlay.appendChild(horizontal);
        }
        
        // Вертикальная линейка
        if (this.options.showVertical && this.options.heightMm) {
            const vertical = document.createElement('div');
            vertical.className = 'ruler-vertical';
            
            const label = document.createElement('div');
            label.className = 'ruler-label ruler-label-vertical';
            label.textContent = `${this.options.heightMm} мм`;
            
            vertical.appendChild(label);
            overlay.appendChild(vertical);
        }
        
        imageWrapper.appendChild(overlay);
    }
    
    attachEventListeners() {
        const toggle = document.getElementById('rulerToggle');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                this.toggleRuler(e.target.checked);
            });
        }
        
        const showDimensionsBtn = document.getElementById('showDimensions');
        if (showDimensionsBtn) {
            showDimensionsBtn.addEventListener('click', () => {
                this.showDimensionsInfo();
            });
        }
    }
    
    toggleRuler(show) {
        const overlay = document.getElementById('rulerOverlay');
        if (overlay) {
            overlay.style.display = show ? 'block' : 'none';
            this.rulerVisible = show;
        }
    }
    
    showDimensionsInfo() {
        // Проверяем, существует ли уже блок с размерами
        let dimensionsBlock = document.getElementById('dimensionsInfo');
        
        if (dimensionsBlock) {
            // Если существует, скрываем/показываем
            dimensionsBlock.style.display = dimensionsBlock.style.display === 'none' ? 'block' : 'none';
            return;
        }
        
        // Создаём новый блок с размерами
        const dimensions = [];
        
        if (this.options.widthMm) {
            dimensions.push({label: 'Ширина', value: `${this.options.widthMm} мм`});
        }
        if (this.options.heightMm) {
            dimensions.push({label: 'Высота', value: `${this.options.heightMm} мм`});
        }
        if (this.options.diameterMm) {
            dimensions.push({label: 'Диаметр', value: `${this.options.diameterMm} мм`});
        }
        
        const dimensionsHTML = `
            <div class="dimensions-info" id="dimensionsInfo">
                <h4>📐 Точные размеры изделия</h4>
                ${dimensions.map(dim => `
                    <div class="dimension-item">
                        <span class="dimension-label">${dim.label}:</span>
                        <span class="dimension-value">${dim.value}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        this.container.insertAdjacentHTML('beforeend', dimensionsHTML);
    }
}

// Инициализация линейки при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const rulerContainer = document.getElementById('jewelryRulerContainer');
    
    if (rulerContainer) {
        // Получаем данные из data-атрибутов
        const widthMm = rulerContainer.dataset.widthMm;
        const heightMm = rulerContainer.dataset.heightMm;
        const diameterMm = rulerContainer.dataset.diameterMm;
        const referenceType = rulerContainer.dataset.referenceType;
        
        // Создаём экземпляр линейки
        new JewelryRuler('jewelryRulerContainer', {
            widthMm: widthMm ? parseFloat(widthMm) : null,
            heightMm: heightMm ? parseFloat(heightMm) : null,
            diameterMm: diameterMm ? parseFloat(diameterMm) : null,
            referenceType: referenceType || 'none'
        });
    }
});

// Экспортируем класс для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JewelryRuler;
}