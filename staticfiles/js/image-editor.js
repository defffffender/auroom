// Редактор изображений с эталоном для ювелирных изделий
// ФИКС 1: Canvas не выходит за границы контейнера

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
            referenceWidth: options.referenceWidth || 50,
            referenceHeight: options.referenceHeight || 60,
            ...options
        };
        
        this.canvas = null;
        this.referenceImg = null;
        this.productImg = null;
        this.referenceOpacity = 0.5;
        this.productOpacity = 1.0;
        this.currentZoom = 1;
        this.cropRect = null;
        this.cropMode = false;
        this.cropData = null;
        
        // 🔄 ФИКС 2: История для Undo/Redo
        this.history = [];
        this.historyStep = -1;
        this.maxHistory = 20;
        
        // 🧲 ФИКС 3: Snap to reference
        this.snapEnabled = true;
        this.snapThreshold = 15; // пиксели

        this.init();
    }
    
    init() {
    // 🔧 ФИКС: Даём время DOM обновиться перед созданием canvas
    setTimeout(() => {
        this.createCanvas();
        if (this.options.referenceImage) {
            this.loadReferenceImage();
        }
        this.attachEventListeners();
    }, 100);
}
    
    createCanvas() {
    // 🔧 ФИКС: Удаляем старый canvas если есть
    const existingCanvas = document.getElementById('fabricCanvas');
    if (existingCanvas) {
        existingCanvas.remove();
    }
    
    const existingContainer = this.container.querySelector('.canvas-container');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    const canvasEl = document.createElement('canvas');
    canvasEl.id = 'fabricCanvas';
    
    // 🔧 ФИКС: Правильный расчёт размеров контейнера
    const canvasWrapper = this.container.querySelector('.canvas-container-wrapper');
    if (!canvasWrapper) {
        console.error('❌ canvas-container-wrapper не найден!');
        return;
    }
    
    // Получаем размеры с учётом padding
    const wrapperRect = canvasWrapper.getBoundingClientRect();
    const wrapperStyles = window.getComputedStyle(canvasWrapper);
    const paddingLeft = parseInt(wrapperStyles.paddingLeft);
    const paddingRight = parseInt(wrapperStyles.paddingRight);
    const paddingTop = parseInt(wrapperStyles.paddingTop);
    const paddingBottom = parseInt(wrapperStyles.paddingBottom);
    
    // Доступная ширина = ширина wrapper минус padding
    const availableWidth = wrapperRect.width - paddingLeft - paddingRight;
    const availableHeight = wrapperRect.height - paddingTop - paddingBottom;
    
    // Ограничиваем размеры
    const maxWidth = Math.min(availableWidth, 800);
    const maxHeight = Math.min(availableHeight, 600);
    
    // 🔧 ФИКС: Проверяем что размеры положительные
    if (maxWidth <= 0 || maxHeight <= 0) {
        console.error('❌ Некорректные размеры canvas:', maxWidth, maxHeight);
        return;
    }
    
    canvasEl.width = maxWidth;
    canvasEl.height = maxHeight;
    
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'canvas-container';
    canvasContainer.style.maxWidth = maxWidth + 'px';
    canvasContainer.style.maxHeight = maxHeight + 'px';
    canvasContainer.style.overflow = 'hidden';
    canvasContainer.style.position = 'relative';
    
    canvasContainer.appendChild(canvasEl);
    canvasWrapper.appendChild(canvasContainer);
    
    // 🔧 ФИКС: Удаляем старый canvas instance перед созданием нового
    if (this.canvas) {
        try {
            this.canvas.dispose();
        } catch (e) {
            console.warn('Ошибка при удалении старого canvas:', e);
        }
        this.canvas = null;
    }
    
    this.canvas = new fabric.Canvas('fabricCanvas', {
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
        width: maxWidth,
        height: maxHeight
    });
    
    this.canvas.wrapperEl.style.overflow = 'hidden';
    this.canvas.wrapperEl.style.maxWidth = maxWidth + 'px';
    this.canvas.wrapperEl.style.maxHeight = maxHeight + 'px';
    
    console.log(`✅ Canvas создан: ${maxWidth}x${maxHeight}px`);
}
    
    loadReferenceImage() {
        const loadingOverlay = this.container.querySelector('.loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.add('active');
        
        fabric.Image.fromURL(this.options.referenceImage, (img) => {
            const scale = Math.min(
                this.canvas.width / img.width,
                this.canvas.height / img.height
            ) * 0.8;
            
            img.set({
                left: this.canvas.width / 2,
                top: this.canvas.height / 2,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                opacity: this.referenceOpacity,
                selectable: false,
                evented: false,
                hasControls: false,
                hasBorders: false
            });
            
            this.referenceImg = img;
            this.canvas.add(img);
            this.canvas.sendToBack(img);
            this.canvas.renderAll();
            
            if (loadingOverlay) loadingOverlay.classList.remove('active');
            
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
                if (this.productImg) {
                    this.canvas.remove(this.productImg);
                }
                
                const scale = Math.min(
                    this.canvas.width / img.width,
                    this.canvas.height / img.height
                ) * 0.5;
                
                img.set({
                    left: this.canvas.width / 2,
                    top: this.canvas.height / 2,
                    originX: 'center',
                    originY: 'center',
                    scaleX: scale,
                    scaleY: scale,
                    opacity: this.productOpacity
                });
                
                this.productImg = img;
                this.canvas.add(img);
                this.canvas.setActiveObject(img);
                this.canvas.bringToFront(img);
                this.canvas.renderAll();
                
                this.enableControls();
                this.updateDimensions();
                
                // 🔄 Сохраняем начальное состояние в историю
                this.saveState();
                
                if (loadingOverlay) loadingOverlay.classList.remove('active');
                
                this.showStatus('✓ Изделие загружено. Подгоните его под эталон.', 'success');
            });
        };
        
        reader.readAsDataURL(file);
    }
    
    attachEventListeners() {
    // Прозрачность эталона
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

    // Прозрачность изделия
    const productOpacitySlider = document.getElementById('productOpacity');
    const opacityValueDisplay = document.querySelector('.opacity-value');
    if (productOpacitySlider) {
        productOpacitySlider.addEventListener('input', (e) => {
            this.productOpacity = parseFloat(e.target.value);
            if (this.productImg) {
                this.productImg.set('opacity', this.productOpacity);
                this.canvas.renderAll();
            }
            if (opacityValueDisplay) {
                opacityValueDisplay.textContent = `${Math.round(this.productOpacity * 100)}%`;
            }
        });
    }
    
    // Загрузка файла
    const fileInput = document.getElementById('productImageInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.loadProductImage(e.target.files[0]);
            }
        });
    }
    
    // Zoom кнопки
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
    
    // 📄 Undo/Redo кнопки
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) {
        undoBtn.addEventListener('click', () => this.undo());
    }
    if (redoBtn) {
        redoBtn.addEventListener('click', () => this.redo());
    }
    
    // 🧲 ИСПРАВЛЕНО: Кнопка Toggle Snap
    const snapBtn = document.getElementById('toggleSnapBtn');
    if (snapBtn) {
        snapBtn.addEventListener('click', () => this.toggleSnap());
    }
    
    // 👁️ ИСПРАВЛЕНО: Кнопка предпросмотра
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => this.showPreview());
    }
    
    // 📄 Горячие клавиши
    document.addEventListener('keydown', (e) => {
        // Ctrl+Z или Cmd+Z = Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }
        // Ctrl+Shift+Z или Cmd+Shift+Z = Redo
        else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
            e.preventDefault();
            this.redo();
        }
        // Ctrl+Y или Cmd+Y = Redo (альтернатива)
        else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            this.redo();
        }
    });
    
    // События Canvas
    this.canvas.on('object:modified', () => {
        this.saveState();
        this.updateDimensions();
    });
    
    this.canvas.on('object:scaling', () => {
        this.updateDimensions();
    });
    
    // 🧲 Магнитное прилипание при перемещении
    this.canvas.on('object:moving', (e) => {
        if (this.snapEnabled && e.target === this.productImg && this.referenceImg) {
            this.applySnap(e.target);
        }
        this.updateDimensions();
    });
}
    
    // 🧲 НОВЫЙ МЕТОД: Применить магнитное прилипание
    applySnap(obj) {
        if (!this.referenceImg) return;
        
        const ref = this.referenceImg;
        const threshold = this.snapThreshold;
        
        // Центр эталона
        const refCenterX = ref.left;
        const refCenterY = ref.top;
        
        // Края эталона
        const refLeft = ref.left - (ref.width * ref.scaleX) / 2;
        const refRight = ref.left + (ref.width * ref.scaleX) / 2;
        const refTop = ref.top - (ref.height * ref.scaleY) / 2;
        const refBottom = ref.top + (ref.height * ref.scaleY) / 2;
        
        // Края объекта
        const objLeft = obj.left - (obj.width * obj.scaleX) / 2;
        const objRight = obj.left + (obj.width * obj.scaleX) / 2;
        const objTop = obj.top - (obj.height * obj.scaleY) / 2;
        const objBottom = obj.top + (obj.height * obj.scaleY) / 2;
        
        // Привязка к центру эталона
        if (Math.abs(obj.left - refCenterX) < threshold) {
            obj.set({ left: refCenterX });
            this.showSnapGuide('vertical', refCenterX);
        }
        
        if (Math.abs(obj.top - refCenterY) < threshold) {
            obj.set({ top: refCenterY });
            this.showSnapGuide('horizontal', refCenterY);
        }
        
        // Привязка к краям эталона (выравнивание левых краёв)
        if (Math.abs(objLeft - refLeft) < threshold) {
            obj.set({ left: refLeft + (obj.width * obj.scaleX) / 2 });
            this.showSnapGuide('vertical', refLeft);
        }
        
        // Выравнивание правых краёв
        if (Math.abs(objRight - refRight) < threshold) {
            obj.set({ left: refRight - (obj.width * obj.scaleX) / 2 });
            this.showSnapGuide('vertical', refRight);
        }
        
        // Выравнивание верхних краёв
        if (Math.abs(objTop - refTop) < threshold) {
            obj.set({ top: refTop + (obj.height * obj.scaleY) / 2 });
            this.showSnapGuide('horizontal', refTop);
        }
        
        // Выравнивание нижних краёв
        if (Math.abs(objBottom - refBottom) < threshold) {
            obj.set({ top: refBottom - (obj.height * obj.scaleY) / 2 });
            this.showSnapGuide('horizontal', refBottom);
        }
        
        obj.setCoords();
    }
    
    // 🧲 НОВЫЙ МЕТОД: Показать направляющую при прилипании
    showSnapGuide(type, position) {
        // Удаляем старые направляющие
        this.clearSnapGuides();
        
        const guide = new fabric.Line(
            type === 'vertical' 
                ? [position, 0, position, this.canvas.height]
                : [0, position, this.canvas.width, position],
            {
                stroke: '#00ff00',
                strokeWidth: 1,
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false,
                opacity: 0.7
            }
        );
        
        guide.set('snapGuide', true);
        this.canvas.add(guide);
        this.canvas.sendToBack(guide);
        
        // Автоматически удалить через 500ms
        setTimeout(() => this.clearSnapGuides(), 500);
    }
    
    // 🧲 НОВЫЙ МЕТОД: Очистить направляющие
    clearSnapGuides() {
        const objects = this.canvas.getObjects();
        objects.forEach(obj => {
            if (obj.snapGuide) {
                this.canvas.remove(obj);
            }
        });
        this.canvas.renderAll();
    }
    
    // 🧲 НОВЫЙ МЕТОД: Переключить snap
    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
        const snapBtn = document.getElementById('toggleSnapBtn');
        if (snapBtn) {
            if (this.snapEnabled) {
                snapBtn.textContent = '🧲 Магнит: ВКЛ';
                snapBtn.classList.add('active');
                this.showStatus('🧲 Магнитное прилипание включено', 'success');
            } else {
                snapBtn.textContent = '🧲 Магнит: ВЫКЛ';
                snapBtn.classList.remove('active');
                this.showStatus('Магнитное прилипание выключено', 'info');
            }
        }
    }
    
    // 🔄 НОВЫЕ МЕТОДЫ: Undo/Redo
    saveState() {
    // 🔧 ФИКС: Проверяем что canvas и изображение существуют
    if (!this.productImg || !this.canvas) {
        console.warn('⚠️ Невозможно сохранить состояние: нет изображения или canvas');
        return;
    }
    
    const state = {
        left: this.productImg.left,
        top: this.productImg.top,
        scaleX: this.productImg.scaleX,
        scaleY: this.productImg.scaleY,
        angle: this.productImg.angle,
        opacity: this.productImg.opacity
    };
    
    // Удаляем всё после текущего шага
    this.history = this.history.slice(0, this.historyStep + 1);
    
    // Добавляем новое состояние
    this.history.push(state);
    
    // Ограничиваем размер истории
    if (this.history.length > this.maxHistory) {
        this.history.shift();
    } else {
        this.historyStep++;
    }
    
    this.updateUndoRedoButtons();
    console.log(`💾 Состояние сохранено (${this.historyStep + 1}/${this.history.length})`);
}
    
    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState(this.history[this.historyStep]);
            this.updateUndoRedoButtons();
            this.showStatus('↶ Отменено', 'info');
        }
    }
    
    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState(this.history[this.historyStep]);
            this.updateUndoRedoButtons();
            this.showStatus('↷ Возвращено', 'info');
        }
    }
    
    restoreState(state) {
        if (!this.productImg) return;
        
        this.productImg.set(state);
        this.canvas.renderAll();
        this.updateDimensions();
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) undoBtn.disabled = this.historyStep <= 0;
        if (redoBtn) redoBtn.disabled = this.historyStep >= this.history.length - 1;
    }
    
