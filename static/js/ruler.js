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
            ...options
        };
        
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
        
        this.ctx.font = '12px Arial';
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
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        
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
        
        // Точка в центре перекрестия
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    
    drawTemporaryLine(p1, p2) {
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 5]);
        
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
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
        
        // Точки на концах
        this.drawPoint(p1.x, p1.y);
        this.drawPoint(p2.x, p2.y);
        
        // Текст с размером
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.textAlign = 'center';
        
        const text = `${distanceMm} мм`;
        this.ctx.strokeText(text, midX, midY - 10);
        this.ctx.fillText(text, midX, midY - 10);
    }
    
    drawPerpendicularLines(x, y, distanceUp, distanceRight) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = '#ff4444';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        
        // Вертикальная линия (вверх)
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, 0);
        this.ctx.stroke();
        
        // Горизонтальная линия (вправо)
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(this.canvas.width, y);
        this.ctx.stroke();
        
        // Рисуем угол 90°
        this.ctx.beginPath();
        this.ctx.arc(x, y, 20, -Math.PI / 2, 0);
        this.ctx.stroke();
        
        // Текст "90°"
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = '#ff4444';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('90°', x + 25, y - 25);
        
        // Точка на курсоре
        this.ctx.fillStyle = '#ff4444';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Текст с размерами
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        
        const upMm = this.pxToMmDirect(distanceUp);
        const rightMm = this.pxToMmDirect(distanceRight);
        
        // Размер вверх
        this.ctx.textAlign = 'center';
        const upTextY = y / 2;
        this.ctx.strokeText(`${upMm} мм`, x + 30, upTextY);
        this.ctx.fillText(`${upMm} мм`, x + 30, upTextY);
        
        // Размер вправо
        const rightTextX = x + (this.canvas.width - x) / 2;
        this.ctx.strokeText(`${rightMm} мм`, rightTextX, y - 15);
        this.ctx.fillText(`${rightMm} мм`, rightTextX, y - 15);
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
        if (dimension === 'width' && this.options.widthMm) {
            return ((px / this.canvas.width) * this.options.widthMm).toFixed(2);
        } else if (dimension === 'height' && this.options.heightMm) {
            return ((px / this.canvas.height) * this.options.heightMm).toFixed(2);
        }
        return '0';
    }
    
    pxToMmDirect(px) {
        if (!this.options.widthMm && !this.options.heightMm) {
            return px.toFixed(0);
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
    
    drawPoint(x, y) {
        this.ctx.fillStyle = '#00ff00';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    
    drawLine(p1, p2) {
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
        
        this.drawPoint(p1.x, p1.y);
        this.drawPoint(p2.x, p2.y);
        
        const distancePx = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        const distanceMm = this.convertToMm(distancePx);
        
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.textAlign = 'center';
        
        const text = `${distanceMm} мм`;
        this.ctx.strokeText(text, midX, midY - 10);
        this.ctx.fillText(text, midX, midY - 10);
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
            referenceType: rulerContainer.dataset.referenceType || 'none'
        });
    }
});