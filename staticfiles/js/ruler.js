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
            editorData: options.editorData || null, // 📐 НОВОЕ: Данные калибровки
            ...options
        };

        // 📐 НОВОЕ: Извлекаем калибровочные данные
        this.calibration = null;
        if (this.options.editorData) {
            try {
                const parsed = typeof this.options.editorData === 'string'
                    ? JSON.parse(this.options.editorData)
                    : this.options.editorData;
                this.calibration = parsed.calibration || null;

                if (this.calibration && this.calibration.pxPerMm) {
                    console.log('✅ Калибровка загружена из editor_data:', this.calibration);
                } else {
                    console.warn('⚠️ editor_data есть, но калибровка отсутствует. Используем fallback.');
                }
            } catch (e) {
                console.warn('⚠️ Ошибка парсинга editor_data:', e);
            }
        } else {
            console.warn('⚠️ editor_data не предоставлен. Линейка будет показывать пиксели вместо мм.');
        }

        // Режим 1: Рисование линий (простой)
        this.drawMode = false;
        this.lines = [];
        this.currentPoints = [];
        this.maxLines = 2;

        // Режим 2: Координатная сетка + рисование линий (комбо!)
        this.gridMode = false;
        this.gridLines = [];
        this.gridCurrentPoints = [];

        // Режим 3: Перпендикулярные линии от курсора
        this.perpendicularMode = false;

        this.canvas = null;
        this.imageWrapper = null;

        this.init();
    }
    
    init() {
        this.createControls();
        this.setupCanvas();
        this.attachEventListeners();
    }
    
    createControls() {
        const controlsHTML = `
            <div class="ruler-controls">
                <div class="ruler-toggle-section">
                    <div class="ruler-main-buttons">
                        <button class="ruler-btn" id="toggleDrawModeBtn">
                            ✏️ Рисование линий
                        </button>
                        <button class="ruler-btn" id="toggleGridModeBtn">
                            📐 Координаты + Линейка
                        </button>
                        <button class="ruler-btn" id="togglePerpendicularBtn">
                            📏 Перпендикуляр
                        </button>
                    </div>
                    <button class="ruler-btn ruler-btn-small ruler-btn-secondary" id="clearRulerBtn" style="opacity: 0; pointer-events: none; transition: opacity 0.3s;">
                        🗑️ Очистить
                    </button>
                </div>
                
                <!-- Инфо для режима простого рисования -->
                <div class="ruler-info" id="drawModeInfo" style="display:none;">
                    <p class="ruler-instruction">
                        <strong>📏 Режим рисования линий:</strong><br>
                        Кликните на изображении 4 раза, чтобы нарисовать 2 линии с измерениями.
                    </p>
                    <div class="ruler-status" id="drawStatus">
                        Кликните на первую точку...
                    </div>
                </div>
                
                <!-- Инфо для режима сетки + рисования (КОМБО!) -->
                <div class="ruler-info ruler-info-grid" id="gridModeInfo" style="display:none;">
                    <p class="ruler-instruction">
                        <strong>📐 Режим координат + линейка:</strong><br>
                        • Наведите курсор для координат в мм<br>
                        • Кликните 4 раза, чтобы нарисовать 2 линии с измерениями
                    </p>
                    <div class="ruler-coordinates" id="coordinatesDisplay">
                        <span>X: <strong id="coordX">0</strong> мм</span>
                        <span>Y: <strong id="coordY">0</strong> мм</span>
                    </div>
                    <div class="ruler-status" id="gridDrawStatus" style="margin-top: 1rem;">
                        Наведите курсор или кликните для рисования линии...
                    </div>
                </div>
                
                <!-- Инфо для режима перпендикуляра -->
                <div class="ruler-info ruler-info-perpendicular" id="perpendicularInfo" style="display:none;">
                    <p class="ruler-instruction">
                        <strong>📏 Режим перпендикуляра:</strong><br>
                        Наведите курсор на изображение. От курсора идут две перпендикулярные линии (90°).
                    </p>
                    <div class="ruler-coordinates">
                        <span>↑ Вверх: <strong id="perpendicularUp">0</strong> мм</span>
                        <span>→ Вправо: <strong id="perpendicularRight">0</strong> мм</span>
                    </div>
                </div>
            </div>
            
            ${this.getReferenceInfo()}
        `;
        
        this.container.insertAdjacentHTML('afterbegin', controlsHTML);
    }
    
    getReferenceInfo() {
        const referenceTypes = {
            'ear': '👂 Фото на фоне уха',
            'finger': '💍 Фото на пальце',
            'wrist': '⌚ Фото на запястье',
            'neck': '📿 Фото на шее'
        };
        
        if (this.options.referenceType && this.options.referenceType !== 'none') {
            return `
                <div class="reference-info-ruler">
                    <strong>📏 Эталон:</strong> ${referenceTypes[this.options.referenceType] || ''}<br>
                    ${this.getDimensionsText()}
                </div>
            `;
        }
        return '';
    }
    
    getDimensionsText() {
        const dims = [];
        if (this.options.widthMm) dims.push(`Ширина: ${this.options.widthMm} мм`);
        if (this.options.heightMm) dims.push(`Высота: ${this.options.heightMm} мм`);
        return dims.length ? `<strong>Размеры:</strong> ${dims.join(' × ')}` : '';
    }
    
    setupCanvas() {
        this.imageWrapper = this.container.querySelector('.ruler-image-wrapper');
        if (!this.imageWrapper) return;
        
        const img = this.imageWrapper.querySelector('img');
        if (!img) return;
        
        const canvas = document.createElement('canvas');
        canvas.id = 'rulerCanvas';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.display = 'none';
        
        img.onload = () => {
            canvas.width = img.offsetWidth;
            canvas.height = img.offsetHeight;
        };
        
        if (img.complete) {
            canvas.width = img.offsetWidth;
            canvas.height = img.offsetHeight;
        }
        
        this.imageWrapper.style.position = 'relative';
        this.imageWrapper.appendChild(canvas);
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }
    
    attachEventListeners() {
        const drawBtn = document.getElementById('toggleDrawModeBtn');
        const gridBtn = document.getElementById('toggleGridModeBtn');
        const perpendicularBtn = document.getElementById('togglePerpendicularBtn');
        const clearBtn = document.getElementById('clearRulerBtn');
        
        if (drawBtn) {
            drawBtn.addEventListener('click', () => this.toggleDrawMode());
        }
        
        if (gridBtn) {
            gridBtn.addEventListener('click', () => this.toggleGridMode());
        }
        
        if (perpendicularBtn) {
            perpendicularBtn.addEventListener('click', () => this.togglePerpendicularMode());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLines());
        }
        
        if (this.canvas) {
            this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
            this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        }
    }
    
    toggleDrawMode() {
        if (this.gridMode) this.toggleGridMode();
        if (this.perpendicularMode) this.togglePerpendicularMode();
        
        this.drawMode = !this.drawMode;
        
        const drawBtn = document.getElementById('toggleDrawModeBtn');
        const clearBtn = document.getElementById('clearRulerBtn');
        const drawInfo = document.getElementById('drawModeInfo');
        
        if (this.drawMode) {
            this.canvas.style.display = 'block';
            this.canvas.style.pointerEvents = 'auto';
            this.canvas.style.cursor = 'crosshair';
            drawBtn.textContent = '❌ Выключить';
            drawBtn.classList.add('active');
            // Плавное появление кнопки
            clearBtn.style.opacity = '1';
            clearBtn.style.pointerEvents = 'auto';
            drawInfo.style.display = 'block';
            this.updateDrawStatus('Кликните на первую точку...');
        } else {
            this.canvas.style.display = 'none';
            this.canvas.style.pointerEvents = 'none';
            drawBtn.textContent = '✏️ Рисование линий';
            drawBtn.classList.remove('active');
            // Плавное скрытие кнопки
            clearBtn.style.opacity = '0';
            clearBtn.style.pointerEvents = 'none';
            drawInfo.style.display = 'none';
            this.clearLines();
        }
    }
    
    toggleGridMode() {
        if (this.drawMode) this.toggleDrawMode();
        if (this.perpendicularMode) this.togglePerpendicularMode();
        
        this.gridMode = !this.gridMode;
        
        const gridBtn = document.getElementById('toggleGridModeBtn');
        const clearBtn = document.getElementById('clearRulerBtn');
        const gridInfo = document.getElementById('gridModeInfo');
        
        if (this.gridMode) {
            this.canvas.style.display = 'block';
            this.canvas.style.pointerEvents = 'auto';
            this.canvas.style.cursor = 'crosshair';
            gridBtn.textContent = '❌ Выключить координаты';
            gridBtn.classList.add('active');
            // Плавное появление кнопки
            clearBtn.style.opacity = '1';
            clearBtn.style.pointerEvents = 'auto';
            gridInfo.style.display = 'block';
            this.drawGrid();
            this.updateGridDrawStatus('Наведите курсор или кликните для рисования линии...');
        } else {
            this.canvas.style.display = 'none';
            this.canvas.style.pointerEvents = 'none';
            gridBtn.textContent = '📐 Координаты + Линейка';
            gridBtn.classList.remove('active');
            // Плавное скрытие кнопки
            clearBtn.style.opacity = '0';
            clearBtn.style.pointerEvents = 'none';
            gridInfo.style.display = 'none';
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.gridLines = [];
            this.gridCurrentPoints = [];
        }
    }
    
    togglePerpendicularMode() {
        if (this.drawMode) this.toggleDrawMode();
        if (this.gridMode) this.toggleGridMode();
        
        this.perpendicularMode = !this.perpendicularMode;
        
        const perpendicularBtn = document.getElementById('togglePerpendicularBtn');
        const perpendicularInfo = document.getElementById('perpendicularInfo');
        
        if (this.perpendicularMode) {
            this.canvas.style.display = 'block';
            this.canvas.style.pointerEvents = 'auto';
            this.canvas.style.cursor = 'crosshair';
            perpendicularBtn.textContent = '❌ Выключить перпендикуляр';
            perpendicularBtn.classList.add('active');
            perpendicularInfo.style.display = 'block';
        } else {
            this.canvas.style.display = 'none';
            this.canvas.style.pointerEvents = 'none';
            perpendicularBtn.textContent = '📏 Перпендикуляр';
            perpendicularBtn.classList.remove('active');
            perpendicularInfo.style.display = 'none';
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    handleMouseMove(event) {
        if (this.gridMode) {
            this.handleGridMouseMove(event);
        } else if (this.perpendicularMode) {
            this.handlePerpendicularMouseMove(event);
        }
    }
    
    handleGridMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const xMm = this.pxToMm(x, 'width');
        const yMm = this.pxToMm(this.canvas.height - y, 'height');
        
        document.getElementById('coordX').textContent = xMm;
        document.getElementById('coordY').textContent = yMm;
        
        // Перерисовываем всё
        this.drawGrid();
        this.drawAllGridLines();
        this.drawCrosshair(x, y);
        
        // Если есть одна точка - рисуем временную линию до курсора
        if (this.gridCurrentPoints.length === 1) {
            this.drawTemporaryLine(this.gridCurrentPoints[0], { x, y });
        }
    }
    
    handlePerpendicularMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const distanceUp = y;
        const distanceRight = this.canvas.width - x;
        
        const upMm = this.pxToMmDirect(distanceUp);
        const rightMm = this.pxToMmDirect(distanceRight);
        
        document.getElementById('perpendicularUp').textContent = upMm;
        document.getElementById('perpendicularRight').textContent = rightMm;
        
        this.drawPerpendicularLines(x, y, distanceUp, distanceRight);
    }
    
    drawGrid() {
        if (!this.gridMode) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 2;
        
        // Вертикальная ось (Y)
        this.ctx.beginPath();
        this.ctx.moveTo(40, 0);
        this.ctx.lineTo(40, height);
        this.ctx.stroke();
        
        // Горизонтальная ось (X)
        this.ctx.beginPath();
        this.ctx.moveTo(0, height - 40);
        this.ctx.lineTo(width, height - 40);
        this.ctx.stroke();
        
        this.drawAxisLabels();
    }
    
    drawAxisLabels() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // 🎨 НОВЫЙ ДИЗАЙН: Современный шрифт для подписей
        this.ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.ctx.fillStyle = '#667eea';
        this.ctx.textAlign = 'center';
        
        if (this.options.widthMm) {
            const step = width / 5;
            const mmStep = this.options.widthMm / 5;
            
            for (let i = 0; i <= 5; i++) {
                const x = i * step;
                const mm = (i * mmStep).toFixed(0);
                
                this.ctx.beginPath();
                this.ctx.moveTo(x, height - 40);
                this.ctx.lineTo(x, height - 35);
                this.ctx.stroke();
                
                this.ctx.fillText(`${mm}`, x, height - 20);
            }
        }
        
        if (this.options.heightMm) {
            const step = height / 5;
            const mmStep = this.options.heightMm / 5;
            
            this.ctx.textAlign = 'right';
            
            for (let i = 0; i <= 5; i++) {
                const y = height - (i * step);
                const mm = (i * mmStep).toFixed(0);
                
                this.ctx.beginPath();
                this.ctx.moveTo(40, y);
                this.ctx.lineTo(45, y);
                this.ctx.stroke();
                
                this.ctx.fillText(`${mm}`, 30, y + 4);
            }
        }
    }
    
    drawCrosshair(x, y) {
        // 🎨 НОВЫЙ ДИЗАЙН: Тонкий элегантный крестик
        this.ctx.strokeStyle = 'rgba(102, 126, 234, 0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);

        // Вертикальная линия
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.stroke();

        // Горизонтальная линия
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.canvas.width, y);
        this.ctx.stroke();

        this.ctx.setLineDash([]);

        // Точка в центре перекрестия (используем новый стиль)
        this.drawPoint(x, y, false); // false = меньший размер
    }
    
    drawTemporaryLine(p1, p2) {
        // 🎨 НОВЫЙ ДИЗАЙН: Пунктирная линия с градиентом
        const gradient = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.6)');
        gradient.addColorStop(1, 'rgba(118, 75, 162, 0.6)');

        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([8, 4]);

        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();

        this.ctx.setLineDash([]);
    }
    
    drawAllGridLines() {
        this.gridLines.forEach(line => {
            this.drawSavedLine(line.p1, line.p2, line.distanceMm);
        });
    }
    
    drawSavedLine(p1, p2, distanceMm) {
        // 🎨 НОВЫЙ ДИЗАЙН: Используем те же стили что и в drawLine
        const gradient = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');

        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        this.ctx.shadowColor = 'rgba(102, 126, 234, 0.4)';
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();

        // Сброс тени
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

        // Точки на концах
        this.drawPoint(p1.x, p1.y);
        this.drawPoint(p2.x, p2.y);

        // Текст с размером
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        this.drawMeasurementLabel(midX, midY - 10, `${distanceMm} мм`);
    }
    
    drawPerpendicularLines(x, y, distanceUp, distanceRight) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 🎨 НОВЫЙ ДИЗАЙН: Современные линии с градиентом
        const upGradient = this.ctx.createLinearGradient(x, y, x, 0);
        upGradient.addColorStop(0, '#667eea');
        upGradient.addColorStop(1, 'rgba(102, 126, 234, 0.3)');

        const rightGradient = this.ctx.createLinearGradient(x, y, this.canvas.width, y);
        rightGradient.addColorStop(0, '#667eea');
        rightGradient.addColorStop(1, 'rgba(102, 126, 234, 0.3)');

        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        this.ctx.shadowColor = 'rgba(102, 126, 234, 0.4)';
        this.ctx.shadowBlur = 8;

        // Вертикальная линия (вверх)
        this.ctx.strokeStyle = upGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, 0);
        this.ctx.stroke();

        // Горизонтальная линия (вправо)
        this.ctx.strokeStyle = rightGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(this.canvas.width, y);
        this.ctx.stroke();

        // Сброс тени
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

        // Рисуем угол 90° (более тонкий и элегантный)
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 25, -Math.PI / 2, 0);
        this.ctx.stroke();

        // Текст "90°" в современном стиле
        this.ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.ctx.fillStyle = '#667eea';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('90°', x + 30, y - 30);

        // Точка на курсоре (используем новый стиль)
        this.drawPoint(x, y);

        const upMm = this.pxToMmDirect(distanceUp);
        const rightMm = this.pxToMmDirect(distanceRight);

        // Размер вверх (плашка)
        const upTextY = y / 2;
        this.drawMeasurementLabel(x + 40, upTextY, `↑ ${upMm} мм`);

        // Размер вправо (плашка)
        const rightTextX = x + (this.canvas.width - x) / 2;
        this.drawMeasurementLabel(rightTextX, y - 20, `→ ${rightMm} мм`);
    }
    
    handleMouseLeave() {
        if (this.gridMode) {
            this.drawGrid();
            this.drawAllGridLines();
        } else if (this.perpendicularMode) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    pxToMm(px, dimension) {
        // 📐 НОВОЕ: Приоритет калибровке из editor_data
        if (this.calibration && this.calibration.pxPerMm) {
            // Учитываем CSS scale для точных измерений
            const cssScale = this.calibration.cssScale || 1;
            const logicalPx = px / cssScale; // Переводим в логические пиксели
            return (logicalPx / this.calibration.pxPerMm).toFixed(2);
        }

        // Fallback: старый метод через widthMm/heightMm
        if (dimension === 'width' && this.options.widthMm) {
            return ((px / this.canvas.width) * this.options.widthMm).toFixed(2);
        } else if (dimension === 'height' && this.options.heightMm) {
            return ((px / this.canvas.height) * this.options.heightMm).toFixed(2);
        }

        console.warn('⚠️ Нет калибровки! Показываем пиксели.');
        return px.toFixed(0) + ' (px)';
    }

    pxToMmDirect(px) {
        // 📐 НОВОЕ: Приоритет калибровке из editor_data
        if (this.calibration && this.calibration.pxPerMm) {
            // Учитываем CSS scale
            const cssScale = this.calibration.cssScale || 1;
            const logicalPx = px / cssScale;
            return (logicalPx / this.calibration.pxPerMm).toFixed(2);
        }

        // Fallback: старый метод
        if (!this.options.widthMm && !this.options.heightMm) {
            console.warn('⚠️ Нет калибровки и размеров! Показываем пиксели.');
            return px.toFixed(0) + ' (px)';
        }

        let pxPerMm;

        if (this.options.widthMm && this.options.heightMm) {
            const pxPerMmWidth = this.canvas.width / this.options.widthMm;
            const pxPerMmHeight = this.canvas.height / this.options.heightMm;
            pxPerMm = (pxPerMmWidth + pxPerMmHeight) / 2;
        } else if (this.options.widthMm) {
            pxPerMm = this.canvas.width / this.options.widthMm;
        } else {
            pxPerMm = this.canvas.height / this.options.heightMm;
        }

        return (px / pxPerMm).toFixed(2);
    }
    
    handleCanvasClick(event) {
        if (!this.drawMode && !this.gridMode) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (this.drawMode) {
            this.handleDrawModeClick(x, y);
        } else if (this.gridMode) {
            this.handleGridModeClick(x, y);
        }
    }
    
    handleDrawModeClick(x, y) {
        if (this.lines.length >= this.maxLines) {
            this.updateDrawStatus('Лимит линий (2). Очистите для новых.');
            return;
        }
        
        this.currentPoints.push({ x, y });
        
        if (this.currentPoints.length === 1) {
            this.drawPoint(x, y);
            this.updateDrawStatus(`Кликните на вторую точку для линии ${this.lines.length + 1}...`);
        } else if (this.currentPoints.length === 2) {
            const [p1, p2] = this.currentPoints;
            this.drawLine(p1, p2);
            
            const distancePx = Math.sqrt(
                Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
            );
            
            const distanceMm = this.convertToMm(distancePx);
            
            this.lines.push({ p1, p2, distancePx, distanceMm });
            this.currentPoints = [];
            
            if (this.lines.length < this.maxLines) {
                this.updateDrawStatus(`Линия ${this.lines.length}: ${distanceMm} мм. Кликните для следующей...`);
            } else {
                this.updateDrawStatus(`Все линии нарисованы (${this.lines.length}/2).`);
            }
        }
    }
    
    handleGridModeClick(x, y) {
        if (this.gridLines.length >= this.maxLines) {
            this.updateGridDrawStatus(`Лимит линий (2). Очистите для новых.`);
            return;
        }
        
        this.gridCurrentPoints.push({ x, y });
        
        if (this.gridCurrentPoints.length === 1) {
            this.updateGridDrawStatus(`Кликните на вторую точку для линии ${this.gridLines.length + 1}...`);
        } else if (this.gridCurrentPoints.length === 2) {
            const [p1, p2] = this.gridCurrentPoints;
            
            const distancePx = Math.sqrt(
                Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
            );
            
            const distanceMm = this.convertToMm(distancePx);
            
            this.gridLines.push({ p1, p2, distancePx, distanceMm });
            this.gridCurrentPoints = [];
            
            this.drawGrid();
            this.drawAllGridLines();
            
            if (this.gridLines.length < this.maxLines) {
                this.updateGridDrawStatus(`Линия ${this.gridLines.length}: ${distanceMm} мм. Кликните для следующей...`);
            } else {
                this.updateGridDrawStatus(`Все линии нарисованы (${this.gridLines.length}/2).`);
            }
        }
    }
    
    drawPoint(x, y, isMain = true) {
        // 🎨 НОВЫЙ ДИЗАЙН: Современные точки с тенью
        const radius = isMain ? 6 : 4;

        // Внешнее кольцо (белое)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
        this.ctx.fill();

        // Внутренняя точка (акцентный цвет)
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#667eea'; // Современный фиолетовый
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();

        // Сброс тени
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }
    
    drawLine(p1, p2) {
        // 🎨 НОВЫЙ ДИЗАЙН: Тонкая линия с градиентом
        const gradient = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');

        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        this.ctx.shadowColor = 'rgba(102, 126, 234, 0.4)';
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();

        // Сброс тени
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

        this.drawPoint(p1.x, p1.y);
        this.drawPoint(p2.x, p2.y);

        const distancePx = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        const distanceMm = this.convertToMm(distancePx);

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        // 🎨 НОВЫЙ ДИЗАЙН: Современный шрифт и плашка
        this.drawMeasurementLabel(midX, midY - 10, `${distanceMm} мм`);
    }

    // 🎨 НОВЫЙ МЕТОД: Красивая плашка с размером
    drawMeasurementLabel(x, y, text) {
        this.ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Измеряем ширину текста
        const metrics = this.ctx.measureText(text);
        const padding = 8;
        const width = metrics.width + padding * 2;
        const height = 24;

        // Фон плашки с тенью
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 2;

        this.ctx.fillStyle = '#667eea';
        this.ctx.beginPath();
        this.ctx.roundRect(x - width / 2, y - height / 2, width, height, 12);
        this.ctx.fill();

        // Сброс тени
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // Текст
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(text, x, y);
    }
    
    convertToMm(distancePx) {
        return this.pxToMmDirect(distancePx);
    }
    
    clearLines() {
        // Очищаем обе коллекции линий
        this.lines = [];
        this.currentPoints = [];
        this.gridLines = [];
        this.gridCurrentPoints = [];
        
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Если в режиме сетки - перерисовываем сетку
            if (this.gridMode) {
                this.drawGrid();
            }
        }
        
        this.updateDrawStatus('Линии очищены. Кликните на первую точку...');
        this.updateGridDrawStatus('Линии очищены. Кликните для рисования...');
    }
    
    updateDrawStatus(message) {
        const statusEl = document.getElementById('drawStatus');
        if (statusEl) statusEl.textContent = message;
    }
    
    updateGridDrawStatus(message) {
        const statusEl = document.getElementById('gridDrawStatus');
        if (statusEl) statusEl.textContent = message;
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    const rulerContainer = document.getElementById('jewelryRulerContainer');

    if (rulerContainer) {
        new JewelryRuler('jewelryRulerContainer', {
            widthMm: parseFloat(rulerContainer.dataset.widthMm) || null,
            heightMm: parseFloat(rulerContainer.dataset.heightMm) || null,
            diameterMm: parseFloat(rulerContainer.dataset.diameterMm) || null,
            referenceType: rulerContainer.dataset.referenceType || 'none',
            editorData: rulerContainer.dataset.editorData || null // 📐 НОВОЕ: Калибровочные данные
        });
    }
});