enableControls() {
    // Включаем все отключенные контролы
    const controls = this.container.querySelectorAll('.control-btn:disabled, #productOpacity:disabled, .zoom-btn:disabled');
    controls.forEach(btn => btn.disabled = false);
    
    // 👁️ ИСПРАВЛЕНО: Явно включаем кнопку предпросмотра
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.disabled = false;
    }
    
    // 🧲 Убеждаемся что магнит работает
    const snapBtn = document.getElementById('toggleSnapBtn');
    if (snapBtn) {
        snapBtn.disabled = false;
        if (this.snapEnabled) {
            snapBtn.classList.add('active');
            snapBtn.textContent = '🧲 Магнит: ВКЛ';
        }
    }
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
            left: this.canvas.width / 2,
            top: this.canvas.height / 2,
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
    
    createCropRect() {
        if (!this.productImg) return;
        
        const rectWidth = this.productImg.width * this.productImg.scaleX * 0.8;
        const rectHeight = this.productImg.height * this.productImg.scaleY * 0.8;
        
        this.cropRect = new fabric.Rect({
            left: this.productImg.left - rectWidth / 2,
            top: this.productImg.top - rectHeight / 2,
            width: rectWidth,
            height: rectHeight,
            fill: 'transparent',
            stroke: '#00ff00',
            strokeWidth: 3,
            strokeDashArray: [10, 5],
            cornerColor: '#00ff00',
            cornerSize: 12,
            transparentCorners: false,
            lockRotation: true,
            hasRotatingPoint: false
        });
        
        this.canvas.add(this.cropRect);
        this.canvas.setActiveObject(this.cropRect);
        this.canvas.bringToFront(this.cropRect);
        this.canvas.renderAll();
    }
    
    enableCropMode() {
        if (!this.productImg) {
            this.showStatus('⚠ Сначала загрузите изделие', 'warning');
            return;
        }
        
        this.cropMode = true;
        
        this.productImg.set({
            selectable: false,
            evented: false
        });
        
        if (this.referenceImg) {
            this.referenceImg.set('opacity', 0.2);
        }
        
        this.createCropRect();
        
        this.showStatus('✂️ Обведите рамкой только само изделие (без фона)', 'success');
        this.canvas.renderAll();
    }
    
    applyCrop() {
        if (!this.cropRect || !this.productImg) return;
        
        const cropData = {
            left: this.cropRect.left,
            top: this.cropRect.top,
            width: this.cropRect.width * this.cropRect.scaleX,
            height: this.cropRect.height * this.cropRect.scaleY
        };
        
        this.canvas.remove(this.cropRect);
        this.cropRect = null;
        this.cropMode = false;
        
        this.productImg.set({
            selectable: true,
            evented: true
        });
        
        if (this.referenceImg) {
            this.referenceImg.set('opacity', this.referenceOpacity);
        }
        
        this.cropData = cropData;
        
        this.updateDimensionsWithCrop();
        
        this.showStatus('✓ Область изделия выделена. Теперь подгоните под эталон.', 'success');
        this.canvas.renderAll();
    }
    
    cancelCrop() {
        if (this.cropRect) {
            this.canvas.remove(this.cropRect);
            this.cropRect = null;
        }
        
        this.cropMode = false;
        
        if (this.productImg) {
            this.productImg.set({
                selectable: true,
                evented: true
            });
        }
        
        if (this.referenceImg) {
            this.referenceImg.set('opacity', this.referenceOpacity);
        }
        
        this.canvas.renderAll();
    }
    
    updateDimensionsWithCrop() {
        if (!this.productImg || !this.referenceImg) return;
        
        const refScaledWidth = this.referenceImg.width * this.referenceImg.scaleX;
        const refScaledHeight = this.referenceImg.height * this.referenceImg.scaleY;
        
        let prodScaledWidth, prodScaledHeight;
        
        if (this.cropData) {
            prodScaledWidth = this.cropData.width;
            prodScaledHeight = this.cropData.height;
        } else {
            prodScaledWidth = this.productImg.width * this.productImg.scaleX;
            prodScaledHeight = this.productImg.height * this.productImg.scaleY;
        }
        
        const pxPerMmWidth = refScaledWidth / this.options.referenceWidth;
        const pxPerMmHeight = refScaledHeight / this.options.referenceHeight;
        const pxPerMm = (pxPerMmWidth + pxPerMmHeight) / 2;
        
        const productWidthMm = (prodScaledWidth / pxPerMm).toFixed(2);
        const productHeightMm = (prodScaledHeight / pxPerMm).toFixed(2);
        
        // 🔧 НОВОЕ: Расчет диаметра для колец
        let diameterMm = null;
        const referenceType = document.querySelector('[name="reference_photo_type"]')?.value;
        
        if (referenceType === 'finger') {
            // Для колец диаметр = средняя из ширины и высоты
            diameterMm = ((parseFloat(productWidthMm) + parseFloat(productHeightMm)) / 2).toFixed(2);
            
            const diameterInput = document.getElementById('id_diameter_mm');
            if (diameterInput) diameterInput.value = diameterMm;
            
            console.log(`💍 Диаметр кольца: ${diameterMm} мм`);
        }
        
        const widthDisplay = document.getElementById('calculatedWidth');
        const heightDisplay = document.getElementById('calculatedHeight');
        
        if (widthDisplay) widthDisplay.textContent = `${productWidthMm} мм`;
        if (heightDisplay) heightDisplay.textContent = `${productHeightMm} мм`;
        
        const widthInput = document.getElementById('id_width_mm');
        const heightInput = document.getElementById('id_height_mm');
        
        if (widthInput) widthInput.value = productWidthMm;
        if (heightInput) heightInput.value = productHeightMm;
        
        this.saveEditorData();
    }
    
    updateDimensions() {
        this.updateDimensionsWithCrop();
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
            cropData: this.cropData,
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
        statusEl.style.opacity = '1';
        
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
    
    // 🔧 ФИКС: Убираем выделение и контролы перед экспортом
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
    
    // Скрываем эталон
    const refWasVisible = this.referenceImg && this.referenceImg.opacity > 0;
    if (this.referenceImg) {
        this.referenceImg.set('opacity', 0);
    }
    
    // Сохраняем оригинальную прозрачность изделия
    const originalOpacity = this.productImg.opacity;
    this.productImg.set('opacity', 1.0);
    
    this.canvas.renderAll();
    
    // 📐 Получаем границы изделия на canvas
    const productBounds = this.productImg.getBoundingRect();
    
    // Добавляем небольшой отступ (5% от размера)
    const padding = Math.max(productBounds.width, productBounds.height) * 0.05;
    
    const cropX = Math.max(0, productBounds.left - padding);
    const cropY = Math.max(0, productBounds.top - padding);
    const cropWidth = Math.min(
        productBounds.width + padding * 2,
        this.canvas.width - cropX
    );
    const cropHeight = Math.min(
        productBounds.height + padding * 2,
        this.canvas.height - cropY
    );
    
    // 🎨 Создаём временный canvas для обрезки
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 🔧 ФИКС: Копируем ТОЛЬКО нижний слой (без контролов)
    tempCtx.drawImage(
        this.canvas.lowerCanvasEl,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
    );
    
    // Получаем dataURL из временного canvas
    const dataURL = tempCanvas.toDataURL('image/png', 1.0);
    
    // Восстанавливаем состояние
    this.productImg.set('opacity', originalOpacity);
    if (this.referenceImg && refWasVisible) {
        this.referenceImg.set('opacity', this.referenceOpacity);
    }
    
    // 🔧 ФИКС: Возвращаем выделение объекта
    this.canvas.setActiveObject(this.productImg);
    this.canvas.renderAll();
    
    console.log(`✂️ Изделие обрезано: ${cropWidth.toFixed(0)}x${cropHeight.toFixed(0)}px`);
    
    return dataURL;
}
    
    dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    getCalculatedDimensions() {
        const widthInput = document.getElementById('id_width_mm');
        const heightInput = document.getElementById('id_height_mm');
        const diameterInput = document.getElementById('id_diameter_mm');
        
        return {
            width: widthInput ? parseFloat(widthInput.value) : null,
            height: heightInput ? parseFloat(heightInput.value) : null,
            diameter: diameterInput ? parseFloat(diameterInput.value) : null
        };
    }
    
    // 👁️ НОВЫЙ МЕТОД: Показать предпросмотр
    showPreview() {
        if (!this.productImg) {
            this.showStatus('⚠ Сначала загрузите изделие', 'warning');
            return;
        }
        
        const imageDataURL = this.exportImage();
        const dims = this.getCalculatedDimensions();
        const referenceType = document.querySelector('[name="reference_photo_type"]')?.value;
        
        // Создаём модальное окно
        const modal = this.createPreviewModal(imageDataURL, dims, referenceType);
        document.body.appendChild(modal);
        
        // Анимация появления
        setTimeout(() => modal.classList.add('active'), 10);
    }
    
    // 👁️ НОВЫЙ МЕТОД: Создать модальное окно предпросмотра
    createPreviewModal(imageDataURL, dims, referenceType) {
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        modal.id = 'previewModal';
        
        const referenceNames = {
            'ear': '👂 Серьги',
            'finger': '💍 Кольцо',
            'wrist': '⌚ Браслет',
            'neck': '📿 Колье/Подвеска',
            'none': 'Без эталона'
        };
        
        modal.innerHTML = `
            <div class="preview-modal-content">
        <div class="preview-modal-header">
            <h3>👁️ Предпросмотр товара</h3>
            <button type="button" class="preview-close" onclick="this.closest('.preview-modal').remove()">✕</button>
        </div>
        
        <div class="preview-modal-body">
            <div class="preview-image-section">
                <img src="${imageDataURL}" 
                     alt="Предпросмотр" 
                     class="preview-image"
                     style="max-width: 100%; max-height: 400px; object-fit: contain;">
                <p class="preview-note">Так будет выглядеть фото товара</p>
            </div>
                    
                    <div class="preview-info-section">
                        <h4>📐 Размеры изделия</h4>
                        <div class="preview-dimensions">
                            ${dims.width ? `<div class="preview-dim-item">
                                <span class="preview-dim-label">Ширина:</span>
                                <span class="preview-dim-value">${dims.width} мм</span>
                            </div>` : ''}
                            
                            ${dims.height ? `<div class="preview-dim-item">
                                <span class="preview-dim-label">Высота:</span>
                                <span class="preview-dim-value">${dims.height} мм</span>
                            </div>` : ''}
                            
                            ${dims.diameter ? `<div class="preview-dim-item">
                                <span class="preview-dim-label">Диаметр:</span>
                                <span class="preview-dim-value">${dims.diameter} мм</span>
                            </div>` : ''}
                        </div>
                        
                        <div class="preview-reference-type">
                            <strong>Тип:</strong> ${referenceNames[referenceType] || 'Не указан'}
                        </div>
                        
                        <div class="preview-actions">
                            <button type="button" class="btn btn-success" onclick="document.querySelector('form[data-editor-form]').requestSubmit()">
                                ✓ Всё верно, сохранить товар
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.preview-modal').remove()">
                                ✏️ Вернуться к редактированию
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="preview-modal-backdrop" onclick="this.parentElement.remove()"></div>
        `;
        
        return modal;
    }
}

