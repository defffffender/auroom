// Редактор изображений с эталоном для ювелирных изделий
// Использует Fabric.js для canvas манипуляций

class JewelryImageEditor {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Контейнер редактора не найден');
            return;
        }
        
        this.options = {
            canvasWidth: 800,
            canvasHeight: 600,
            referenceImage: options.referenceImage || null,
            referenceWidth: options.referenceWidth || 50,  // мм
            referenceHeight: options.referenceHeight || 60, // мм
            ...options
        };
        
        this.canvas = null;
        this.referenceImg = null;
        this.productImg = null;
        this.referenceOpacity = 0.5;
        this.currentZoom = 1;
        
        this.init();
    }
    
    init() {
        this.createCanvas();
        if (this.options.referenceImage) {
            this.loadReferenceImage();
        }
        this.attachEventListeners();
    }
    
    createCanvas() {
        // Создаём canvas элемент
        const canvasEl = document.createElement('canvas');
        canvasEl.id = 'fabricCanvas';
        canvasEl.width = this.options.canvasWidth;
        canvasEl.height = this.options.canvasHeight;
        
        const canvasWrapper = this.container.querySelector('.canvas-container-wrapper');
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'canvas-container';
        canvasContainer.appendChild(canvasEl);
        canvasWrapper.appendChild(canvasContainer);
        
        // Инициализируем Fabric.js canvas
        this.canvas = new fabric.Canvas('fabricCanvas', {
            backgroundColor: '#ffffff',
            selection: true,
            preserveObjectStacking: true
        });
        
        // Центрируем canvas
        this.canvas.setDimensions({
            width: this.options.canvasWidth,
            height: this.options.canvasHeight
        });
    }
    
    loadReferenceImage() {
        const loadingOverlay = this.container.querySelector('.loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.add('active');
        
        fabric.Image.fromURL(this.options.referenceImage, (img) => {
            // Масштабируем эталон по размеру canvas
            const scale = Math.min(
                this.options.canvasWidth / img.width,
                this.options.canvasHeight / img.height
            ) * 0.8;
            
            img.set({
                left: this.options.canvasWidth / 2,
                top: this.options.canvasHeight / 2,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                opacity: this.referenceOpacity,
                selectable: false,  // Эталон нельзя двигать
                evented: false,
                hasControls: false,
                hasBorders: false
            });
            
            this.referenceImg = img;
            this.canvas.add(img);
            this.canvas.sendToBack(img);  // Эталон всегда внизу
            this.canvas.renderAll();
            
            if (loadingOverlay) loadingOverlay.classList.remove('active');
            
            // Показываем статус
            this.showStatus('✓ Эталон загружен. Теперь загрузите фото изделия.', 'success');
        }, {
            crossOrigin: 'anonymous'
        });
    }
    
    loadProductImage(file) {
        if (!file || !file.type.match('image.*')) {
            this.showStatus('⚠ Пожалуйста, выберите изображение', 'error');
            return;
        }
        
        const loadingOverlay = this.container.querySelector('.loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.add('active');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            fabric.Image.fromURL(e.target.result, (img) => {
                // Удаляем предыдущее изделие если есть
                if (this.productImg) {
                    this.canvas.remove(this.productImg);
                }
                
                // Масштабируем изделие
                const scale = Math.min(
                    this.options.canvasWidth / img.width,
                    this.options.canvasHeight / img.height
                ) * 0.5;  // Начинаем с 50% размера canvas
                
                img.set({
                    left: this.options.canvasWidth / 2,
                    top: this.options.canvasHeight / 2,
                    originX: 'center',
                    originY: 'center',
                    scaleX: scale,
                    scaleY: scale
                });
                
                this.productImg = img;
                this.canvas.add(img);
                this.canvas.setActiveObject(img);
                this.canvas.bringToFront(img);  // Изделие всегда сверху
                this.canvas.renderAll();
                
                // Включаем контролы
                this.enableControls();
                
                // Обновляем размеры
                this.updateDimensions();
                
                if (loadingOverlay) loadingOverlay.classList.remove('active');
                
                this.showStatus('✓ Изделие загружено. Подгоните его под эталон.', 'success');
            });
        };
        
        reader.readAsDataURL(file);
    }
    
    attachEventListeners() {
        // Изменение прозрачности эталона
        const opacitySlider = document.getElementById('referenceOpacity');
        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => {
                this.referenceOpacity = parseFloat(e.target.value);
                if (this.referenceImg) {
                    this.referenceImg.set('opacity', this.referenceOpacity);
                    this.canvas.renderAll();
                }
            });
        }
        
        // Загрузка изделия
        const fileInput = document.getElementById('productImageInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.loadProductImage(e.target.files[0]);
                }
            });
        }
        
        // Zoom контролы
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const resetBtn = document.getElementById('resetPosition');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetPosition());
        }
        
        // Обновление размеров при изменении
        this.canvas.on('object:modified', () => {
            this.updateDimensions();
        });
        
        this.canvas.on('object:scaling', () => {
            this.updateDimensions();
        });
        
        this.canvas.on('object:moving', () => {
            this.updateDimensions();
        });
    }
    
    enableControls() {
        const controls = this.container.querySelectorAll('.control-btn:disabled');
        controls.forEach(btn => btn.disabled = false);
    }
    
    zoomIn() {
        if (!this.productImg) return;
        
        const newScale = this.productImg.scaleX * 1.1;
        this.productImg.set({
            scaleX: newScale,
            scaleY: newScale
        });
        
        this.canvas.renderAll();
        this.updateDimensions();
        this.updateZoomLevel();
    }
    
    zoomOut() {
        if (!this.productImg) return;
        
        const newScale = this.productImg.scaleX * 0.9;
        this.productImg.set({
            scaleX: newScale,
            scaleY: newScale
        });
        
        this.canvas.renderAll();
        this.updateDimensions();
        this.updateZoomLevel();
    }
    
    resetPosition() {
        if (!this.productImg) return;
        
        this.productImg.set({
            left: this.options.canvasWidth / 2,
            top: this.options.canvasHeight / 2,
            angle: 0
        });
        
        this.canvas.renderAll();
        this.updateDimensions();
    }
    
    updateZoomLevel() {
        if (!this.productImg) return;
        
        const zoomLevel = (this.productImg.scaleX * 100).toFixed(0);
        const zoomDisplay = document.querySelector('.zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${zoomLevel}%`;
        }
    }
    
    updateDimensions() {
        if (!this.productImg || !this.referenceImg) return;
        
        // Рассчитываем реальные размеры изделия
        // Основываясь на размерах эталона
        
        const refScaledWidth = this.referenceImg.width * this.referenceImg.scaleX;
        const refScaledHeight = this.referenceImg.height * this.referenceImg.scaleY;
        
        const prodScaledWidth = this.productImg.width * this.productImg.scaleX;
        const prodScaledHeight = this.productImg.height * this.productImg.scaleY;
        
        // Пиксели на мм для эталона
        const pxPerMmWidth = refScaledWidth / this.options.referenceWidth;
        const pxPerMmHeight = refScaledHeight / this.options.referenceHeight;
        
        // Средний коэффициент
        const pxPerMm = (pxPerMmWidth + pxPerMmHeight) / 2;
        
        // Рассчитываем размеры изделия в мм
        const productWidthMm = (prodScaledWidth / pxPerMm).toFixed(2);
        const productHeightMm = (prodScaledHeight / pxPerMm).toFixed(2);
        
        // Обновляем отображение
        const widthDisplay = document.getElementById('calculatedWidth');
        const heightDisplay = document.getElementById('calculatedHeight');
        
        if (widthDisplay) widthDisplay.textContent = `${productWidthMm} мм`;
        if (heightDisplay) heightDisplay.textContent = `${productHeightMm} мм`;
        
        // Сохраняем в скрытые поля формы
        const widthInput = document.getElementById('id_width_mm');
        const heightInput = document.getElementById('id_height_mm');
        
        if (widthInput) widthInput.value = productWidthMm;
        if (heightInput) heightInput.value = productHeightMm;
        
        // Сохраняем данные редактора
        this.saveEditorData();
    }
    
    saveEditorData() {
        if (!this.productImg) return;
        
        const editorData = {
            productImage: {
                left: this.productImg.left,
                top: this.productImg.top,
                scaleX: this.productImg.scaleX,
                scaleY: this.productImg.scaleY,
                angle: this.productImg.angle
            },
            referenceOpacity: this.referenceOpacity,
            timestamp: Date.now()
        };
        
        const editorDataInput = document.getElementById('id_editor_data');
        if (editorDataInput) {
            editorDataInput.value = JSON.stringify(editorData);
        }
    }
    
    showStatus(message, type = 'info') {
        let statusEl = this.container.querySelector('.editor-status');
        
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.className = 'editor-status';
            this.container.insertBefore(statusEl, this.container.firstChild);
        }
        
        statusEl.className = `editor-status ${type}`;
        statusEl.textContent = message;
        
        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            statusEl.style.opacity = '0';
            setTimeout(() => {
                if (statusEl.parentNode) {
                    statusEl.remove();
                }
            }, 300);
        }, 5000);
    }
    
    exportImage() {
        if (!this.canvas || !this.productImg) {
            this.showStatus('⚠ Сначала загрузите изделие', 'warning');
            return null;
        }
        
        // Временно скрываем эталон
        if (this.referenceImg) {
            this.referenceImg.set('opacity', 0);
        }
        
        this.canvas.renderAll();
        
        // Экспортируем только изделие
        const dataURL = this.canvas.toDataURL({
            format: 'png',
            quality: 1
        });
        
        // Возвращаем эталон
        if (this.referenceImg) {
            this.referenceImg.set('opacity', this.referenceOpacity);
            this.canvas.renderAll();
        }
        
        return dataURL;
    }
    
    getCalculatedDimensions() {
        const widthInput = document.getElementById('id_width_mm');
        const heightInput = document.getElementById('id_height_mm');
        
        return {
            width: widthInput ? parseFloat(widthInput.value) : null,
            height: heightInput ? parseFloat(heightInput.value) : null
        };
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const editorContainer = document.getElementById('imageEditorContainer');
    
    if (editorContainer) {
        // Получаем данные из data-атрибутов
        const referenceImage = editorContainer.dataset.referenceImage;
        const referenceWidth = parseFloat(editorContainer.dataset.referenceWidth);
        const referenceHeight = parseFloat(editorContainer.dataset.referenceHeight);
        
        // Создаём экземпляр редактора
        window.jewelryEditor = new JewelryImageEditor('imageEditorContainer', {
            referenceImage: referenceImage,
            referenceWidth: referenceWidth,
            referenceHeight: referenceHeight
        });
    }
});

// Валидация формы перед отправкой
document.addEventListener('DOMContentLoaded', function() {
    const productForm = document.querySelector('form[data-editor-form]');
    
    if (productForm) {
        productForm.addEventListener('submit', function(e) {
            const widthInput = document.getElementById('id_width_mm');
            const heightInput = document.getElementById('id_height_mm');
            
            if (!widthInput.value || !heightInput.value) {
                e.preventDefault();
                alert('Пожалуйста, подгоните изделие под эталон для автоматического расчёта размеров.');
                return false;
            }
            
            return true;
        });
    }
});