// Инициализация при загрузке страницы

// Crop mode handlers - подключаются после создания редактора в product_add.html
document.addEventListener('DOMContentLoaded', function() {
    // Crop кнопки обрабатываются отдельно в product_add.html
    const startCropBtn = document.getElementById('startCropBtn');
    const applyCropBtn = document.getElementById('applyCropBtn');
    const cancelCropBtn = document.getElementById('cancelCropBtn');
    
    if (startCropBtn) {
        startCropBtn.addEventListener('click', () => {
            if (window.jewelryEditor) {
                window.jewelryEditor.enableCropMode();
                startCropBtn.style.display = 'none';
                applyCropBtn.style.display = 'inline-block';
                cancelCropBtn.style.display = 'inline-block';
            }
        });
    }
    
    if (applyCropBtn) {
        applyCropBtn.addEventListener('click', () => {
            if (window.jewelryEditor) {
                window.jewelryEditor.applyCrop();
                startCropBtn.style.display = 'inline-block';
                applyCropBtn.style.display = 'none';
                cancelCropBtn.style.display = 'none';
            }
        });
    }
    
    if (cancelCropBtn) {
        cancelCropBtn.addEventListener('click', () => {
            if (window.jewelryEditor) {
                window.jewelryEditor.cancelCrop();
                startCropBtn.style.display = 'inline-block';
                applyCropBtn.style.display = 'none';
                cancelCropBtn.style.display = 'none';
            }
        });
    }
});


// Валидация формы перед отправкой
document.addEventListener('DOMContentLoaded', function() {
    const productForm = document.querySelector('form[data-editor-form]');
    
    if (productForm) {
        let isSubmitting = false;
        
        productForm.addEventListener('submit', function(e) {
            const referenceType = document.querySelector('[name="reference_photo_type"]');
            const widthInput = document.getElementById('id_width_mm');
            const heightInput = document.getElementById('id_height_mm');
            
            // Если НЕ выбран эталон - отправляем форму как обычно
            if (!referenceType || referenceType.value === 'none') {
                console.log('📤 Отправка формы без эталона (обычный submit)');
                return true; // Разрешаем стандартную отправку
            }
            
            // Если выбран эталон - проверяем подгонку
            e.preventDefault();
            
            // Проверяем флаг отправки
            if (isSubmitting) {
                console.log('⸙ Форма уже отправляется');
                return false;
            }
            
            if (!widthInput.value || !heightInput.value) {
                alert('Пожалуйста, подгоните изделие под эталон для автоматического расчёта размеров.');
                return false;
            }
            
            if (!window.jewelryEditor || !window.jewelryEditor.productImg) {
                alert('Пожалуйста, загрузите фото изделия в редактор.');
                return false;
            }
            
            // 🔧 ФИКС: Вызываем exportImage только ОДИН раз
            console.log('📸 Экспортируем изображение...');
            const imageDataURL = window.jewelryEditor.exportImage();
            
            if (!imageDataURL) {
                alert('Ошибка при экспорте изображения.');
                return false;
            }
            
            // Устанавливаем флаг
            isSubmitting = true;
            
            const blob = window.jewelryEditor.dataURLtoBlob(imageDataURL);
            const formData = new FormData(productForm);
            formData.append('canvas_image', blob, 'product_fitted.png');
            
            // Показываем загрузку
            const submitBtn = productForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Сохранение...';
            
            console.log('📤 Отправляем форму через AJAX...');
            
            fetch(productForm.action || window.location.href, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => {
                console.log('📥 Response:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('✅ Получен ответ:', data);
                
                if (data.success) {
                    console.log('✅ Товар сохранён, редирект...');
                    window.location.href = data.redirect_url || '/dashboard/';
                } else {
                    console.error('❌ Ошибки формы:', data.errors);
                    alert('Ошибка при сохранении товара. Проверьте заполнение всех полей.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    isSubmitting = false;
                }
            })
            .catch(error => {
                console.error('❌ Ошибка отправки:', error);
                alert('Произошла ошибка при сохранении товара: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                isSubmitting = false;
            });
            
            return false;
        });
    }
});