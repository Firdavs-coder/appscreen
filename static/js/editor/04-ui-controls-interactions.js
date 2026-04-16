// ===== Elements Tab UI =====

function updateElementsList() {
    const listEl = document.getElementById('elements-list');
    const emptyEl = document.getElementById('elements-empty');
    if (!listEl) return;

    const elements = getElements();

    // Remove old items (keep the empty message)
    listEl.querySelectorAll('.element-item').forEach(el => el.remove());

    if (elements.length === 0) {
        if (emptyEl) emptyEl.style.display = '';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    elements.forEach(el => {
        const item = document.createElement('div');
        item.className = 'element-item' + (el.id === selectedElementId ? ' selected' : '');
        item.dataset.elementId = el.id;

        const layerLabels = {
            'behind-screenshot': 'Behind',
            'above-screenshot': 'Middle',
            'above-text': 'Front'
        };

        let thumbContent;
        if ((el.type === 'graphic' || el.type === 'device') && el.image) {
            thumbContent = `<img src="${el.image.src}" alt="${el.name}">`;
        } else if (el.type === 'emoji') {
            thumbContent = `<span class="emoji-thumb">${el.emoji}</span>`;
        } else if (el.type === 'icon' && el.image) {
            thumbContent = `<img src="${el.image.src}" alt="${el.name}" style="padding: 4px; filter: var(--icon-thumb-filter, none);">`;
        } else {
            thumbContent = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>
            </svg>`;
        }

        item.innerHTML = `
            <div class="element-item-thumb">${thumbContent}</div>
            <div class="element-item-info">
                <div class="element-item-name">${el.type === 'text' ? (getElementText(el) || 'Text') : el.type === 'emoji' ? `${el.emoji} ${el.name}` : (el.name || (el.type === 'device' ? 'Device' : 'Element'))}</div>
                <div class="element-item-layer">${layerLabels[el.layer] || el.layer}</div>
            </div>
            <div class="element-item-actions">
                <button class="element-item-btn" data-action="move-up" title="Move up">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="18 15 12 9 6 15"/>
                    </svg>
                </button>
                <button class="element-item-btn" data-action="move-down" title="Move down">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </button>
                <button class="element-item-btn danger" data-action="delete" title="Delete">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `;

        // Click to select
        item.addEventListener('click', (e) => {
            if (e.target.closest('.element-item-btn')) return;
            selectedElementId = el.id;
            setSelectedCanvasTarget({ type: 'element', id: el.id }, { skipCanvasRefresh: true });
            updateElementsList();
            updateElementProperties();
            updateCanvas({ skipSave: true, skipInlinePreviews: true });
        });

        // Action buttons
        item.querySelectorAll('.element-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if (action === 'delete') deleteElement(el.id);
                else if (action === 'move-up') moveElementLayer(el.id, 'up');
                else if (action === 'move-down') moveElementLayer(el.id, 'down');
            });
        });

        listEl.appendChild(item);
    });
}

function updateElementProperties() {
    const propsEl = document.getElementById('element-properties');
    if (!propsEl) return;

    const el = getSelectedElement();
    if (!el) {
        propsEl.style.display = 'none';
        return;
    }

    propsEl.style.display = '';
    const titleMap = { text: 'Text Element', emoji: `${el.emoji} Emoji`, icon: `Icon: ${el.name}`, graphic: el.name || 'Graphic', device: el.name || 'Device' };
    document.getElementById('element-properties-title').textContent = titleMap[el.type] || el.name || 'Element';

    document.getElementById('element-layer').value = el.layer;
    document.getElementById('element-x').value = el.x;
    document.getElementById('element-x-value').textContent = formatValue(el.x) + '%';
    document.getElementById('element-y').value = el.y;
    document.getElementById('element-y-value').textContent = formatValue(el.y) + '%';
    document.getElementById('element-width').value = el.width;
    document.getElementById('element-width-value').textContent = formatValue(el.width) + '%';
    document.getElementById('element-rotation').value = el.rotation;
    document.getElementById('element-rotation-value').textContent = formatValue(el.rotation) + '°';
    document.getElementById('element-opacity').value = el.opacity;
    document.getElementById('element-opacity-value').textContent = formatValue(el.opacity) + '%';

    // Type-specific properties
    const textProps = document.getElementById('element-text-properties');
    const iconProps = document.getElementById('element-icon-properties');

    // Hide all type-specific panels first
    textProps.style.display = 'none';
    if (iconProps) iconProps.style.display = 'none';

    if (el.type === 'text') {
        textProps.style.display = '';
        document.getElementById('element-text-input').value = getElementText(el);
        document.getElementById('element-font').value = el.font;
        updateElementFontPickerPreview(el);
        document.getElementById('element-font-size').value = el.fontSize;
        document.getElementById('element-font-color').value = el.fontColor;
        document.getElementById('element-font-weight').value = el.fontWeight;
        document.getElementById('element-italic-btn').classList.toggle('active', el.italic);
        document.getElementById('element-frame').value = el.frame || 'none';
        const frameOpts = document.getElementById('element-frame-options');
        frameOpts.style.display = el.frame && el.frame !== 'none' ? '' : 'none';
        if (el.frame && el.frame !== 'none') {
            document.getElementById('element-frame-color').value = el.frameColor;
            document.getElementById('element-frame-color-hex').value = el.frameColor;
            document.getElementById('element-frame-scale').value = el.frameScale;
            document.getElementById('element-frame-scale-value').textContent = formatValue(el.frameScale) + '%';
        }
    } else if (el.type === 'icon' && iconProps) {
        iconProps.style.display = '';
        document.getElementById('element-icon-color').value = el.iconColor || '#ffffff';
        document.getElementById('element-icon-color-hex').value = el.iconColor || '#ffffff';
        document.getElementById('element-icon-stroke-width').value = el.iconStrokeWidth || 2;
        document.getElementById('element-icon-stroke-width-value').textContent = el.iconStrokeWidth || 2;
        // Shadow
        const shadow = el.iconShadow || { enabled: false, color: '#000000', blur: 20, opacity: 40, x: 0, y: 10 };
        const shadowToggle = document.getElementById('element-icon-shadow-toggle');
        const shadowOpts = document.getElementById('element-icon-shadow-options');
        const shadowRow = shadowToggle?.closest('.toggle-row');
        if (shadowToggle) shadowToggle.classList.toggle('active', shadow.enabled);
        if (shadowRow) shadowRow.classList.toggle('collapsed', !shadow.enabled);
        if (shadowOpts) shadowOpts.style.display = shadow.enabled ? '' : 'none';
        document.getElementById('element-icon-shadow-color').value = shadow.color;
        document.getElementById('element-icon-shadow-color-hex').value = shadow.color;
        document.getElementById('element-icon-shadow-blur').value = shadow.blur;
        document.getElementById('element-icon-shadow-blur-value').textContent = shadow.blur + 'px';
        document.getElementById('element-icon-shadow-opacity').value = shadow.opacity;
        document.getElementById('element-icon-shadow-opacity-value').textContent = shadow.opacity + '%';
        document.getElementById('element-icon-shadow-x').value = shadow.x;
        document.getElementById('element-icon-shadow-x-value').textContent = shadow.x + 'px';
        document.getElementById('element-icon-shadow-y').value = shadow.y;
        document.getElementById('element-icon-shadow-y-value').textContent = shadow.y + 'px';
    }
}

function setupElementEventListeners() {
    // Add Graphic button
    const addGraphicBtn = document.getElementById('add-graphic-btn');
    const graphicInput = document.getElementById('element-graphic-input');
    if (addGraphicBtn && graphicInput) {
        addGraphicBtn.addEventListener('click', () => graphicInput.click());
        graphicInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            let sourceUrl = null;
            try {
                const uploaded = await uploadMediaFile(file);
                sourceUrl = uploaded?.url || null;
            } catch (uploadError) {
                console.error('Graphic upload failed, using data URL fallback:', uploadError);
            }

            if (!sourceUrl) {
                sourceUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve(ev.target.result);
                    reader.readAsDataURL(file);
                });
            }

            const img = new Image();
            img.onload = () => {
                addGraphicElement(img, sourceUrl, file.name);
            };
            img.src = sourceUrl;
            graphicInput.value = '';
        });
    }

    // Add Text button
    const addTextBtn = document.getElementById('add-text-element-btn');
    if (addTextBtn) {
        addTextBtn.addEventListener('click', () => addTextElement());
    }

    // Add Device button
    const addDeviceBtn = document.getElementById('add-device-element-btn');
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', () => addDeviceElementFromScreenshot({ offset: true }));
    }

    // Add Emoji button
    const addEmojiBtn = document.getElementById('add-emoji-btn');
    if (addEmojiBtn) {
        addEmojiBtn.addEventListener('click', () => showEmojiPicker());
    }

    // Add Icon button
    const addIconBtn = document.getElementById('add-icon-btn');
    if (addIconBtn) {
        addIconBtn.addEventListener('click', () => showIconPicker());
    }

    // Icon color picker
    const iconColor = document.getElementById('element-icon-color');
    const iconColorHex = document.getElementById('element-icon-color-hex');
    if (iconColor) {
        iconColor.addEventListener('input', () => {
            const el = getSelectedElement();
            if (el && el.type === 'icon') {
                el.iconColor = iconColor.value;
                if (iconColorHex) iconColorHex.value = iconColor.value;
                updateIconImage(el);
            }
        });
    }
    if (iconColorHex) {
        iconColorHex.addEventListener('change', () => {
            if (/^#[0-9a-fA-F]{6}$/.test(iconColorHex.value)) {
                const el = getSelectedElement();
                if (el && el.type === 'icon') {
                    el.iconColor = iconColorHex.value;
                    if (iconColor) iconColor.value = iconColorHex.value;
                    updateIconImage(el);
                }
            }
        });
    }

    // Icon stroke width
    const iconStroke = document.getElementById('element-icon-stroke-width');
    const iconStrokeVal = document.getElementById('element-icon-stroke-width-value');
    if (iconStroke) {
        iconStroke.addEventListener('input', () => {
            const val = parseFloat(iconStroke.value);
            if (iconStrokeVal) iconStrokeVal.textContent = val;
            const el = getSelectedElement();
            if (el && el.type === 'icon') {
                el.iconStrokeWidth = val;
                updateIconImage(el);
            }
        });
    }

    // Icon shadow toggle
    const iconShadowToggle = document.getElementById('element-icon-shadow-toggle');
    if (iconShadowToggle) {
        iconShadowToggle.addEventListener('click', () => {
            const el = getSelectedElement();
            if (!el || el.type !== 'icon') return;
            if (!el.iconShadow) el.iconShadow = { enabled: false, color: '#000000', blur: 20, opacity: 40, x: 0, y: 10 };
            el.iconShadow.enabled = !el.iconShadow.enabled;
            updateElementProperties();
            updateCanvas();
        });
    }

    // Icon shadow property helpers
    const bindIconShadow = (inputId, prop, suffix) => {
        const input = document.getElementById(inputId);
        const valEl = document.getElementById(inputId + '-value');
        if (!input) return;
        input.addEventListener('input', () => {
            const el = getSelectedElement();
            if (!el || el.type !== 'icon' || !el.iconShadow) return;
            el.iconShadow[prop] = parseFloat(input.value);
            if (valEl) valEl.textContent = input.value + suffix;
            updateCanvas();
        });
    };
    bindIconShadow('element-icon-shadow-blur', 'blur', 'px');
    bindIconShadow('element-icon-shadow-opacity', 'opacity', '%');
    bindIconShadow('element-icon-shadow-x', 'x', 'px');
    bindIconShadow('element-icon-shadow-y', 'y', 'px');

    // Icon shadow color
    const iconShadowColor = document.getElementById('element-icon-shadow-color');
    const iconShadowColorHex = document.getElementById('element-icon-shadow-color-hex');
    if (iconShadowColor) {
        iconShadowColor.addEventListener('input', () => {
            const el = getSelectedElement();
            if (el?.type === 'icon' && el.iconShadow) {
                el.iconShadow.color = iconShadowColor.value;
                if (iconShadowColorHex) iconShadowColorHex.value = iconShadowColor.value;
                updateCanvas();
            }
        });
    }
    if (iconShadowColorHex) {
        iconShadowColorHex.addEventListener('change', () => {
            if (/^#[0-9a-fA-F]{6}$/.test(iconShadowColorHex.value)) {
                const el = getSelectedElement();
                if (el?.type === 'icon' && el.iconShadow) {
                    el.iconShadow.color = iconShadowColorHex.value;
                    if (iconShadowColor) iconShadowColor.value = iconShadowColorHex.value;
                    updateCanvas();
                }
            }
        });
    }

    // Property sliders
    const bindSlider = (id, prop, suffix, parser) => {
        const input = document.getElementById(id);
        const valueEl = document.getElementById(id + '-value');
        if (!input) return;
        input.addEventListener('input', () => {
            const val = parser ? parser(input.value) : parseFloat(input.value);
            if (valueEl) valueEl.textContent = formatValue(val) + suffix;
            if (selectedElementId) setElementProperty(selectedElementId, prop, val);
        });
    };

    bindSlider('element-x', 'x', '%');
    bindSlider('element-y', 'y', '%');
    bindSlider('element-width', 'width', '%');
    bindSlider('element-rotation', 'rotation', '°');
    bindSlider('element-opacity', 'opacity', '%');
    bindSlider('element-font-size', 'fontSize', '', parseInt);
    bindSlider('element-frame-scale', 'frameScale', '%');

    // Layer dropdown
    const layerSelect = document.getElementById('element-layer');
    if (layerSelect) {
        layerSelect.addEventListener('change', () => {
            if (selectedElementId) {
                setElementProperty(selectedElementId, 'layer', layerSelect.value);
            }
        });
    }

    // Text input
    const textInput = document.getElementById('element-text-input');
    if (textInput) {
        textInput.addEventListener('input', () => {
            if (!selectedElementId) return;
            const el = getSelectedElement();
            if (!el) return;
            if (!el.texts) el.texts = {};
            el.texts[state.currentLanguage] = textInput.value;
            el.text = textInput.value; // sync for backwards compat
            updateCanvas();
            updateElementsList();
        });
    }

    // Font color
    const fontColor = document.getElementById('element-font-color');
    if (fontColor) {
        fontColor.addEventListener('input', () => {
            if (selectedElementId) setElementProperty(selectedElementId, 'fontColor', fontColor.value);
        });
    }

    // Font weight
    const fontWeight = document.getElementById('element-font-weight');
    if (fontWeight) {
        fontWeight.addEventListener('change', () => {
            if (selectedElementId) setElementProperty(selectedElementId, 'fontWeight', fontWeight.value);
        });
    }

    // Italic button
    const italicBtn = document.getElementById('element-italic-btn');
    if (italicBtn) {
        italicBtn.addEventListener('click', () => {
            const el = getSelectedElement();
            if (el) {
                setElementProperty(el.id, 'italic', !el.italic);
                italicBtn.classList.toggle('active', el.italic);
            }
        });
    }

    // Frame dropdown
    const frameSelect = document.getElementById('element-frame');
    if (frameSelect) {
        frameSelect.addEventListener('change', () => {
            if (selectedElementId) {
                setElementProperty(selectedElementId, 'frame', frameSelect.value);
                document.getElementById('element-frame-options').style.display =
                    frameSelect.value !== 'none' ? '' : 'none';
            }
        });
    }

    // Frame color
    const frameColor = document.getElementById('element-frame-color');
    const frameColorHex = document.getElementById('element-frame-color-hex');
    if (frameColor) {
        frameColor.addEventListener('input', () => {
            if (selectedElementId) {
                setElementProperty(selectedElementId, 'frameColor', frameColor.value);
                if (frameColorHex) frameColorHex.value = frameColor.value;
            }
        });
    }
    if (frameColorHex) {
        frameColorHex.addEventListener('change', () => {
            if (selectedElementId && /^#[0-9a-fA-F]{6}$/.test(frameColorHex.value)) {
                setElementProperty(selectedElementId, 'frameColor', frameColorHex.value);
                if (frameColor) frameColor.value = frameColorHex.value;
            }
        });
    }

    // Canvas drag interaction for elements
    setupElementCanvasDrag();
}

function setupElementCanvasDrag() {
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const previewCanvas = document.getElementById('preview-canvas');
    if (!previewCanvas) return;

    bindMediaDropTarget(canvasWrapper, () => (Number.isInteger(state.selectedIndex) ? state.selectedIndex : 0));

    // Snap guides state
    const SNAP_THRESHOLD = 1.5; // percentage units (of canvas width/height)
    let activeSnapGuides = { x: null, y: null }; // which guides are active
    let dragMoveRafPending = false;
    let pendingDragCoords = null;

    function getCanvasCoords(e) {
        const rect = previewCanvas.getBoundingClientRect();
        const scaleX = previewCanvas.width / rect.width;
        const scaleY = previewCanvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function snapToGuides(x, y) {
        const snapped = { x, y };
        activeSnapGuides = { x: null, y: null };

        // Snap to horizontal center (x = 50%)
        if (Math.abs(x - 50) < SNAP_THRESHOLD) {
            snapped.x = 50;
            activeSnapGuides.x = 50;
        }

        // Snap to vertical middle (y = 50%)
        if (Math.abs(y - 50) < SNAP_THRESHOLD) {
            snapped.y = 50;
            activeSnapGuides.y = 50;
        }

        return snapped;
    }

    function hitTestPopouts(canvasX, canvasY) {
        const popouts = getPopouts();
        const dims = getCanvasDimensions();
        const screenshot = getCurrentScreenshot();
        if (!screenshot) return null;
        const img = getScreenshotImage(screenshot);
        if (!img) return null;

        // Test in reverse order (topmost first)
        for (let i = popouts.length - 1; i >= 0; i--) {
            const p = popouts[i];
            const cx = dims.width * (p.x / 100);
            const cy = dims.height * (p.y / 100);
            const displayW = dims.width * (p.width / 100);
            const sw = (p.cropWidth / 100) * img.width;
            const sh = (p.cropHeight / 100) * img.height;
            const cropAspect = sh / sw;
            const displayH = displayW * cropAspect;
            const halfW = displayW / 2;
            const halfH = displayH / 2;

            if (canvasX >= cx - halfW && canvasX <= cx + halfW &&
                canvasY >= cy - halfH && canvasY <= cy + halfH) {
                return p;
            }
        }
        return null;
    }

    function hitTestElements(canvasX, canvasY) {
        const elements = getElements();
        const dims = getCanvasDimensions();
        // Test in reverse order (topmost first)
        const layers = ['above-text', 'above-screenshot', 'behind-screenshot'];
        for (const layer of layers) {
            const layerEls = elements.filter(el => el.layer === layer).reverse();
            for (const el of layerEls) {
                const cx = dims.width * (el.x / 100);
                const cy = dims.height * (el.y / 100);
                const elWidth = dims.width * (el.width / 100);
                let elHeight;

                if (el.type === 'emoji' || el.type === 'icon') {
                    elHeight = elWidth; // square bounding box
                } else if ((el.type === 'graphic' || el.type === 'device') && el.image) {
                    elHeight = elWidth * (el.image.height / el.image.width);
                } else {
                    elHeight = el.fontSize * 1.5;
                }

                // Simple bounding box hit test (ignoring rotation for simplicity)
                const halfW = elWidth / 2;
                const halfH = elHeight / 2;

                if (canvasX >= cx - halfW && canvasX <= cx + halfW &&
                    canvasY >= cy - halfH && canvasY <= cy + halfH) {
                    return el;
                }
            }
        }
        return null;
    }

    function hitTestScreenshot(canvasX, canvasY) {
        const bounds = getScreenshotBounds(getCanvasDimensions());
        if (!bounds) return false;
        return canvasX >= bounds.x && canvasX <= bounds.x + bounds.width
            && canvasY >= bounds.y && canvasY <= bounds.y + bounds.height;
    }

    function hitTestCanvasText(canvasX, canvasY) {
        const bounds = getCanvasTextBounds(getCanvasDimensions());
        if (!bounds) return false;
        return canvasX >= bounds.x && canvasX <= bounds.x + bounds.width
            && canvasY >= bounds.y && canvasY <= bounds.y + bounds.height;
    }

    function getHoverTargetAt(canvasX, canvasY) {
        const popoutHit = hitTestPopouts(canvasX, canvasY);
        if (popoutHit) return { type: 'popout', id: popoutHit.id };

        const elementHit = hitTestElements(canvasX, canvasY);
        if (elementHit) return { type: 'element', id: elementHit.id };

        if (hitTestCanvasText(canvasX, canvasY)) return { type: 'text' };
        if (hitTestScreenshot(canvasX, canvasY)) return { type: 'screenshot' };
        return null;
    }

    function getResizeCursor(handle) {
        if (handle === 'top-left' || handle === 'bottom-right') return 'nwse-resize';
        if (handle === 'top-right' || handle === 'bottom-left') return 'nesw-resize';
        return 'grab';
    }

    function updateDragControlValue(id, value, suffix = '%') {
        const input = document.getElementById(id);
        const valueEl = document.getElementById(id + '-value');
        if (input) input.value = value;
        if (valueEl) valueEl.textContent = formatValue(value) + suffix;
    }

    function applyResizeMove(coords) {
        if (!draggingElement || draggingElement.mode !== 'resize') return;

        const startBounds = draggingElement.startBounds;
        if (!startBounds) return;

        const anchor = getResizeAnchorForHandle(startBounds, draggingElement.handle);
        const startDistanceX = Math.max(1, Math.abs(draggingElement.startX - anchor.x));
        const startDistanceY = Math.max(1, Math.abs(draggingElement.startY - anchor.y));
        const scaleX = Math.abs(coords.x - anchor.x) / startDistanceX;
        const scaleY = Math.abs(coords.y - anchor.y) / startDistanceY;
        const factor = Math.max(0.1, Math.max(scaleX, scaleY));
        const newHalfW = Math.max(1, draggingElement.startHalfW * factor);
        const newHalfH = Math.max(1, draggingElement.startHalfH * factor);
        const newCenterX = draggingElement.handle.includes('left') ? anchor.x - newHalfW : anchor.x + newHalfW;
        const newCenterY = draggingElement.handle.includes('top') ? anchor.y - newHalfH : anchor.y + newHalfH;

        if (draggingElement.targetType === 'element') {
            const el = getElements().find(e => e.id === draggingElement.id);
            if (!el) return;
            el.x = Math.max(0, Math.min(100, (newCenterX / draggingElement.dims.width) * 100));
            el.y = Math.max(0, Math.min(100, (newCenterY / draggingElement.dims.height) * 100));
            if (el.type === 'text') {
                // For text elements, corner resize should scale typography.
                el.width = Math.max(2, Math.min(100, draggingElement.initialWidth * factor));
                el.fontSize = Math.round(Math.max(12, Math.min(300, draggingElement.initialFontSize * factor)));
                updateDragControlValue('element-width', el.width, '%');
                updateDragControlValue('element-font-size', el.fontSize, '');
            } else {
                el.width = Math.max(2, Math.min(100, draggingElement.initialWidth * factor));
                updateDragControlValue('element-width', el.width, '%');
            }
            updateCanvas({ skipSave: true, skipInlinePreviews: true });
            return;
        }

        if (draggingElement.targetType === 'popout') {
            const p = getPopouts().find(po => po.id === draggingElement.id);
            if (!p) return;
            p.x = Math.max(0, Math.min(100, (newCenterX / draggingElement.dims.width) * 100));
            p.y = Math.max(0, Math.min(100, (newCenterY / draggingElement.dims.height) * 100));
            p.width = Math.max(5, Math.min(130, draggingElement.initialWidth * factor));
            updateCanvas({ skipSave: true, skipInlinePreviews: true });
            updateDragControlValue('popout-width', p.width, '%');
            return;
        }

        if (draggingElement.targetType === 'screenshot') {
            const ss = getScreenshotSettings();
            if (!ss) return;
            ss.x = Math.max(0, Math.min(100, (newCenterX / draggingElement.dims.width) * 100));
            ss.y = Math.max(0, Math.min(100, (newCenterY / draggingElement.dims.height) * 100));
            ss.scale = Math.max(30, Math.min(100, draggingElement.initialWidth * factor));

            updateCanvas({ skipSave: true, skipInlinePreviews: true });

            const scaleInput = document.getElementById('screenshot-scale');
            const scaleValue = document.getElementById('screenshot-scale-value');
            if (scaleInput) scaleInput.value = ss.scale;
            if (scaleValue) scaleValue.textContent = formatValue(ss.scale) + '%';
        }
    }

    function applyDragMove(coords) {
        if (draggingElement?.mode === 'resize') {
            applyResizeMove(coords);
            return;
        }

        if (draggingElement?.targetType === 'screenshot') {
            const dx = coords.x - draggingElement.startX;
            const dy = coords.y - draggingElement.startY;

            // Screenshot position sliders map to a reduced movement range (moveX/moveY),
            // not the full canvas dimensions. Use the same range here so drag follows cursor.
            const ssBounds = getScreenshotBounds(draggingElement.dims);
            if (!ssBounds) return;
            const moveX = Math.max(draggingElement.dims.width - ssBounds.width, draggingElement.dims.width * 0.15);
            const moveY = Math.max(draggingElement.dims.height - ssBounds.height, draggingElement.dims.height * 0.15);

            const rawX = draggingElement.origX + (dx / Math.max(1, moveX)) * 100;
            const rawY = draggingElement.origY + (dy / Math.max(1, moveY)) * 100;

            const ss = getScreenshotSettings();
            if (!ss) return;

            ss.x = rawX;
            ss.y = rawY;
            updateCanvas({ skipSave: true, skipInlinePreviews: true });

            const xInput = document.getElementById('screenshot-x');
            const xValue = document.getElementById('screenshot-x-value');
            const yInput = document.getElementById('screenshot-y');
            const yValue = document.getElementById('screenshot-y-value');
            if (xInput) xInput.value = ss.x;
            if (xValue) xValue.textContent = formatValue(ss.x) + '%';
            if (yInput) yInput.value = ss.y;
            if (yValue) yValue.textContent = formatValue(ss.y) + '%';
            return;
        }

        if (draggingElement?.targetType === 'text') {
            const dy = coords.y - draggingElement.startY;
            const dyPct = (dy / draggingElement.dims.height) * 100;
            const nextOffset = draggingElement.layoutPosition === 'bottom'
                ? draggingElement.origOffsetY - dyPct
                : draggingElement.origOffsetY + dyPct;

            const clampedOffset = Math.max(0, Math.min(100, nextOffset));
            setTextLanguageValue('offsetY', clampedOffset, draggingElement.layoutLang);
            updateCanvas({ skipSave: true, skipInlinePreviews: true });

            const offsetInput = document.getElementById('text-offset-y');
            const offsetValue = document.getElementById('text-offset-y-value');
            if (offsetInput) offsetInput.value = clampedOffset;
            if (offsetValue) offsetValue.textContent = formatValue(clampedOffset) + '%';
            return;
        }

        const dx = coords.x - draggingElement.startX;
        const dy = coords.y - draggingElement.startY;
        const rawX = draggingElement.origX + (dx / draggingElement.dims.width) * 100;
        const rawY = draggingElement.origY + (dy / draggingElement.dims.height) * 100;

        const clamped = {
            x: Math.max(0, Math.min(100, rawX)),
            y: Math.max(0, Math.min(100, rawY))
        };
        const snapped = snapToGuides(clamped.x, clamped.y);

        if (draggingElement.isPopout) {
            const p = getPopouts().find(po => po.id === draggingElement.id);
            if (p) {
                p.x = snapped.x;
                p.y = snapped.y;
                updateCanvas({ skipSave: true, skipInlinePreviews: true });
                updateDragControlValue('popout-x', p.x, '%');
                updateDragControlValue('popout-y', p.y, '%');
            }
        } else {
            const el = getElements().find(e => e.id === draggingElement.id);
            if (el) {
                el.x = snapped.x;
                el.y = snapped.y;
                updateCanvas({ skipSave: true, skipInlinePreviews: true });
                updateDragControlValue('element-x', el.x, '%');
                updateDragControlValue('element-y', el.y, '%');
            }
        }
    }

    function queueDragMove(coords) {
        pendingDragCoords = coords;
        if (dragMoveRafPending) return;

        dragMoveRafPending = true;
        requestAnimationFrame(() => {
            dragMoveRafPending = false;
            if (!draggingElement || !pendingDragCoords) return;

            const nextCoords = pendingDragCoords;
            pendingDragCoords = null;
            applyDragMove(nextCoords);
        });
    }

    function clearDrag() {
        if (draggingElement) {
            const endedDrag = draggingElement;
            draggingElement = null;
            isDragging = false;
            renderFrameScheduled = false;
            pendingDragCoords = null;
            dragMoveRafPending = false;
            activeSnapGuides = { x: null, y: null };
            canvasWrapper.classList.remove('element-dragging');
            canvasWrapper.style.cursor = '';
            updateCanvas(); // redraw without guides, with inline previews

            // Refresh full property panes once after drag completes.
            if (endedDrag.targetType === 'popout' || endedDrag.isPopout) {
                updatePopoutProperties();
            } else if (endedDrag.targetType === 'element' || (!endedDrag.targetType && !endedDrag.isPopout && endedDrag.id)) {
                updateElementProperties();
            }
        }
    }

    previewCanvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        const coords = getCanvasCoords(e);
        const hoverTarget = getHoverTargetAt(coords.x, coords.y);
        const selectedTarget = getSelectedCanvasTarget();
        const dims = getCanvasDimensions();
        const resizeTarget = hoverTarget || selectedTarget;
        const resizeHandle = hitTestResizeHandle(resizeTarget, coords.x, coords.y, dims);

        if (resizeTarget && resizeHandle) {
            e.preventDefault();
            e.stopPropagation();

            const bounds = getCanvasHoverBounds(resizeTarget, dims);
            if (!bounds) return;

            if (resizeTarget.type === 'popout') {
                selectedPopoutId = resizeTarget.id;
                selectedElementId = null;
                setSelectedCanvasTarget({ type: 'popout', id: resizeTarget.id }, { skipCanvasRefresh: true });
                updatePopoutsList();
                updatePopoutProperties();
                updateElementsList();
                updateElementProperties();
                activateSidebarTab('popouts');
            } else if (resizeTarget.type === 'element') {
                selectedElementId = resizeTarget.id;
                selectedPopoutId = null;
                setSelectedCanvasTarget({ type: 'element', id: resizeTarget.id }, { skipCanvasRefresh: true });
                updateElementsList();
                updateElementProperties();
                updatePopoutsList();
                updatePopoutProperties();
                activateSidebarTab('elements');
            } else {
                setSelectedCanvasTarget({ type: resizeTarget.type }, { skipCanvasRefresh: true });
                if (resizeTarget.type === 'text') {
                    activateSidebarTab('text');
                } else if (resizeTarget.type === 'screenshot') {
                    activateSidebarTab('screenshot');
                }
            }

            const targetElement = resizeTarget.type === 'element'
                ? getElements().find(el => el.id === resizeTarget.id)
                : null;

            const initialSize = resizeTarget.type === 'screenshot'
                ? getScreenshotSettings().scale
                : resizeTarget.type === 'popout'
                    ? (getPopouts().find(po => po.id === resizeTarget.id)?.width || 30)
                    : (() => {
                        if (!targetElement) return 20;
                        return targetElement.type === 'text'
                            ? (targetElement.fontSize || 60)
                            : (targetElement.width || 20);
                    })();

            draggingElement = {
                mode: 'resize',
                targetType: resizeTarget.type,
                id: resizeTarget.id || null,
                handle: resizeHandle,
                startBounds: bounds,
                startX: coords.x,
                startY: coords.y,
                centerX: bounds.x + bounds.width / 2,
                centerY: bounds.y + bounds.height / 2,
                startHalfW: Math.max(1, bounds.width / 2),
                startHalfH: Math.max(1, bounds.height / 2),
                initialWidth: resizeTarget.type === 'element' && targetElement
                    ? (targetElement.width || 20)
                    : initialSize,
                initialFontSize: resizeTarget.type === 'element' && targetElement?.type === 'text'
                    ? (targetElement.fontSize || 60)
                    : null,
                dims
            };

            canvasWrapper.classList.add('element-dragging');
            canvasWrapper.style.cursor = getResizeCursor(resizeHandle);
            setHoveredCanvasTarget(hoverTarget);
            return;
        }

        // Check popouts first (they render on top of elements above-screenshot)
        const popoutHit = hitTestPopouts(coords.x, coords.y);
        if (popoutHit) {
            e.preventDefault();
            e.stopPropagation();
            draggingElement = {
                mode: 'move',
                id: popoutHit.id,
                startX: coords.x,
                startY: coords.y,
                origX: popoutHit.x,
                origY: popoutHit.y,
                dims: dims,
                isPopout: true
            };
            selectedPopoutId = popoutHit.id;
            selectedElementId = null;
            setSelectedCanvasTarget({ type: 'popout', id: popoutHit.id }, { skipCanvasRefresh: true });
            updatePopoutsList();
            updatePopoutProperties();
            updateElementsList();
            updateElementProperties();
            canvasWrapper.classList.add('element-dragging');
            activateSidebarTab('popouts');
            setHoveredCanvasTarget({ type: 'popout', id: popoutHit.id });
            return;
        }

        const hit = hitTestElements(coords.x, coords.y);
        if (hit) {
            e.preventDefault();
            e.stopPropagation();
            draggingElement = {
                mode: 'move',
                id: hit.id,
                startX: coords.x,
                startY: coords.y,
                origX: hit.x,
                origY: hit.y,
                dims: dims,
                isPopout: false
            };
            selectedElementId = hit.id;
            selectedPopoutId = null;
            setSelectedCanvasTarget({ type: 'element', id: hit.id }, { skipCanvasRefresh: true });
            updateElementsList();
            updateElementProperties();
            updatePopoutsList();
            updatePopoutProperties();
            canvasWrapper.classList.add('element-dragging');
            activateSidebarTab('elements');
            setHoveredCanvasTarget({ type: 'element', id: hit.id });
            return;
        }

        if (hitTestCanvasText(coords.x, coords.y)) {
            e.preventDefault();
            e.stopPropagation();

            const text = getTextSettings();
            const layoutLang = getTextLayoutLanguage(text);
            const layout = getEffectiveLayout(text, layoutLang);

            draggingElement = {
                mode: 'move',
                targetType: 'text',
                startX: coords.x,
                startY: coords.y,
                origOffsetY: layout.offsetY,
                layoutPosition: layout.position,
                layoutLang,
                dims
            };
            setSelectedCanvasTarget({ type: 'text' }, { skipCanvasRefresh: true });
            canvasWrapper.classList.add('element-dragging');
            canvasWrapper.style.cursor = 'grabbing';
            activateSidebarTab('text');
            setHoveredCanvasTarget({ type: 'text' });
            return;
        }

        if (hitTestScreenshot(coords.x, coords.y)) {
            e.preventDefault();
            e.stopPropagation();

            const ss = getScreenshotSettings();
            if (ss) {
                draggingElement = {
                    mode: 'move',
                    targetType: 'screenshot',
                    startX: coords.x,
                    startY: coords.y,
                    origX: ss.x,
                    origY: ss.y,
                    dims
                };
                setSelectedCanvasTarget({ type: 'screenshot' }, { skipCanvasRefresh: true });
                canvasWrapper.classList.add('element-dragging');
                canvasWrapper.style.cursor = 'grabbing';
                activateSidebarTab('screenshot');
                setHoveredCanvasTarget({ type: 'screenshot' });
            }
            return;
        }

        setSelectedCanvasTarget(null, { skipCanvasRefresh: true });
        setHoveredCanvasTarget(null);
    });

    window.addEventListener('mousemove', (e) => {
        if (!draggingElement) {
            // Hover detection
            const coords = getCanvasCoords(e);
            const hoverTarget = getHoverTargetAt(coords.x, coords.y);
            const selectedTarget = getSelectedCanvasTarget();
            const handle = hitTestResizeHandle(hoverTarget || selectedTarget, coords.x, coords.y, getCanvasDimensions());

            setHoveredCanvasTarget(hoverTarget);
            canvasWrapper.classList.toggle('element-hover', !!hoverTarget);

            if (handle) {
                canvasWrapper.style.cursor = getResizeCursor(handle);
            } else if (hoverTarget) {
                canvasWrapper.style.cursor = 'grab';
            } else {
                canvasWrapper.style.cursor = '';
            }
            return;
        }
        e.preventDefault();
        queueDragMove(getCanvasCoords(e));
    });

    window.addEventListener('mouseup', () => clearDrag());

    // Touch support
    previewCanvas.addEventListener('touchstart', (e) => {
        const coords = getCanvasCoords(e);

        const popoutHit = hitTestPopouts(coords.x, coords.y);
        if (popoutHit) {
            e.preventDefault();
            const dims = getCanvasDimensions();
            draggingElement = {
                id: popoutHit.id,
                startX: coords.x,
                startY: coords.y,
                origX: popoutHit.x,
                origY: popoutHit.y,
                dims: dims,
                isPopout: true
            };
            selectedPopoutId = popoutHit.id;
            selectedElementId = null;
            setSelectedCanvasTarget({ type: 'popout', id: popoutHit.id }, { skipCanvasRefresh: true });
            updatePopoutsList();
            updatePopoutProperties();
            activateSidebarTab('popouts');
            return;
        }

        const hit = hitTestElements(coords.x, coords.y);
        if (hit) {
            e.preventDefault();
            const dims = getCanvasDimensions();
            draggingElement = {
                id: hit.id,
                startX: coords.x,
                startY: coords.y,
                origX: hit.x,
                origY: hit.y,
                dims: dims,
                isPopout: false
            };
            selectedElementId = hit.id;
            setSelectedCanvasTarget({ type: 'element', id: hit.id }, { skipCanvasRefresh: true });
            updateElementsList();
            updateElementProperties();
            activateSidebarTab('elements');
        }
    }, { passive: false });

    previewCanvas.addEventListener('touchmove', (e) => {
        if (!draggingElement) return;
        e.preventDefault();
        queueDragMove(getCanvasCoords(e));
    }, { passive: false });

    previewCanvas.addEventListener('touchend', () => clearDrag());
}

// Draw snap guide lines over the canvas when dragging near center/middle
function drawSnapGuides() {
    if (!draggingElement) return;

    const el = getSelectedElement();
    if (!el) return;

    const dims = getCanvasDimensions();
    // Scale relative to canvas so guides stay visible in the scaled-down preview
    const scale = dims.width / 400;

    ctx.save();
    ctx.strokeStyle = 'rgba(120, 170, 255, 0.45)';
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.setLineDash([12 * scale, 8 * scale]);

    // Vertical center line (x = 50%)
    if (Math.abs(el.x - 50) < 0.01) {
        const lineX = Math.round(dims.width * 0.5);
        ctx.beginPath();
        ctx.moveTo(lineX, 0);
        ctx.lineTo(lineX, dims.height);
        ctx.stroke();
    }

    // Horizontal middle line (y = 50%)
    if (Math.abs(el.y - 50) < 0.01) {
        const lineY = Math.round(dims.height * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(dims.width, lineY);
        ctx.stroke();
    }

    ctx.restore();
}

// ===== Popouts Tab UI =====

function updatePopoutsList() {
    const listEl = document.getElementById('popouts-list');
    const emptyEl = document.getElementById('popouts-empty');
    const addBtn = document.getElementById('add-popout-btn');
    if (!listEl) return;

    const popouts = getPopouts();
    const screenshot = getCurrentScreenshot();
    const hasImage = screenshot && getScreenshotImage(screenshot);

    // Disable add button when no screenshot image
    if (addBtn) {
        addBtn.disabled = !hasImage;
        addBtn.style.opacity = hasImage ? '' : '0.4';
    }

    // Remove old items
    listEl.querySelectorAll('.popout-item').forEach(el => el.remove());

    if (popouts.length === 0) {
        if (emptyEl) emptyEl.style.display = '';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    popouts.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'popout-item' + (p.id === selectedPopoutId ? ' selected' : '');
        item.dataset.popoutId = p.id;

        // Generate crop preview thumbnail
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 28;
        thumbCanvas.height = 28;
        const thumbCtx = thumbCanvas.getContext('2d');
        const img = hasImage ? getScreenshotImage(screenshot) : null;
        if (img) {
            const sx = (p.cropX / 100) * img.width;
            const sy = (p.cropY / 100) * img.height;
            const sw = (p.cropWidth / 100) * img.width;
            const sh = (p.cropHeight / 100) * img.height;
            thumbCtx.drawImage(img, sx, sy, sw, sh, 0, 0, 28, 28);
        }

        item.innerHTML = `
            <div class="popout-item-thumb"></div>
            <div class="popout-item-info">
                <div class="popout-item-name">Popout ${idx + 1}</div>
                <div class="popout-item-crop">${Math.round(p.cropWidth)}% × ${Math.round(p.cropHeight)}%</div>
            </div>
            <div class="popout-item-actions">
                <button class="element-item-btn" data-action="move-up" title="Move up">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="18 15 12 9 6 15"/>
                    </svg>
                </button>
                <button class="element-item-btn" data-action="move-down" title="Move down">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </button>
                <button class="element-item-btn danger" data-action="delete" title="Delete">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `;

        // Insert thumbnail canvas
        const thumbHolder = item.querySelector('.popout-item-thumb');
        if (thumbHolder) thumbHolder.appendChild(thumbCanvas);

        item.addEventListener('click', (e) => {
            if (e.target.closest('.element-item-btn')) return;
            selectedPopoutId = p.id;
            setSelectedCanvasTarget({ type: 'popout', id: p.id }, { skipCanvasRefresh: true });
            updatePopoutsList();
            updatePopoutProperties();
            updateCanvas({ skipSave: true, skipInlinePreviews: true });
        });

        item.querySelectorAll('.element-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if (action === 'delete') deletePopout(p.id);
                else if (action === 'move-up') movePopout(p.id, 'up');
                else if (action === 'move-down') movePopout(p.id, 'down');
            });
        });

        listEl.appendChild(item);
    });
}

function updatePopoutProperties() {
    const propsEl = document.getElementById('popout-properties');
    if (!propsEl) return;

    const p = getSelectedPopout();
    if (!p) {
        propsEl.style.display = 'none';
        return;
    }
    propsEl.style.display = '';

    // Crop region
    document.getElementById('popout-crop-x').value = p.cropX;
    document.getElementById('popout-crop-x-value').textContent = formatValue(p.cropX) + '%';
    document.getElementById('popout-crop-y').value = p.cropY;
    document.getElementById('popout-crop-y-value').textContent = formatValue(p.cropY) + '%';
    document.getElementById('popout-crop-width').value = p.cropWidth;
    document.getElementById('popout-crop-width-value').textContent = formatValue(p.cropWidth) + '%';
    document.getElementById('popout-crop-height').value = p.cropHeight;
    document.getElementById('popout-crop-height-value').textContent = formatValue(p.cropHeight) + '%';

    // Display
    document.getElementById('popout-x').value = p.x;
    document.getElementById('popout-x-value').textContent = formatValue(p.x) + '%';
    document.getElementById('popout-y').value = p.y;
    document.getElementById('popout-y-value').textContent = formatValue(p.y) + '%';
    document.getElementById('popout-width').value = p.width;
    document.getElementById('popout-width-value').textContent = formatValue(p.width) + '%';
    document.getElementById('popout-rotation').value = p.rotation;
    document.getElementById('popout-rotation-value').textContent = formatValue(p.rotation) + '°';
    document.getElementById('popout-opacity').value = p.opacity;
    document.getElementById('popout-opacity-value').textContent = formatValue(p.opacity) + '%';
    document.getElementById('popout-corner-radius').value = p.cornerRadius;
    document.getElementById('popout-corner-radius-value').textContent = formatValue(p.cornerRadius) + 'px';

    // Shadow
    const shadow = p.shadow || { enabled: false, color: '#000000', blur: 30, opacity: 40, x: 0, y: 15 };
    document.getElementById('popout-shadow-toggle').classList.toggle('active', shadow.enabled);
    const shadowRow = document.getElementById('popout-shadow-toggle')?.closest('.toggle-row');
    if (shadowRow) shadowRow.classList.toggle('collapsed', !shadow.enabled);
    document.getElementById('popout-shadow-options').style.display = shadow.enabled ? '' : 'none';
    document.getElementById('popout-shadow-color').value = shadow.color;
    document.getElementById('popout-shadow-color-hex').value = shadow.color;
    document.getElementById('popout-shadow-blur').value = shadow.blur;
    document.getElementById('popout-shadow-blur-value').textContent = formatValue(shadow.blur) + 'px';
    document.getElementById('popout-shadow-opacity').value = shadow.opacity;
    document.getElementById('popout-shadow-opacity-value').textContent = formatValue(shadow.opacity) + '%';
    document.getElementById('popout-shadow-x').value = shadow.x;
    document.getElementById('popout-shadow-x-value').textContent = formatValue(shadow.x) + 'px';
    document.getElementById('popout-shadow-y').value = shadow.y;
    document.getElementById('popout-shadow-y-value').textContent = formatValue(shadow.y) + 'px';

    // Border
    const border = p.border || { enabled: false, color: '#ffffff', width: 3, opacity: 100 };
    document.getElementById('popout-border-toggle').classList.toggle('active', border.enabled);
    const borderRow = document.getElementById('popout-border-toggle')?.closest('.toggle-row');
    if (borderRow) borderRow.classList.toggle('collapsed', !border.enabled);
    document.getElementById('popout-border-options').style.display = border.enabled ? '' : 'none';
    document.getElementById('popout-border-color').value = border.color;
    document.getElementById('popout-border-color-hex').value = border.color;
    document.getElementById('popout-border-width').value = border.width;
    document.getElementById('popout-border-width-value').textContent = formatValue(border.width) + 'px';
    document.getElementById('popout-border-opacity').value = border.opacity;
    document.getElementById('popout-border-opacity-value').textContent = formatValue(border.opacity) + '%';

    // Update crop preview
    updateCropPreview();
}

// Compute image-fit layout within the crop preview canvas (letterboxed)
function getCropPreviewLayout(previewCanvas, img) {
    const w = previewCanvas.width;
    const h = previewCanvas.height;
    const imgAspect = img.width / img.height;
    const canvasAspect = w / h;
    let drawW, drawH, drawX, drawY;
    if (imgAspect > canvasAspect) {
        drawW = w;
        drawH = w / imgAspect;
        drawX = 0;
        drawY = (h - drawH) / 2;
    } else {
        drawH = h;
        drawW = h * imgAspect;
        drawX = (w - drawW) / 2;
        drawY = 0;
    }
    return { drawX, drawY, drawW, drawH };
}

function updateCropPreview() {
    const previewCanvas = document.getElementById('popout-crop-preview');
    if (!previewCanvas) return;
    const p = getSelectedPopout();
    const screenshot = getCurrentScreenshot();
    if (!p || !screenshot) return;
    const img = getScreenshotImage(screenshot);
    if (!img) return;

    // Resize canvas to match sidebar width while keeping image aspect
    const containerWidth = previewCanvas.parentElement?.clientWidth || 280;
    const imgAspect = img.width / img.height;
    const canvasW = containerWidth * 2; // 2x for retina
    const canvasH = Math.round(canvasW / imgAspect);
    previewCanvas.width = canvasW;
    previewCanvas.height = canvasH;
    previewCanvas.style.width = containerWidth + 'px';
    previewCanvas.style.height = Math.round(containerWidth / imgAspect) + 'px';

    const ctx2 = previewCanvas.getContext('2d');
    const layout = getCropPreviewLayout(previewCanvas, img);
    const { drawX, drawY, drawW, drawH } = layout;

    ctx2.clearRect(0, 0, canvasW, canvasH);

    // Draw full image
    ctx2.drawImage(img, drawX, drawY, drawW, drawH);

    // Dim overlay outside crop region
    const rx = drawX + (p.cropX / 100) * drawW;
    const ry = drawY + (p.cropY / 100) * drawH;
    const rw = (p.cropWidth / 100) * drawW;
    const rh = (p.cropHeight / 100) * drawH;

    ctx2.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx2.fillRect(0, 0, canvasW, canvasH);

    // Clear crop region to show undimmed image
    ctx2.save();
    ctx2.beginPath();
    ctx2.rect(rx, ry, rw, rh);
    ctx2.clip();
    ctx2.clearRect(rx, ry, rw, rh);
    ctx2.drawImage(img, drawX, drawY, drawW, drawH);
    ctx2.restore();

    // Crop border
    ctx2.strokeStyle = 'rgba(10, 132, 255, 0.9)';
    ctx2.lineWidth = 2;
    ctx2.strokeRect(rx, ry, rw, rh);

    // Corner handles (vector editor style)
    const handleSize = 8;
    const handles = [
        { x: rx, y: ry },                     // top-left
        { x: rx + rw, y: ry },                // top-right
        { x: rx, y: ry + rh },                // bottom-left
        { x: rx + rw, y: ry + rh },           // bottom-right
    ];
    // Edge midpoint handles
    const midHandles = [
        { x: rx + rw / 2, y: ry },            // top-center
        { x: rx + rw / 2, y: ry + rh },       // bottom-center
        { x: rx, y: ry + rh / 2 },            // left-center
        { x: rx + rw, y: ry + rh / 2 },       // right-center
    ];

    ctx2.fillStyle = '#ffffff';
    ctx2.strokeStyle = 'rgba(10, 132, 255, 1)';
    ctx2.lineWidth = 1.5;
    [...handles, ...midHandles].forEach(h => {
        ctx2.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
        ctx2.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
    });
}

// ===== Interactive crop preview drag =====
let cropDragState = null;

function setupCropPreviewDrag() {
    const previewCanvas = document.getElementById('popout-crop-preview');
    if (!previewCanvas) return;

    function getCropCanvasCoords(e) {
        const rect = previewCanvas.getBoundingClientRect();
        const scaleX = previewCanvas.width / rect.width;
        const scaleY = previewCanvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function hitTestCropHandle(coords) {
        const p = getSelectedPopout();
        const screenshot = getCurrentScreenshot();
        if (!p || !screenshot) return null;
        const img = getScreenshotImage(screenshot);
        if (!img) return null;

        const layout = getCropPreviewLayout(previewCanvas, img);
        const { drawX, drawY, drawW, drawH } = layout;
        const rx = drawX + (p.cropX / 100) * drawW;
        const ry = drawY + (p.cropY / 100) * drawH;
        const rw = (p.cropWidth / 100) * drawW;
        const rh = (p.cropHeight / 100) * drawH;

        const hitR = 12; // hit radius
        const tests = [
            { x: rx, y: ry, handle: 'top-left' },
            { x: rx + rw, y: ry, handle: 'top-right' },
            { x: rx, y: ry + rh, handle: 'bottom-left' },
            { x: rx + rw, y: ry + rh, handle: 'bottom-right' },
            { x: rx + rw / 2, y: ry, handle: 'top' },
            { x: rx + rw / 2, y: ry + rh, handle: 'bottom' },
            { x: rx, y: ry + rh / 2, handle: 'left' },
            { x: rx + rw, y: ry + rh / 2, handle: 'right' },
        ];
        for (const t of tests) {
            if (Math.abs(coords.x - t.x) < hitR && Math.abs(coords.y - t.y) < hitR) {
                return t.handle;
            }
        }
        // Check if inside the crop region (move)
        if (coords.x >= rx && coords.x <= rx + rw && coords.y >= ry && coords.y <= ry + rh) {
            return 'move';
        }
        return null;
    }

    function startCropDrag(e) {
        const coords = getCropCanvasCoords(e);
        const handle = hitTestCropHandle(coords);
        if (!handle) return;

        e.preventDefault();
        const p = getSelectedPopout();
        if (!p) return;
        cropDragState = {
            handle,
            startX: coords.x,
            startY: coords.y,
            origCropX: p.cropX,
            origCropY: p.cropY,
            origCropW: p.cropWidth,
            origCropH: p.cropHeight
        };
    }

    function moveCropDrag(e) {
        if (!cropDragState) {
            // Update cursor based on hover
            const coords = getCropCanvasCoords(e);
            const handle = hitTestCropHandle(coords);
            const cursorMap = {
                'top-left': 'nwse-resize', 'bottom-right': 'nwse-resize',
                'top-right': 'nesw-resize', 'bottom-left': 'nesw-resize',
                'top': 'ns-resize', 'bottom': 'ns-resize',
                'left': 'ew-resize', 'right': 'ew-resize',
                'move': 'move'
            };
            previewCanvas.style.cursor = cursorMap[handle] || 'default';
            return;
        }
        e.preventDefault();
        const coords = getCropCanvasCoords(e);
        const p = getSelectedPopout();
        const screenshot = getCurrentScreenshot();
        if (!p || !screenshot) return;
        const img = getScreenshotImage(screenshot);
        if (!img) return;

        const layout = getCropPreviewLayout(previewCanvas, img);
        const { drawW, drawH } = layout;

        // Convert pixel delta to percentage
        const dxPct = ((coords.x - cropDragState.startX) / drawW) * 100;
        const dyPct = ((coords.y - cropDragState.startY) / drawH) * 100;
        const h = cropDragState.handle;
        const orig = cropDragState;

        let newX = orig.origCropX, newY = orig.origCropY;
        let newW = orig.origCropW, newH = orig.origCropH;

        if (h === 'move') {
            newX = Math.max(0, Math.min(100 - newW, orig.origCropX + dxPct));
            newY = Math.max(0, Math.min(100 - newH, orig.origCropY + dyPct));
        } else {
            if (h.includes('left')) { newX = orig.origCropX + dxPct; newW = orig.origCropW - dxPct; }
            if (h.includes('right') || h === 'right') { newW = orig.origCropW + dxPct; }
            if (h.includes('top')) { newY = orig.origCropY + dyPct; newH = orig.origCropH - dyPct; }
            if (h.includes('bottom') || h === 'bottom') { newH = orig.origCropH + dyPct; }

            // Enforce minimums
            if (newW < 5) { if (h.includes('left')) newX = orig.origCropX + orig.origCropW - 5; newW = 5; }
            if (newH < 5) { if (h.includes('top')) newY = orig.origCropY + orig.origCropH - 5; newH = 5; }

            // Clamp to canvas bounds
            newX = Math.max(0, newX);
            newY = Math.max(0, newY);
            if (newX + newW > 100) newW = 100 - newX;
            if (newY + newH > 100) newH = 100 - newY;
        }

        p.cropX = newX;
        p.cropY = newY;
        p.cropWidth = newW;
        p.cropHeight = newH;
        updateCropPreview();
        updatePopoutProperties();
        updateCanvas();
    }

    function endCropDrag() {
        cropDragState = null;
    }

    previewCanvas.addEventListener('mousedown', startCropDrag);
    window.addEventListener('mousemove', moveCropDrag);
    window.addEventListener('mouseup', endCropDrag);
    previewCanvas.addEventListener('touchstart', startCropDrag, { passive: false });
    previewCanvas.addEventListener('touchmove', (e) => { if (cropDragState) moveCropDrag(e); }, { passive: false });
    previewCanvas.addEventListener('touchend', endCropDrag);
}

function setupPopoutEventListeners() {
    // Add Popout button
    const addBtn = document.getElementById('add-popout-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => addPopout());
    }

    // Crop sliders
    const bindPopoutSlider = (id, key, suffix) => {
        const input = document.getElementById(id);
        const valueEl = document.getElementById(id + '-value');
        if (!input) return;
        input.addEventListener('input', () => {
            const val = parseFloat(input.value);
            if (valueEl) valueEl.textContent = formatValue(val) + suffix;
            if (selectedPopoutId) setPopoutProperty(selectedPopoutId, key, val);
            if (key.startsWith('crop')) updateCropPreview();
        });
    };

    bindPopoutSlider('popout-crop-x', 'cropX', '%');
    bindPopoutSlider('popout-crop-y', 'cropY', '%');
    bindPopoutSlider('popout-crop-width', 'cropWidth', '%');
    bindPopoutSlider('popout-crop-height', 'cropHeight', '%');
    bindPopoutSlider('popout-x', 'x', '%');
    bindPopoutSlider('popout-y', 'y', '%');
    bindPopoutSlider('popout-width', 'width', '%');
    bindPopoutSlider('popout-rotation', 'rotation', '°');
    bindPopoutSlider('popout-opacity', 'opacity', '%');
    bindPopoutSlider('popout-corner-radius', 'cornerRadius', 'px');

    // Shadow toggle
    const shadowToggle = document.getElementById('popout-shadow-toggle');
    if (shadowToggle) {
        shadowToggle.addEventListener('click', () => {
            const p = getSelectedPopout();
            if (!p) return;
            p.shadow.enabled = !p.shadow.enabled;
            updatePopoutProperties();
            updateCanvas();
        });
    }

    // Shadow properties
    const bindPopoutShadow = (inputId, prop, suffix) => {
        const input = document.getElementById(inputId);
        const valEl = document.getElementById(inputId + '-value');
        if (!input) return;
        input.addEventListener('input', () => {
            const p = getSelectedPopout();
            if (!p) return;
            p.shadow[prop] = parseFloat(input.value);
            if (valEl) valEl.textContent = formatValue(parseFloat(input.value)) + suffix;
            updateCanvas();
        });
    };
    bindPopoutShadow('popout-shadow-blur', 'blur', 'px');
    bindPopoutShadow('popout-shadow-opacity', 'opacity', '%');
    bindPopoutShadow('popout-shadow-x', 'x', 'px');
    bindPopoutShadow('popout-shadow-y', 'y', 'px');

    // Shadow color
    const shadowColor = document.getElementById('popout-shadow-color');
    const shadowColorHex = document.getElementById('popout-shadow-color-hex');
    if (shadowColor) {
        shadowColor.addEventListener('input', () => {
            const p = getSelectedPopout();
            if (p) { p.shadow.color = shadowColor.value; if (shadowColorHex) shadowColorHex.value = shadowColor.value; updateCanvas(); }
        });
    }
    if (shadowColorHex) {
        shadowColorHex.addEventListener('change', () => {
            if (/^#[0-9a-fA-F]{6}$/.test(shadowColorHex.value)) {
                const p = getSelectedPopout();
                if (p) { p.shadow.color = shadowColorHex.value; if (shadowColor) shadowColor.value = shadowColorHex.value; updateCanvas(); }
            }
        });
    }

    // Border toggle
    const borderToggle = document.getElementById('popout-border-toggle');
    if (borderToggle) {
        borderToggle.addEventListener('click', () => {
            const p = getSelectedPopout();
            if (!p) return;
            p.border.enabled = !p.border.enabled;
            updatePopoutProperties();
            updateCanvas();
        });
    }

    // Border properties
    const bindPopoutBorder = (inputId, prop, suffix) => {
        const input = document.getElementById(inputId);
        const valEl = document.getElementById(inputId + '-value');
        if (!input) return;
        input.addEventListener('input', () => {
            const p = getSelectedPopout();
            if (!p) return;
            p.border[prop] = parseFloat(input.value);
            if (valEl) valEl.textContent = formatValue(parseFloat(input.value)) + suffix;
            updateCanvas();
        });
    };
    bindPopoutBorder('popout-border-width', 'width', 'px');
    bindPopoutBorder('popout-border-opacity', 'opacity', '%');

    // Border color
    const borderColor = document.getElementById('popout-border-color');
    const borderColorHex = document.getElementById('popout-border-color-hex');
    if (borderColor) {
        borderColor.addEventListener('input', () => {
            const p = getSelectedPopout();
            if (p) { p.border.color = borderColor.value; if (borderColorHex) borderColorHex.value = borderColor.value; updateCanvas(); }
        });
    }
    if (borderColorHex) {
        borderColorHex.addEventListener('change', () => {
            if (/^#[0-9a-fA-F]{6}$/.test(borderColorHex.value)) {
                const p = getSelectedPopout();
                if (p) { p.border.color = borderColorHex.value; if (borderColor) borderColor.value = borderColorHex.value; updateCanvas(); }
            }
        });
    }

    // Interactive crop preview drag handles
    setupCropPreviewDrag();
}

function setupEventListeners() {
    // Collapsible toggle rows
    document.querySelectorAll('.toggle-row.collapsible').forEach(row => {
        row.addEventListener('click', (e) => {
            // Don't collapse when clicking the toggle switch itself
            if (e.target.closest('.toggle')) return;

            const targetId = row.dataset.target;
            const target = document.getElementById(targetId);
            if (target) {
                row.classList.toggle('collapsed');
                target.style.display = row.classList.contains('collapsed') ? 'none' : 'block';
            }
        });
    });

    // File upload
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    const addMediaBtn = document.getElementById('add-media-btn');
    if (addMediaBtn && mediaUploadInput) {
        addMediaBtn.addEventListener('click', () => mediaUploadInput.click());
        mediaUploadInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            for (const file of files) {
                try {
                    await uploadMediaFile(file);
                } catch (err) {
                    console.error('Media upload failed:', err);
                }
            }
            mediaUploadInput.value = '';
        });
    }

    // Add screenshots button
    document.querySelectorAll('#add-screenshots-btn').forEach(btn => {
        btn.addEventListener('click', () => fileInput.click());
    });

    // Add blank screen button
    document.querySelectorAll('#add-blank-btn, #add-blank-topbar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            createNewScreenshot(null, null, 'Blank Screen', null, state.outputDevice);
            state.selectedIndex = state.screenshots.length - 1;
            updateScreenshotList();
            syncUIWithState();
            updateGradientStopsUI();
            updateCanvas();
        });
    });

    // Make the entire sidebar content area a drop zone
    const sidebarContent = screenshotList.closest('.sidebar-content');
    sidebarContent.addEventListener('dragover', (e) => {
        // Only handle file drops, not internal screenshot reordering
        if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            sidebarContent.classList.add('drop-active');
        }
    });
    sidebarContent.addEventListener('dragleave', (e) => {
        // Only remove class if leaving the area entirely
        if (!sidebarContent.contains(e.relatedTarget)) {
            sidebarContent.classList.remove('drop-active');
        }
    });
    sidebarContent.addEventListener('drop', (e) => {
        if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            sidebarContent.classList.remove('drop-active');
            handleFiles(e.dataTransfer.files);
        }
    });

    // Set as Default button (commented out)
    // document.getElementById('set-as-default-btn').addEventListener('click', () => {
    //     if (state.screenshots.length === 0) return;
    //     setCurrentScreenshotAsDefault();
    //     // Show brief confirmation
    //     const btn = document.getElementById('set-as-default-btn');
    //     const originalText = btn.textContent;
    //     btn.textContent = 'Saved!';
    //     btn.style.borderColor = 'var(--accent)';
    //     btn.style.color = 'var(--accent)';
    //     setTimeout(() => {
    //         btn.textContent = originalText;
    //         btn.style.borderColor = '';
    //         btn.style.color = '';
    //     }, 1500);
    // });

    // Project dropdown
    const projectDropdown = document.getElementById('project-dropdown');
    const projectTrigger = document.getElementById('project-trigger');

    projectTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        projectDropdown.classList.toggle('open');
        // Close output size dropdown if open
        document.getElementById('output-size-dropdown').classList.remove('open');
    });

    // Close project dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!projectDropdown.contains(e.target)) {
            projectDropdown.classList.remove('open');
        }
    });

    document.getElementById('new-project-btn').addEventListener('click', () => {
        document.getElementById('project-modal-title').textContent = 'New Project';
        document.getElementById('project-name-input').value = '';
        document.getElementById('project-modal-confirm').textContent = 'Create';
        document.getElementById('project-modal').dataset.mode = 'new';

        const duplicateGroup = document.getElementById('duplicate-from-group');
        const duplicateSelect = document.getElementById('duplicate-from-select');
        if (projects.length > 0) {
            duplicateGroup.style.display = 'block';
            duplicateSelect.innerHTML = '<option value="">None (empty project)</option>';
            projects.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.name + (p.screenshotCount ? ` (${p.screenshotCount} screenshots)` : '');
                duplicateSelect.appendChild(option);
            });
        } else {
            duplicateGroup.style.display = 'none';
        }

        document.getElementById('project-modal').classList.add('visible');
        document.getElementById('project-name-input').focus();
    });

    document.getElementById('duplicate-from-select').addEventListener('change', (e) => {
        const selectedId = e.target.value;
        if (selectedId) {
            const selectedProject = projects.find(p => String(p.id) === String(selectedId));
            if (selectedProject) {
                document.getElementById('project-name-input').value = selectedProject.name + ' (Copy)';
            }
        } else {
            document.getElementById('project-name-input').value = '';
        }
    });

    document.getElementById('rename-project-btn').addEventListener('click', () => {
        const project = projects.find(p => p.id === currentProjectId);
        document.getElementById('project-modal-title').textContent = 'Rename Project';
        document.getElementById('project-name-input').value = project ? project.name : '';
        document.getElementById('project-modal-confirm').textContent = 'Rename';
        document.getElementById('project-modal').dataset.mode = 'rename';
        document.getElementById('duplicate-from-group').style.display = 'none';
        document.getElementById('project-modal').classList.add('visible');
        document.getElementById('project-name-input').focus();
    });

    document.getElementById('delete-project-btn').addEventListener('click', async () => {
        if (projects.length <= 1) {
            await showAppAlert('Cannot delete the only project', 'info');
            return;
        }
        const project = projects.find(p => p.id === currentProjectId);
        document.getElementById('delete-project-message').textContent =
            `Are you sure you want to delete "${project ? project.name : 'this project'}"? This cannot be undone.`;
        document.getElementById('delete-project-modal').classList.add('visible');
    });

    // Project modal buttons
    document.getElementById('project-modal-cancel').addEventListener('click', () => {
        document.getElementById('project-modal').classList.remove('visible');
    });

    document.getElementById('project-modal-confirm').addEventListener('click', async () => {
        const name = document.getElementById('project-name-input').value.trim();
        if (!name) {
            await showAppAlert('Please enter a project name', 'info');
            return;
        }

        const mode = document.getElementById('project-modal').dataset.mode;
        if (mode === 'new') {
            const duplicateFromId = document.getElementById('duplicate-from-select').value;
            if (duplicateFromId) {
                await duplicateProject(Number.parseInt(duplicateFromId, 10), name);
            } else {
                await createProject(name);
            }
        } else if (mode === 'rename') {
            renameProject(name);
        }

        document.getElementById('project-modal').classList.remove('visible');
    });

    document.getElementById('project-name-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('project-modal-confirm').click();
        }
    });

    // Delete project modal buttons
    document.getElementById('delete-project-cancel').addEventListener('click', () => {
        document.getElementById('delete-project-modal').classList.remove('visible');
    });

    document.getElementById('delete-project-confirm').addEventListener('click', () => {
        deleteProject();
        document.getElementById('delete-project-modal').classList.remove('visible');
    });

    // Apply style to all modal buttons
    document.getElementById('apply-style-cancel').addEventListener('click', () => {
        document.getElementById('apply-style-modal').classList.remove('visible');
    });

    document.getElementById('apply-style-confirm').addEventListener('click', () => {
        applyStyleToAll();
        document.getElementById('apply-style-modal').classList.remove('visible');
    });

    // Close modals on overlay click
    document.getElementById('project-modal').addEventListener('click', (e) => {
        if (e.target.id === 'project-modal') {
            document.getElementById('project-modal').classList.remove('visible');
        }
    });

    document.getElementById('delete-project-modal').addEventListener('click', (e) => {
        if (e.target.id === 'delete-project-modal') {
            document.getElementById('delete-project-modal').classList.remove('visible');
        }
    });

    document.getElementById('apply-style-modal').addEventListener('click', (e) => {
        if (e.target.id === 'apply-style-modal') {
            document.getElementById('apply-style-modal').classList.remove('visible');
        }
    });

    // Language picker events
    document.getElementById('language-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        const menu = document.getElementById('language-menu');
        menu.classList.toggle('visible');
        if (menu.classList.contains('visible')) {
            // Position menu below button using fixed positioning
            const rect = btn.getBoundingClientRect();
            menu.style.top = (rect.bottom + 4) + 'px';
            menu.style.left = rect.left + 'px';
            updateLanguageMenu();
        }
    });

    // Close language menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.language-picker')) {
            document.getElementById('language-menu').classList.remove('visible');
        }
    });

    // Edit Languages button
    document.getElementById('edit-languages-btn').addEventListener('click', () => {
        openLanguagesModal();
    });

    // Translate All button
    document.getElementById('translate-all-btn').addEventListener('click', () => {
        document.getElementById('language-menu').classList.remove('visible');
        translateAllText();
    });

    // Unified AI button (in header)
    document.getElementById('ai-generate-btn').addEventListener('click', () => {
        dismissMagicalTitlesTooltip();
        document.getElementById('ai-action-modal').classList.add('visible');
    });

    // AI action chooser modal events
    document.getElementById('ai-action-cancel').addEventListener('click', () => {
        document.getElementById('ai-action-modal').classList.remove('visible');
    });
    document.getElementById('ai-action-layout').addEventListener('click', () => {
        document.getElementById('ai-action-modal').classList.remove('visible');
        showAiGenerateDialog();
    });
    document.getElementById('ai-action-background').addEventListener('click', () => {
        document.getElementById('ai-action-modal').classList.remove('visible');
        generateAiBackground();
    });
    document.getElementById('ai-action-titles').addEventListener('click', () => {
        document.getElementById('ai-action-modal').classList.remove('visible');
        showMagicalTitlesDialog();
    });
    document.getElementById('ai-action-modal').addEventListener('click', (e) => {
        if (e.target.id === 'ai-action-modal') {
            document.getElementById('ai-action-modal').classList.remove('visible');
        }
    });

    // Magical Titles modal events
    document.getElementById('magical-titles-cancel').addEventListener('click', hideMagicalTitlesDialog);
    document.getElementById('magical-titles-confirm').addEventListener('click', generateMagicalTitles);
    document.getElementById('magical-titles-modal').addEventListener('click', (e) => {
        if (e.target.id === 'magical-titles-modal') hideMagicalTitlesDialog();
    });

    // AI Generate modal events
    document.getElementById('ai-generate-cancel').addEventListener('click', hideAiGenerateDialog);
    document.getElementById('ai-generate-confirm').addEventListener('click', generateAiLayout);
    document.getElementById('ai-generate-modal').addEventListener('click', (e) => {
        if (e.target.id === 'ai-generate-modal') hideAiGenerateDialog();
    });

    // Languages modal events
    document.getElementById('languages-modal-close').addEventListener('click', closeLanguagesModal);
    document.getElementById('languages-modal-done').addEventListener('click', closeLanguagesModal);
    document.getElementById('languages-modal').addEventListener('click', (e) => {
        if (e.target.id === 'languages-modal') closeLanguagesModal();
    });

    document.getElementById('add-language-select').addEventListener('change', (e) => {
        if (e.target.value) {
            addProjectLanguage(e.target.value);
            e.target.value = '';
        }
    });

    // Screenshot translations modal events
    document.getElementById('screenshot-translations-modal-close').addEventListener('click', closeScreenshotTranslationsModal);
    document.getElementById('screenshot-translations-modal-done').addEventListener('click', closeScreenshotTranslationsModal);
    document.getElementById('screenshot-translations-modal').addEventListener('click', (e) => {
        if (e.target.id === 'screenshot-translations-modal') closeScreenshotTranslationsModal();
    });
    document.getElementById('translation-file-input').addEventListener('change', handleTranslationFileSelect);

    // Export language modal events
    document.getElementById('export-current-only').addEventListener('click', () => {
        closeExportLanguageDialog('current');
    });
    document.getElementById('export-all-languages').addEventListener('click', () => {
        closeExportLanguageDialog('all');
    });
    document.getElementById('export-language-modal-cancel').addEventListener('click', () => {
        closeExportLanguageDialog(null);
    });
    document.getElementById('export-language-modal').addEventListener('click', (e) => {
        if (e.target.id === 'export-language-modal') closeExportLanguageDialog(null);
    });

    // Duplicate screenshot dialog
    initDuplicateDialogListeners();
    document.getElementById('duplicate-screenshot-modal').addEventListener('click', (e) => {
        if (e.target.id === 'duplicate-screenshot-modal') closeDuplicateDialog('ignore');
    });

    // Translate button events
    document.getElementById('translate-headline-btn').addEventListener('click', () => {
        openTranslateModal('headline');
    });

    document.getElementById('translate-subheadline-btn').addEventListener('click', () => {
        openTranslateModal('subheadline');
    });

    document.getElementById('translate-element-btn').addEventListener('click', () => {
        openTranslateModal('element');
    });

    document.getElementById('translate-source-lang').addEventListener('change', (e) => {
        updateTranslateSourcePreview();
    });

    document.getElementById('translate-modal-cancel').addEventListener('click', () => {
        document.getElementById('translate-modal').classList.remove('visible');
    });

    document.getElementById('translate-modal-apply').addEventListener('click', () => {
        applyTranslations();
        document.getElementById('translate-modal').classList.remove('visible');
    });

    document.getElementById('ai-translate-btn').addEventListener('click', () => {
        aiTranslateAll();
    });

    document.getElementById('translate-modal').addEventListener('click', (e) => {
        if (e.target.id === 'translate-modal') {
            document.getElementById('translate-modal').classList.remove('visible');
        }
    });

    // About modal
    document.getElementById('about-btn').addEventListener('click', () => {
        document.getElementById('about-modal').classList.add('visible');
    });

    document.getElementById('about-modal-close').addEventListener('click', () => {
        document.getElementById('about-modal').classList.remove('visible');
    });

    document.getElementById('about-modal').addEventListener('click', (e) => {
        if (e.target.id === 'about-modal') {
            document.getElementById('about-modal').classList.remove('visible');
        }
    });

    // Settings modal
    document.getElementById('settings-btn').addEventListener('click', () => {
        openSettingsModal();
    });

    document.getElementById('settings-modal-close').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.remove('visible');
    });

    document.getElementById('settings-modal-cancel').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.remove('visible');
    });

    document.getElementById('settings-modal-save').addEventListener('click', () => {
        saveSettings();
    });

    // Theme selector buttons
    document.querySelectorAll('#theme-selector button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#theme-selector button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyTheme(btn.dataset.theme);
        });
    });

    // Provider radio buttons
    document.querySelectorAll('input[name="ai-provider"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateProviderSection(e.target.value);
        });
    });

    // Show/hide key buttons for all providers
    document.querySelectorAll('.settings-show-key').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
            }
        });
    });

    document.getElementById('settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') {
            document.getElementById('settings-modal').classList.remove('visible');
        }
    });

    const saveProjectBtn = document.getElementById('save-project-btn');
    if (saveProjectBtn) {
        saveProjectBtn.addEventListener('click', () => {
            saveState({ persist: true, suppressDirty: true });
        });
    }
    updateSaveButtonState();

    // Output size dropdown
    const outputDropdown = document.getElementById('output-size-dropdown');
    const outputTrigger = document.getElementById('output-size-trigger');

    outputTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        outputDropdown.classList.toggle('open');
        // Close project dropdown if open
        document.getElementById('project-dropdown').classList.remove('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!outputDropdown.contains(e.target)) {
            outputDropdown.classList.remove('open');
        }
    });

    // Device option selection
    document.querySelectorAll('.output-size-menu .device-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.output-size-menu .device-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            state.outputDevice = opt.dataset.device;

            // Update trigger text
            document.getElementById('output-size-name').textContent = opt.querySelector('.device-option-name').textContent;
            document.getElementById('output-size-dims').textContent = opt.querySelector('.device-option-size').textContent;

            // Show/hide custom inputs
            const customInputs = document.getElementById('custom-size-inputs');
            if (state.outputDevice === 'custom') {
                customInputs.classList.add('visible');
            } else {
                customInputs.classList.remove('visible');
                outputDropdown.classList.remove('open');
            }
            updateCanvas();
        });
    });

    // Custom size inputs
    document.getElementById('custom-width').addEventListener('input', (e) => {
        state.customWidth = parseInt(e.target.value) || 1290;
        document.getElementById('output-size-dims').textContent = `${state.customWidth} × ${state.customHeight}`;
        updateCanvas();
    });
    document.getElementById('custom-height').addEventListener('input', (e) => {
        state.customHeight = parseInt(e.target.value) || 2796;
        document.getElementById('output-size-dims').textContent = `${state.customWidth} × ${state.customHeight}`;
        updateCanvas();
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
            // Save active tab to localStorage
            localStorage.setItem('activeTab', tab.dataset.tab);
        });
    });

    // Restore active tab from localStorage
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab) {
        const tabBtn = document.querySelector(`.tab[data-tab="${savedTab}"]`);
        if (tabBtn) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tabBtn.classList.add('active');
            document.getElementById('tab-' + savedTab).classList.add('active');
        }
    }

    // Background type selector
    document.querySelectorAll('#bg-type-selector button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#bg-type-selector button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setBackground('type', btn.dataset.type);

            document.getElementById('gradient-options').style.display = btn.dataset.type === 'gradient' ? 'block' : 'none';
            document.getElementById('solid-options').style.display = btn.dataset.type === 'solid' ? 'block' : 'none';
            document.getElementById('image-options').style.display = btn.dataset.type === 'image' ? 'block' : 'none';

            updateCanvas();
        });
    });

    // Gradient preset dropdown toggle
    const presetDropdown = document.getElementById('gradient-preset-dropdown');
    const presetTrigger = document.getElementById('gradient-preset-trigger');
    presetTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        presetDropdown.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!presetDropdown.contains(e.target)) {
            presetDropdown.classList.remove('open');
        }
    });

    // Position preset dropdown toggle
    const positionPresetDropdown = document.getElementById('position-preset-dropdown');
    const positionPresetTrigger = document.getElementById('position-preset-trigger');
    positionPresetTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        positionPresetDropdown.classList.toggle('open');
    });

    // Close position preset dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!positionPresetDropdown.contains(e.target)) {
            positionPresetDropdown.classList.remove('open');
        }
    });

    // Close screenshot menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.screenshot-menu-wrapper')) {
            document.querySelectorAll('.screenshot-menu.open').forEach(m => {
                m.classList.remove('open');
                m.closest('.screenshot-menu-wrapper')?.querySelector('.screenshot-menu-btn')?.classList.remove('active');
            });
        }
    });

    if (canvasSelectionToolbar) {
        canvasSelectionToolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.canvas-selection-btn');
            if (!btn) return;

            e.preventDefault();
            e.stopPropagation();

            const target = getSelectedCanvasTarget();
            if (!target) return;

            const action = btn.dataset.action;
            if (action === 'move-back') {
                moveSelectedCanvasTarget(target, 'back');
            } else if (action === 'move-forward') {
                moveSelectedCanvasTarget(target, 'forward');
            } else if (action === 'copy') {
                duplicateSelectedCanvasTarget(target);
            } else if (action === 'delete') {
                deleteSelectedCanvasTarget(target);
            }
        });
    }

    // Canvas right-click context menu
    if (canvasContextMenu) {
        canvasWrapper.addEventListener('contextmenu', (e) => {
            if (!state.screenshots.length) return;

            e.preventDefault();
            e.stopPropagation();

            const targetIndex = Math.min(Math.max(0, state.selectedIndex), state.screenshots.length - 1);
            if (state.selectedIndex !== targetIndex) {
                state.selectedIndex = targetIndex;
                updateScreenshotList();
                syncUIWithState();
                updateGradientStopsUI();
                updateCanvas();
            }

            setSelectedCanvasTarget({ type: 'screenshot' }, { skipCanvasRefresh: true });

            openCanvasContextMenu(e.clientX, e.clientY, targetIndex);
        });

        canvasContextMenu.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#canvas-context-menu')) {
                closeCanvasContextMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeCanvasContextMenu();
            }
        });

        window.addEventListener('resize', closeCanvasContextMenu);
        
        // Re-render canvas on resize so previews fit the new canvas-area height
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => updateCanvas(), 150);
        });

        canvasContextMenu.querySelector('.canvas-menu-translations')?.addEventListener('click', () => {
            const index = getCanvasContextTargetIndex();
            closeCanvasContextMenu();
            if (index === null) return;
            openScreenshotTranslationsModal(index);
        });

        canvasContextMenu.querySelector('.canvas-menu-replace')?.addEventListener('click', () => {
            const index = getCanvasContextTargetIndex();
            closeCanvasContextMenu();
            if (index === null) return;
            replaceScreenshot(index);
        });

        canvasContextMenu.querySelector('.canvas-menu-download')?.addEventListener('click', async () => {
            const index = getCanvasContextTargetIndex();
            closeCanvasContextMenu();
            if (index === null) return;

            state.selectedIndex = index;
            updateScreenshotList();
            syncUIWithState();
            updateGradientStopsUI();
            updateCanvas();
            await exportCurrent();
        });

        canvasContextMenu.querySelector('.canvas-menu-move-left')?.addEventListener('click', () => {
            const index = getCanvasContextTargetIndex();
            closeCanvasContextMenu();
            if (index === null || isSliding) return;
            swapScreenshotsWithAdjacent(index, 'left');
        });

        canvasContextMenu.querySelector('.canvas-menu-move-right')?.addEventListener('click', () => {
            const index = getCanvasContextTargetIndex();
            closeCanvasContextMenu();
            if (index === null || isSliding) return;
            swapScreenshotsWithAdjacent(index, 'right');
        });

        canvasContextMenu.querySelector('.canvas-menu-transfer')?.addEventListener('click', () => {
            const index = getCanvasContextTargetIndex();
            closeCanvasContextMenu();
            if (index === null) return;
            state.transferTarget = index;
            updateScreenshotList();
        });

        canvasContextMenu.querySelector('.canvas-menu-apply-all')?.addEventListener('click', () => {
            const index = getCanvasContextTargetIndex();
            closeCanvasContextMenu();
            if (index === null) return;
            showApplyStyleModal(index);
        });

        canvasContextMenu.querySelector('.canvas-menu-duplicate')?.addEventListener('click', () => {
            const index = getCanvasContextTargetIndex();
            closeCanvasContextMenu();
            if (index === null) return;
            duplicateScreenshot(index);
        });

        canvasContextMenu.querySelector('.canvas-menu-remove')?.addEventListener('click', () => {
            const index = getCanvasContextTargetIndex();
            closeCanvasContextMenu();
            if (index === null) return;

            deleteScreenshotAt(index);
        });
    }

    // Gradient presets (supports static + dynamic swatches)
    const gradientPresetsContainer = document.getElementById('gradient-presets');
    if (gradientPresetsContainer) {
        gradientPresetsContainer.addEventListener('click', (event) => {
            const swatch = event.target.closest('.preset-swatch');
            if (!swatch || !gradientPresetsContainer.contains(swatch)) return;

            document.querySelectorAll('.preset-swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');

            const gradientStr = swatch.dataset.gradient || '';
            const angleMatch = gradientStr.match(/(\d+)deg/);
            const colorMatches = gradientStr.matchAll(/(#[a-fA-F0-9]{6})\s+(\d+)%/g);

            if (angleMatch) {
                const angle = parseInt(angleMatch[1], 10);
                setBackground('gradient.angle', angle);
                document.getElementById('gradient-angle').value = angle;
                document.getElementById('gradient-angle-value').textContent = formatValue(angle) + '°';
            }

            const stops = [];
            for (const match of colorMatches) {
                stops.push({ color: match[1], position: parseInt(match[2], 10) });
            }
            if (stops.length >= 2) {
                setBackground('gradient.stops', stops);
                updateGradientStopsUI();
            }

            updateUsedGradientPresets();
            updateCanvas();
        });

        updateUsedGradientPresets();
    }

    // Gradient angle
    document.getElementById('gradient-angle').addEventListener('input', (e) => {
        setBackground('gradient.angle', parseInt(e.target.value));
        document.getElementById('gradient-angle-value').textContent = formatValue(e.target.value) + '°';
        // Deselect preset when manually changing angle
        document.querySelectorAll('.preset-swatch').forEach(s => s.classList.remove('selected'));
        updateUsedGradientPresets();
        updateCanvas();
    });

    // Add gradient stop
    document.getElementById('add-gradient-stop').addEventListener('click', () => {
        const bg = getBackground();
        const lastStop = bg.gradient.stops[bg.gradient.stops.length - 1];
        bg.gradient.stops.push({
            color: lastStop.color,
            position: Math.min(lastStop.position + 20, 100)
        });
        // Deselect preset when adding a stop
        document.querySelectorAll('.preset-swatch').forEach(s => s.classList.remove('selected'));
        updateGradientStopsUI();
        updateUsedGradientPresets();
        updateCanvas();
    });

    // Solid color
    document.getElementById('solid-color').addEventListener('input', (e) => {
        setBackground('solid', e.target.value);
        document.getElementById('solid-color-hex').value = e.target.value;
        updateCanvas();
    });
    document.getElementById('solid-color-hex').addEventListener('input', (e) => {
        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
            setBackground('solid', e.target.value);
            document.getElementById('solid-color').value = e.target.value;
            updateCanvas();
        }
    });

    // Background image
    const bgImageUpload = document.getElementById('bg-image-upload');
    const bgImageInput = document.getElementById('bg-image-input');
    bgImageUpload.addEventListener('click', () => bgImageInput.click());
    bgImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let sourceUrl = null;
        try {
            const uploaded = await uploadMediaFile(file);
            sourceUrl = uploaded?.url || null;
        } catch (uploadError) {
            console.error('Background upload failed, using data URL fallback:', uploadError);
        }

        if (!sourceUrl) {
            sourceUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.readAsDataURL(file);
            });
        }

        const img = new Image();
        img.onload = () => {
            setBackground('image', img);
            document.getElementById('bg-image-preview').src = sourceUrl;
            document.getElementById('bg-image-preview').style.display = 'block';
            updateCanvas();
            saveState();
        };
        img.src = sourceUrl;
        bgImageInput.value = '';
    });

    document.getElementById('bg-image-fit').addEventListener('change', (e) => {
        setBackground('imageFit', e.target.value);
        updateCanvas();
    });

    document.getElementById('bg-blur').addEventListener('input', (e) => {
        setBackground('imageBlur', parseInt(e.target.value));
        document.getElementById('bg-blur-value').textContent = formatValue(e.target.value) + 'px';
        updateCanvas();
    });

    document.getElementById('bg-overlay-color').addEventListener('input', (e) => {
        setBackground('overlayColor', e.target.value);
        document.getElementById('bg-overlay-hex').value = e.target.value;
        updateCanvas();
    });

    document.getElementById('bg-overlay-opacity').addEventListener('input', (e) => {
        setBackground('overlayOpacity', parseInt(e.target.value));
        document.getElementById('bg-overlay-opacity-value').textContent = formatValue(e.target.value) + '%';
        updateCanvas();
    });

    // Noise toggle
    document.getElementById('noise-toggle').addEventListener('click', function () {
        this.classList.toggle('active');
        const noiseEnabled = this.classList.contains('active');
        setBackground('noise', noiseEnabled);
        const row = this.closest('.toggle-row');
        if (noiseEnabled) {
            if (row) row.classList.remove('collapsed');
            document.getElementById('noise-options').style.display = 'block';
        } else {
            if (row) row.classList.add('collapsed');
            document.getElementById('noise-options').style.display = 'none';
        }
        updateCanvas();
    });

    document.getElementById('noise-intensity').addEventListener('input', (e) => {
        setBackground('noiseIntensity', parseInt(e.target.value));
        document.getElementById('noise-intensity-value').textContent = formatValue(e.target.value) + '%';
        updateCanvas();
    });

    // Screenshot settings
    document.getElementById('screenshot-scale').addEventListener('input', (e) => {
        setScreenshotSetting('scale', parseInt(e.target.value));
        document.getElementById('screenshot-scale-value').textContent = formatValue(e.target.value) + '%';
        updateCanvas();
    });

    document.getElementById('screenshot-y').addEventListener('input', (e) => {
        setScreenshotSetting('y', parseInt(e.target.value));
        document.getElementById('screenshot-y-value').textContent = formatValue(e.target.value) + '%';
        updateCanvas();
    });

    document.getElementById('screenshot-x').addEventListener('input', (e) => {
        setScreenshotSetting('x', parseInt(e.target.value));
        document.getElementById('screenshot-x-value').textContent = formatValue(e.target.value) + '%';
        updateCanvas();
    });

    document.getElementById('corner-radius').addEventListener('input', (e) => {
        setScreenshotSetting('cornerRadius', parseInt(e.target.value));
        document.getElementById('corner-radius-value').textContent = formatValue(e.target.value) + 'px';
        updateCanvas();
    });

    document.getElementById('screenshot-rotation').addEventListener('input', (e) => {
        setScreenshotSetting('rotation', parseInt(e.target.value));
        document.getElementById('screenshot-rotation-value').textContent = formatValue(e.target.value) + '°';
        updateCanvas();
    });

    // Shadow toggle
    document.getElementById('shadow-toggle').addEventListener('click', function () {
        this.classList.toggle('active');
        const shadowEnabled = this.classList.contains('active');
        setScreenshotSetting('shadow.enabled', shadowEnabled);
        const row = this.closest('.toggle-row');
        if (shadowEnabled) {
            if (row) row.classList.remove('collapsed');
            document.getElementById('shadow-options').style.display = 'block';
        } else {
            if (row) row.classList.add('collapsed');
            document.getElementById('shadow-options').style.display = 'none';
        }
        updateCanvas();
    });

    document.getElementById('shadow-color').addEventListener('input', (e) => {
        setScreenshotSetting('shadow.color', e.target.value);
        document.getElementById('shadow-color-hex').value = e.target.value;
        updateCanvas();
    });

    document.getElementById('shadow-blur').addEventListener('input', (e) => {
        setScreenshotSetting('shadow.blur', parseInt(e.target.value));
        document.getElementById('shadow-blur-value').textContent = formatValue(e.target.value) + 'px';
        updateCanvas();
    });

    document.getElementById('shadow-opacity').addEventListener('input', (e) => {
        setScreenshotSetting('shadow.opacity', parseInt(e.target.value));
        document.getElementById('shadow-opacity-value').textContent = formatValue(e.target.value) + '%';
        updateCanvas();
    });

    document.getElementById('shadow-x').addEventListener('input', (e) => {
        setScreenshotSetting('shadow.x', parseInt(e.target.value));
        document.getElementById('shadow-x-value').textContent = formatValue(e.target.value) + 'px';
        updateCanvas();
    });

    document.getElementById('shadow-y').addEventListener('input', (e) => {
        setScreenshotSetting('shadow.y', parseInt(e.target.value));
        document.getElementById('shadow-y-value').textContent = formatValue(e.target.value) + 'px';
        updateCanvas();
    });

    // Frame toggle
    document.getElementById('frame-toggle').addEventListener('click', function () {
        this.classList.toggle('active');
        const frameEnabled = this.classList.contains('active');
        setScreenshotSetting('frame.enabled', frameEnabled);
        const row = this.closest('.toggle-row');
        if (frameEnabled) {
            if (row) row.classList.remove('collapsed');
            document.getElementById('frame-options').style.display = 'block';
        } else {
            if (row) row.classList.add('collapsed');
            document.getElementById('frame-options').style.display = 'none';
        }
        updateCanvas();
    });

    document.getElementById('frame-color').addEventListener('input', (e) => {
        setScreenshotSetting('frame.color', e.target.value);
        document.getElementById('frame-color-hex').value = e.target.value;
        updateCanvas();
    });

    document.getElementById('frame-color-hex').addEventListener('input', (e) => {
        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
            setScreenshotSetting('frame.color', e.target.value);
            document.getElementById('frame-color').value = e.target.value;
            updateCanvas();
        }
    });

    document.getElementById('frame-width').addEventListener('input', (e) => {
        setScreenshotSetting('frame.width', parseInt(e.target.value));
        document.getElementById('frame-width-value').textContent = formatValue(e.target.value) + 'px';
        updateCanvas();
    });

    document.getElementById('frame-opacity').addEventListener('input', (e) => {
        setScreenshotSetting('frame.opacity', parseInt(e.target.value));
        document.getElementById('frame-opacity-value').textContent = formatValue(e.target.value) + '%';
        updateCanvas();
    });

    // Per-language layout toggle
    document.getElementById('per-language-layout-toggle').addEventListener('click', function () {
        this.classList.toggle('active');
        const enabled = this.classList.contains('active');
        const text = getTextSettings();
        if (enabled && !text.perLanguageLayout) {
            // Seed all language settings from current global values
            const languages = new Set([...(text.headlineLanguages || ['en']), ...(text.subheadlineLanguages || ['en'])]);
            if (!text.languageSettings) text.languageSettings = {};
            languages.forEach(lang => {
                text.languageSettings[lang] = {
                    headlineSize: text.headlineSize || 100,
                    subheadlineSize: text.subheadlineSize || 50,
                    position: text.position || 'top',
                    offsetY: typeof text.offsetY === 'number' ? text.offsetY : 12,
                    lineHeight: text.lineHeight || 110
                };
            });
        }
        text.perLanguageLayout = enabled;
        updateCanvas();
    });

    // Headline toggle
    document.getElementById('headline-toggle').addEventListener('click', function () {
        this.classList.toggle('active');
        const enabled = this.classList.contains('active');
        setTextValue('headlineEnabled', enabled);
        const row = this.closest('.toggle-row');
        if (enabled) {
            if (row) row.classList.remove('collapsed');
            document.getElementById('headline-options').style.display = 'block';
        } else {
            if (row) row.classList.add('collapsed');
            document.getElementById('headline-options').style.display = 'none';
        }
        updateCanvas();
    });

    // Subheadline toggle
    document.getElementById('subheadline-toggle').addEventListener('click', function () {
        this.classList.toggle('active');
        const enabled = this.classList.contains('active');
        setTextValue('subheadlineEnabled', enabled);
        const row = this.closest('.toggle-row');
        if (enabled) {
            if (row) row.classList.remove('collapsed');
            document.getElementById('subheadline-options').style.display = 'block';
        } else {
            if (row) row.classList.add('collapsed');
            document.getElementById('subheadline-options').style.display = 'none';
        }
        updateCanvas();
    });

    // Text settings
    document.getElementById('headline-text').addEventListener('input', (e) => {
        const text = getTextSettings();
        if (!text.headlines) text.headlines = { en: '' };
        text.headlines[text.currentHeadlineLang || 'en'] = e.target.value;
        updateCanvas();
    });

    // Font picker is initialized separately via initFontPicker()

    document.getElementById('headline-size').addEventListener('input', (e) => {
        const text = getTextSettings();
        const lang = text.currentHeadlineLang || 'en';
        setTextLanguageValue('headlineSize', parseInt(e.target.value) || 100, lang);
        updateCanvas();
    });

    document.getElementById('headline-color').addEventListener('input', (e) => {
        setTextValue('headlineColor', e.target.value);
        updateCanvas();
    });

    document.getElementById('headline-weight').addEventListener('change', (e) => {
        setTextValue('headlineWeight', e.target.value);
        updateCanvas();
    });

    // Text style buttons (italic, underline, strikethrough)
    document.querySelectorAll('#headline-style button').forEach(btn => {
        btn.addEventListener('click', () => {
            const style = btn.dataset.style;
            const key = 'headline' + style.charAt(0).toUpperCase() + style.slice(1);
            const text = getTextSettings();
            const newValue = !text[key];
            setTextValue(key, newValue);
            btn.classList.toggle('active', newValue);
            updateCanvas();
        });
    });

    document.querySelectorAll('#text-position button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#text-position button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setTextLanguageValue('position', btn.dataset.position);
            updateCanvas();
        });
    });

    document.getElementById('text-offset-y').addEventListener('input', (e) => {
        setTextLanguageValue('offsetY', parseInt(e.target.value));
        document.getElementById('text-offset-y-value').textContent = formatValue(e.target.value) + '%';
        updateCanvas();
    });

    document.getElementById('line-height').addEventListener('input', (e) => {
        setTextLanguageValue('lineHeight', parseInt(e.target.value));
        document.getElementById('line-height-value').textContent = formatValue(e.target.value) + '%';
        updateCanvas();
    });

    document.getElementById('subheadline-text').addEventListener('input', (e) => {
        const text = getTextSettings();
        if (!text.subheadlines) text.subheadlines = { en: '' };
        text.subheadlines[text.currentSubheadlineLang || 'en'] = e.target.value;
        updateCanvas();
    });

    document.getElementById('subheadline-size').addEventListener('input', (e) => {
        const text = getTextSettings();
        const lang = text.currentSubheadlineLang || 'en';
        setTextLanguageValue('subheadlineSize', parseInt(e.target.value) || 50, lang);
        updateCanvas();
    });

    document.getElementById('subheadline-color').addEventListener('input', (e) => {
        setTextValue('subheadlineColor', e.target.value);
        updateCanvas();
    });

    document.getElementById('subheadline-opacity').addEventListener('input', (e) => {
        const value = parseInt(e.target.value) || 70;
        setTextValue('subheadlineOpacity', value);
        document.getElementById('subheadline-opacity-value').textContent = formatValue(value) + '%';
        updateCanvas();
    });

    // Subheadline weight
    document.getElementById('subheadline-weight').addEventListener('change', (e) => {
        setTextValue('subheadlineWeight', e.target.value);
        updateCanvas();
    });

    // Subheadline style buttons (italic, underline, strikethrough)
    document.querySelectorAll('#subheadline-style button').forEach(btn => {
        btn.addEventListener('click', () => {
            const style = btn.dataset.style;
            const key = 'subheadline' + style.charAt(0).toUpperCase() + style.slice(1);
            const text = getTextSettings();
            const newValue = !text[key];
            setTextValue(key, newValue);
            btn.classList.toggle('active', newValue);
            updateCanvas();
        });
    });

    // Export buttons
    document.getElementById('export-current')?.addEventListener('click', exportCurrent);
    document.getElementById('export-all')?.addEventListener('click', exportAll);

    // Position presets
    document.querySelectorAll('.position-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.position-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyPositionPreset(btn.dataset.preset);
        });
    });

    // Device type selector (2D/3D)
    document.querySelectorAll('#device-type-selector button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#device-type-selector button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const use3D = btn.dataset.type === '3d';
            setScreenshotSetting('use3D', use3D);
            document.getElementById('rotation-3d-options').style.display = use3D ? 'block' : 'none';

            // Hide 2D-only settings in 3D mode, show 3D tip
            const device2DModelGroup = document.getElementById('device-2d-model-group');
            if (device2DModelGroup) {
                device2DModelGroup.style.display = use3D ? 'none' : 'block';
            }
            document.getElementById('2d-only-settings').style.display = use3D ? 'none' : 'block';
            document.getElementById('position-presets-section').style.display = use3D ? 'none' : 'block';
            document.getElementById('frame-color-section').style.display = use3D ? 'block' : 'none';
            document.getElementById('3d-tip').style.display = use3D ? 'flex' : 'none';

            if (typeof showThreeJS === 'function') {
                showThreeJS(use3D);
            }

            if (use3D && typeof updateScreenTexture === 'function') {
                updateScreenTexture();
            }

            updateCanvas();
        });
    });

    // 2D device model selectors (iOS / Android)
    const apply2DDeviceModelSelection = (modelId, platform) => {
        setScreenshotSetting('device2D', modelId || '');

        const iosSelect = document.getElementById('device-2d-model-ios');
        const androidSelect = document.getElementById('device-2d-model-android');

        if (platform === 'ios' && androidSelect) {
            androidSelect.value = modelId ? '' : androidSelect.value;
            if (typeof refreshCustomSelect === 'function') {
                refreshCustomSelect(androidSelect);
            }
        }

        if (platform === 'android' && iosSelect) {
            iosSelect.value = modelId ? '' : iosSelect.value;
            if (typeof refreshCustomSelect === 'function') {
                refreshCustomSelect(iosSelect);
            }
        }

        if (!modelId && iosSelect && androidSelect && !iosSelect.value && !androidSelect.value) {
            setScreenshotSetting('device2D', '');
        }

        updateCanvas();
    };

    document.getElementById('device-2d-model-ios')?.addEventListener('change', (e) => {
        apply2DDeviceModelSelection(e.target.value, 'ios');
    });

    document.getElementById('device-2d-model-android')?.addEventListener('change', (e) => {
        apply2DDeviceModelSelection(e.target.value, 'android');
    });

    // 3D device model selector
    document.querySelectorAll('#device-3d-selector button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#device-3d-selector button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const device3D = btn.dataset.model;
            setScreenshotSetting('device3D', device3D);

            // Reset frame color to first preset for new device
            const presets = typeof frameColorPresets !== 'undefined' ? frameColorPresets[device3D] : null;
            const defaultColor = presets ? presets[0].id : null;
            setScreenshotSetting('frameColor', defaultColor);
            updateFrameColorSwatches(device3D, defaultColor);

            if (typeof switchPhoneModel === 'function') {
                switchPhoneModel(device3D);
            }

            // Apply default frame color after model switch
            if (defaultColor && typeof setPhoneFrameColor === 'function') {
                setTimeout(() => setPhoneFrameColor(defaultColor, device3D), 100);
            }

            updateCanvas();
        });
    });

    // 3D rotation controls
    document.getElementById('rotation-3d-x').addEventListener('input', (e) => {
        const ss = getScreenshotSettings();
        if (!ss.rotation3D) ss.rotation3D = { x: 0, y: 0, z: 0 };
        ss.rotation3D.x = parseInt(e.target.value);
        document.getElementById('rotation-3d-x-value').textContent = formatValue(e.target.value) + '°';
        if (typeof setThreeJSRotation === 'function') {
            setThreeJSRotation(ss.rotation3D.x, ss.rotation3D.y, ss.rotation3D.z);
        }
        updateCanvas(); // Keep export canvas in sync
    });

    document.getElementById('rotation-3d-y').addEventListener('input', (e) => {
        const ss = getScreenshotSettings();
        if (!ss.rotation3D) ss.rotation3D = { x: 0, y: 0, z: 0 };
        ss.rotation3D.y = parseInt(e.target.value);
        document.getElementById('rotation-3d-y-value').textContent = formatValue(e.target.value) + '°';
        if (typeof setThreeJSRotation === 'function') {
            setThreeJSRotation(ss.rotation3D.x, ss.rotation3D.y, ss.rotation3D.z);
        }
        updateCanvas(); // Keep export canvas in sync
    });

    document.getElementById('rotation-3d-z').addEventListener('input', (e) => {
        const ss = getScreenshotSettings();
        if (!ss.rotation3D) ss.rotation3D = { x: 0, y: 0, z: 0 };
        ss.rotation3D.z = parseInt(e.target.value);
        document.getElementById('rotation-3d-z-value').textContent = formatValue(e.target.value) + '°';
        if (typeof setThreeJSRotation === 'function') {
            setThreeJSRotation(ss.rotation3D.x, ss.rotation3D.y, ss.rotation3D.z);
        }
        updateCanvas(); // Keep export canvas in sync
    });
}

// Per-screenshot mode is now always active (all settings are per-screenshot)
function isPerScreenshotTextMode() {
    return true;
}

// Global language picker functions
function updateLanguageMenu() {
    const container = document.getElementById('language-menu-items');
    container.innerHTML = '';

    state.projectLanguages.forEach(lang => {
        const btn = document.createElement('button');
        btn.className = 'language-menu-item' + (lang === state.currentLanguage ? ' active' : '');
        btn.innerHTML = `<span class="flag">${languageFlags[lang] || '🏳️'}</span> ${languageNames[lang] || lang.toUpperCase()}`;
        btn.onclick = () => {
            switchGlobalLanguage(lang);
            document.getElementById('language-menu').classList.remove('visible');
        };
        container.appendChild(btn);
    });
}

function updateLanguageButton() {
    const btn = document.getElementById('language-btn');
    if (!btn) return;
    const currentLabel = languageNames[state.currentLanguage] || state.currentLanguage.toUpperCase();
    btn.title = `Language (${currentLabel})`;
}

function switchGlobalLanguage(lang) {
    state.currentLanguage = lang;

    // Update all screenshots to use this language for display
    state.screenshots.forEach(screenshot => {
        screenshot.text.currentHeadlineLang = lang;
        screenshot.text.currentSubheadlineLang = lang;
    });

    // Update UI
    updateLanguageButton();
    syncUIWithState();
    updateCanvas();
    saveState();
}

// Languages modal functions
function openLanguagesModal() {
    document.getElementById('language-menu').classList.remove('visible');
    state.projectLanguages = normalizeProjectLanguages(state.projectLanguages);
    if (!state.projectLanguages.includes(state.currentLanguage)) {
        state.currentLanguage = state.projectLanguages[0];
    }
    document.getElementById('languages-modal').classList.add('visible');
    updateLanguagesList();
    updateAddLanguageSelect();
}

function closeLanguagesModal() {
    document.getElementById('languages-modal').classList.remove('visible');
}

function updateLanguagesList() {
    state.projectLanguages = normalizeProjectLanguages(state.projectLanguages);
    const container = document.getElementById('languages-list');
    container.innerHTML = '';

    state.projectLanguages.forEach(lang => {
        const item = document.createElement('div');
        item.className = 'language-item';

        const flag = languageFlags[lang] || '🏳️';
        const name = languageNames[lang] || lang.toUpperCase();
        const isCurrent = lang === state.currentLanguage;
        const isOnly = state.projectLanguages.length === 1;

        item.innerHTML = `
            <span class="flag">${flag}</span>
            <span class="name">${name}</span>
            ${isCurrent ? '<span class="current-badge">Current</span>' : ''}
            <button class="remove-btn" ${isOnly ? 'disabled' : ''} title="${isOnly ? 'Cannot remove the only language' : 'Remove language'}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        `;

        const removeBtn = item.querySelector('.remove-btn');
        if (!isOnly) {
            removeBtn.addEventListener('click', () => removeProjectLanguage(lang));
        }

        container.appendChild(item);
    });
}

function updateAddLanguageSelect() {
    state.projectLanguages = normalizeProjectLanguages(state.projectLanguages);
    const select = document.getElementById('add-language-select');
    if (!select) return;

    select.innerHTML = '<option value="">Add a language...</option>';

    // Add all available languages that aren't already in the project
    supportedLanguageCatalog.forEach(({ code, name, flag }) => {
        if (state.projectLanguages.includes(code)) return;

        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${flag} ${name}`;
        option.dataset.flag = flag;
        option.dataset.label = name;
        select.appendChild(option);
    });

    if (select.options.length === 1) {
        const option = document.createElement('option');
        option.value = '';
        option.disabled = true;
        option.textContent = 'All supported languages are already added';
        select.appendChild(option);
    }

    refreshCustomSelect(select);
}

function addProjectLanguage(lang) {
    if (!lang || state.projectLanguages.includes(lang)) return;

    state.projectLanguages.push(lang);

    // Add the language to all screenshots' text settings
    state.screenshots.forEach(screenshot => {
        if (!screenshot.text.headlineLanguages.includes(lang)) {
            screenshot.text.headlineLanguages.push(lang);
            if (!screenshot.text.headlines) screenshot.text.headlines = { en: '' };
            screenshot.text.headlines[lang] = '';
        }
        if (!screenshot.text.subheadlineLanguages.includes(lang)) {
            screenshot.text.subheadlineLanguages.push(lang);
            if (!screenshot.text.subheadlines) screenshot.text.subheadlines = { en: '' };
            screenshot.text.subheadlines[lang] = '';
        }
    });

    // Also update defaults
    if (!state.defaults.text.headlineLanguages.includes(lang)) {
        state.defaults.text.headlineLanguages.push(lang);
        if (!state.defaults.text.headlines) state.defaults.text.headlines = { en: '' };
        state.defaults.text.headlines[lang] = '';
    }
    if (!state.defaults.text.subheadlineLanguages.includes(lang)) {
        state.defaults.text.subheadlineLanguages.push(lang);
        if (!state.defaults.text.subheadlines) state.defaults.text.subheadlines = { en: '' };
        state.defaults.text.subheadlines[lang] = '';
    }

    updateLanguagesList();
    updateAddLanguageSelect();
    updateLanguageMenu();
    saveState();
}

function removeProjectLanguage(lang) {
    if (state.projectLanguages.length <= 1) return; // Must have at least one language

    const index = state.projectLanguages.indexOf(lang);
    if (index > -1) {
        state.projectLanguages.splice(index, 1);

        // If removing the current language, switch to the first available
        if (state.currentLanguage === lang) {
            switchGlobalLanguage(state.projectLanguages[0]);
        }

        // Remove from all screenshots
        state.screenshots.forEach(screenshot => {
            const hIndex = screenshot.text.headlineLanguages.indexOf(lang);
            if (hIndex > -1) {
                screenshot.text.headlineLanguages.splice(hIndex, 1);
                delete screenshot.text.headlines[lang];
            }
            const sIndex = screenshot.text.subheadlineLanguages.indexOf(lang);
            if (sIndex > -1) {
                screenshot.text.subheadlineLanguages.splice(sIndex, 1);
                delete screenshot.text.subheadlines[lang];
            }
            if (screenshot.text.currentHeadlineLang === lang) {
                screenshot.text.currentHeadlineLang = state.projectLanguages[0];
            }
            if (screenshot.text.currentSubheadlineLang === lang) {
                screenshot.text.currentSubheadlineLang = state.projectLanguages[0];
            }
        });

        // Remove from defaults
        const dhIndex = state.defaults.text.headlineLanguages.indexOf(lang);
        if (dhIndex > -1) {
            state.defaults.text.headlineLanguages.splice(dhIndex, 1);
            delete state.defaults.text.headlines[lang];
        }
        const dsIndex = state.defaults.text.subheadlineLanguages.indexOf(lang);
        if (dsIndex > -1) {
            state.defaults.text.subheadlineLanguages.splice(dsIndex, 1);
            delete state.defaults.text.subheadlines[lang];
        }

        updateLanguagesList();
        updateAddLanguageSelect();
        updateLanguageMenu();
        updateLanguageButton();
        syncUIWithState();
        saveState();
    }
}

// Language helper functions
function addHeadlineLanguage(lang, flag) {
    const text = getTextSettings();
    if (!text.headlineLanguages.includes(lang)) {
        text.headlineLanguages.push(lang);
        if (!text.headlines) text.headlines = { en: '' };
        text.headlines[lang] = '';
        updateHeadlineLanguageUI();
        switchHeadlineLanguage(lang);
        saveState();
    }
}

function addSubheadlineLanguage(lang, flag) {
    const text = getTextSettings();
    if (!text.subheadlineLanguages.includes(lang)) {
        text.subheadlineLanguages.push(lang);
        if (!text.subheadlines) text.subheadlines = { en: '' };
        text.subheadlines[lang] = '';
        updateSubheadlineLanguageUI();
        switchSubheadlineLanguage(lang);
        saveState();
    }
}

function removeHeadlineLanguage(lang) {
    const text = getTextSettings();
    if (lang === 'en') return; // Can't remove default

    const index = text.headlineLanguages.indexOf(lang);
    if (index > -1) {
        text.headlineLanguages.splice(index, 1);
        delete text.headlines[lang];

        if (text.currentHeadlineLang === lang) {
            text.currentHeadlineLang = 'en';
        }

        updateHeadlineLanguageUI();
        switchHeadlineLanguage(text.currentHeadlineLang);
        saveState();
    }
}

function removeSubheadlineLanguage(lang) {
    const text = getTextSettings();
    if (lang === 'en') return; // Can't remove default

    const index = text.subheadlineLanguages.indexOf(lang);
    if (index > -1) {
        text.subheadlineLanguages.splice(index, 1);
        delete text.subheadlines[lang];

        if (text.currentSubheadlineLang === lang) {
            text.currentSubheadlineLang = 'en';
        }

        updateSubheadlineLanguageUI();
        switchSubheadlineLanguage(text.currentSubheadlineLang);
        saveState();
    }
}

function switchHeadlineLanguage(lang) {
    const text = getTextSettings();
    text.currentHeadlineLang = lang;
    text.currentLayoutLang = lang;

    // Sync text inputs and layout controls for this language
    updateTextUI(text);
    updateCanvas();
}

function switchSubheadlineLanguage(lang) {
    const text = getTextSettings();
    text.currentSubheadlineLang = lang;
    text.currentLayoutLang = lang;

    // Sync text inputs and layout controls for this language
    updateTextUI(text);
    updateCanvas();
}

function updateHeadlineLanguageUI() {
    // Language flag UI removed - translations now managed through translate modal
}

function updateSubheadlineLanguageUI() {
    // Language flag UI removed - translations now managed through translate modal
}

// Translate modal functions
let currentTranslateTarget = null;

const languageNames = Object.fromEntries(supportedLanguageCatalog.map((language) => [language.code, language.name]));

function openTranslateModal(target) {
    currentTranslateTarget = target;
    const text = getTextSettings();
    const isHeadline = target === 'headline';
    const isElement = target === 'element';

    let languages, texts;
    if (isElement) {
        const el = getSelectedElement();
        if (!el || el.type !== 'text') return;
        document.getElementById('translate-target-type').textContent = 'Element Text';
        languages = state.projectLanguages;
        if (!el.texts) el.texts = {};
        texts = el.texts;
    } else {
        document.getElementById('translate-target-type').textContent = isHeadline ? 'Headline' : 'Subheadline';
        languages = isHeadline ? text.headlineLanguages : text.subheadlineLanguages;
        texts = isHeadline ? text.headlines : text.subheadlines;
    }

    // Populate source language dropdown (first language selected by default)
    const sourceSelect = document.getElementById('translate-source-lang');
    sourceSelect.innerHTML = '';
    languages.forEach((lang, index) => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = `${languageFlags[lang]} ${languageNames[lang] || lang}`;
        option.dataset.flag = languageFlags[lang] || '';
        option.dataset.label = languageNames[lang] || lang;
        if (index === 0) option.selected = true;
        sourceSelect.appendChild(option);
    });

    refreshCustomSelect(sourceSelect);

    // Update source preview
    updateTranslateSourcePreview();

    // Populate target languages
    const targetsContainer = document.getElementById('translate-targets');
    targetsContainer.innerHTML = '';

    languages.forEach(lang => {
        const item = document.createElement('div');
        item.className = 'translate-target-item';
        item.dataset.lang = lang;
        item.innerHTML = `
            <div class="translate-target-header">
                <span class="flag">${languageFlags[lang]}</span>
                <span>${languageNames[lang] || lang}</span>
            </div>
            <textarea placeholder="Enter ${languageNames[lang] || lang} translation...">${texts[lang] || ''}</textarea>
        `;
        targetsContainer.appendChild(item);
    });

    document.getElementById('translate-modal').classList.add('visible');
}

function updateTranslateSourcePreview() {
    const sourceLang = document.getElementById('translate-source-lang').value;
    let sourceText;
    if (currentTranslateTarget === 'element') {
        const el = getSelectedElement();
        sourceText = el && el.texts ? (el.texts[sourceLang] || '') : '';
    } else {
        const text = getTextSettings();
        const isHeadline = currentTranslateTarget === 'headline';
        const texts = isHeadline ? text.headlines : text.subheadlines;
        sourceText = texts[sourceLang] || '';
    }

    document.getElementById('source-text-preview').textContent = sourceText || 'No text entered';
}

function applyTranslations() {
    const isElement = currentTranslateTarget === 'element';

    if (isElement) {
        const el = getSelectedElement();
        if (!el) return;
        if (!el.texts) el.texts = {};

        document.querySelectorAll('#translate-targets .translate-target-item').forEach(item => {
            const lang = item.dataset.lang;
            const textarea = item.querySelector('textarea');
            el.texts[lang] = textarea.value;
        });
        el.text = getElementText(el); // sync for backwards compat
        document.getElementById('element-text-input').value = getElementText(el);
    } else {
        const text = getTextSettings();
        const isHeadline = currentTranslateTarget === 'headline';
        const texts = isHeadline ? text.headlines : text.subheadlines;

        document.querySelectorAll('#translate-targets .translate-target-item').forEach(item => {
            const lang = item.dataset.lang;
            const textarea = item.querySelector('textarea');
            texts[lang] = textarea.value;
        });

        const currentLang = isHeadline ? text.currentHeadlineLang : text.currentSubheadlineLang;
        if (isHeadline) {
            document.getElementById('headline-text').value = texts[currentLang] || '';
        } else {
            document.getElementById('subheadline-text').value = texts[currentLang] || '';
            text.subheadlineEnabled = true;
            syncUIWithState();
        }
    }

    saveState();
    updateCanvas();
}

async function aiTranslateAll() {
    const sourceLang = document.getElementById('translate-source-lang').value;
    const isElement = currentTranslateTarget === 'element';
    let texts, languages, sourceText;
    if (isElement) {
        const el = getSelectedElement();
        if (!el) return;
        texts = el.texts || {};
        languages = state.projectLanguages;
        sourceText = texts[sourceLang] || '';
    } else {
        const text = getTextSettings();
        const isHeadline = currentTranslateTarget === 'headline';
        texts = isHeadline ? text.headlines : text.subheadlines;
        languages = isHeadline ? text.headlineLanguages : text.subheadlineLanguages;
        sourceText = texts[sourceLang] || '';
    }

    if (!sourceText.trim()) {
        setTranslateStatus('Please enter text in the source language first', 'error');
        return;
    }

    // Get target languages (all except source)
    const targetLangs = languages.filter(lang => lang !== sourceLang);

    if (targetLangs.length === 0) {
        setTranslateStatus('Add more languages to translate to', 'error');
        return;
    }

    // Get selected provider and API key
    const provider = getSelectedProvider();
    const providerConfig = llmProviders[provider];
    const apiKey = localStorage.getItem(providerConfig.storageKey);

    if (!apiKey) {
        setTranslateStatus(`Add your LLM API key in Settings to use AI translation.`, 'error');
        return;
    }

    const btn = document.getElementById('ai-translate-btn');
    btn.disabled = true;
    btn.classList.add('loading');
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4m0 12v4m-8-10h4m12 0h4m-5.66-5.66l-2.83 2.83m-5.66 5.66l-2.83 2.83m14.14 0l-2.83-2.83M6.34 6.34L3.51 3.51"/>
        </svg>
        <span>Translating...</span>
    `;

    setTranslateStatus(`Translating to ${targetLangs.length} language(s) with ${providerConfig.name}...`, '');

    // Mark all target items as translating
    targetLangs.forEach(lang => {
        const item = document.querySelector(`.translate-target-item[data-lang="${lang}"]`);
        if (item) item.classList.add('translating');
    });

    try {
        // Build the translation prompt
        const targetLangNames = targetLangs.map(lang => `${languageNames[lang]} (${lang})`).join(', ');

        const prompt = `You are a professional translator for App Store screenshot marketing copy. Translate the following text from ${languageNames[sourceLang]} to these languages: ${targetLangNames}.

The text is a short marketing headline/tagline for an app that must fit on a screenshot, so keep translations:
- SIMILAR LENGTH to the original - do NOT make it longer, as it must fit on screen
- Concise and punchy
- Marketing-focused and compelling
- Culturally appropriate for each target market
- Natural-sounding in each language

IMPORTANT: The translated text will be displayed on app screenshots with limited space. If the source text is short, the translation MUST also be short. Prioritize brevity over literal accuracy.

Source text (${languageNames[sourceLang]}):
"${sourceText}"

Respond ONLY with a valid JSON object mapping language codes to translations. Do not include any other text.
Example format:
{"de": "German translation", "fr": "French translation"}

Translate to these language codes: ${targetLangs.join(', ')}`;

        let responseText;

        if (provider === 'anthropic') {
            responseText = await translateWithAnthropic(apiKey, prompt);
        } else if (provider === 'openai') {
            responseText = await translateWithOpenAI(apiKey, prompt);
        } else if (provider === 'google') {
            responseText = await translateWithGoogle(apiKey, prompt);
        }

        // Clean up response - remove markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const translations = JSON.parse(responseText);

        // Apply translations to the textareas
        let translatedCount = 0;
        targetLangs.forEach(lang => {
            if (translations[lang]) {
                const item = document.querySelector(`.translate-target-item[data-lang="${lang}"]`);
                if (item) {
                    const textarea = item.querySelector('textarea');
                    textarea.value = translations[lang];
                    translatedCount++;
                }
            }
        });

        setTranslateStatus(`✓ Translated to ${translatedCount} language(s)`, 'success');

    } catch (error) {
        console.error('Translation error:', error);

        if (error.message === 'Failed to fetch') {
            setTranslateStatus('Connection failed. Check your API key in Settings.', 'error');
        } else if (error.message === 'AI_UNAVAILABLE' || error.message.includes('401') || error.message.includes('403')) {
            setTranslateStatus('Invalid API key. Update it in Settings (gear icon).', 'error');
        } else {
            setTranslateStatus('Translation failed: ' + error.message, 'error');
        }
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span>Auto-translate with AI</span>
        `;

        // Remove translating state
        document.querySelectorAll('.translate-target-item').forEach(item => {
            item.classList.remove('translating');
        });
    }
}

// Helper function to show styled alert modal
function showAppAlert(message, type = 'info') {
    return new Promise((resolve) => {
        const iconBg = type === 'error' ? 'rgba(255, 69, 58, 0.2)' :
            type === 'success' ? 'rgba(52, 199, 89, 0.2)' :
                'rgba(10, 132, 255, 0.2)';
        const iconColor = type === 'error' ? '#ff453a' :
            type === 'success' ? '#34c759' :
                'var(--accent)';
        const iconPath = type === 'error' ? '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none"/>' :
            type === 'success' ? '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.2 2.2 4.8-4.8"/>' :
                '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none"/>';

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay visible';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-icon" style="background: ${iconBg};">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: ${iconColor};">
                        ${iconPath}
                    </svg>
                </div>
                <p class="modal-message" style="margin: 16px 0;">${message}</p>
                <div class="modal-buttons">
                    <button class="modal-btn modal-btn-confirm" style="background: var(--accent);">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const okBtn = overlay.querySelector('.modal-btn-confirm');
        const close = () => {
            overlay.remove();
            resolve();
        };
        okBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    });
}

// Helper function to show styled confirm modal
function showAppConfirm(message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay visible';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-icon" style="background: rgba(10, 132, 255, 0.2);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent);">
                        <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <p class="modal-message" style="margin: 16px 0; white-space: pre-line;">${message}</p>
                <div class="modal-buttons">
                    <button class="modal-btn modal-btn-cancel">${cancelText}</button>
                    <button class="modal-btn modal-btn-confirm" style="background: var(--accent);">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const confirmBtn = overlay.querySelector('.modal-btn-confirm');
        const cancelBtn = overlay.querySelector('.modal-btn-cancel');

        confirmBtn.addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        });
    });
}

// Show translate confirmation dialog with source language selector
function showTranslateConfirmDialog(providerName) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay visible';

        // Default to first project language
        const defaultLang = state.projectLanguages[0] || 'en';

        // Build language options
        const languageOptions = state.projectLanguages.map(lang => {
            const flag = languageFlags[lang] || '🏳️';
            const name = languageNames[lang] || lang.toUpperCase();
            const selected = lang === defaultLang ? 'selected' : '';
            return `<option value="${lang}" data-flag="${flag}" data-label="${name}" ${selected}>${flag} ${name}</option>`;
        }).join('');

        // Count texts for each language
        const getTextCount = (lang) => {
            let count = 0;
            state.screenshots.forEach(screenshot => {
                const text = screenshot.text || state.text;
                if (text.headlines?.[lang]?.trim()) count++;
                if (text.subheadlines?.[lang]?.trim()) count++;
            });
            return count;
        };

        const initialCount = getTextCount(defaultLang);
        const targetCount = state.projectLanguages.length - 1;

        overlay.innerHTML = `
            <div class="modal" style="max-width: 380px;">
                <div class="modal-icon" style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #764ba2;">
                        <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2v3M22 22l-5-10-5 10M14 18h6"/>
                    </svg>
                </div>
                <h3 class="modal-title">Translate All Text</h3>
                <p class="modal-message" style="margin-bottom: 16px;">Translate headlines and subheadlines from one language to all other project languages.</p>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; color: #555555; margin-bottom: 6px;">Source Language</label>
                    <select id="translate-source-lang" style="width: 100%; padding: 10px 12px; background: #ffffff; border: 1px solid #111111; border-radius: 0px; color: #111111; font-size: 14px; cursor: pointer;">
                        ${languageOptions}
                    </select>
                </div>

                <div style="background: #f6f6f6; border: 1px solid #111111; border-radius: 0px; padding: 12px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                        <span style="color: #555555;">Texts to translate:</span>
                        <span id="translate-text-count" style="color: #111111; font-weight: 500;">${initialCount}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                        <span style="color: #555555;">Target languages:</span>
                        <span style="color: #111111; font-weight: 500;">${targetCount}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 13px;">
                        <span style="color: #555555;">Provider:</span>
                        <span style="color: #111111; font-weight: 500;">${providerName}</span>
                    </div>
                </div>

                <div class="modal-buttons">
                    <button class="modal-btn modal-btn-cancel" id="translate-cancel">Cancel</button>
                    <button class="modal-btn modal-btn-confirm" id="translate-confirm" style="background: #111111; color: #ffffff;">Translate</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const select = document.getElementById('translate-source-lang');
        const countEl = document.getElementById('translate-text-count');
        const confirmBtn = document.getElementById('translate-confirm');
        const cancelBtn = document.getElementById('translate-cancel');

        initializeCustomDropdowns();

        // Update count when language changes
        select.addEventListener('change', () => {
            const count = getTextCount(select.value);
            countEl.textContent = count;
            confirmBtn.disabled = count === 0;
            if (count === 0) {
                confirmBtn.style.opacity = '0.5';
            } else {
                confirmBtn.style.opacity = '1';
            }
        });

        // Initial state
        if (initialCount === 0) {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
        }

        confirmBtn.addEventListener('click', () => {
            overlay.remove();
            resolve(select.value);
        });

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
            resolve(null);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(null);
            }
        });
    });
}

// Translate all text (headlines + subheadlines) from selected source language to all other project languages
async function translateAllText() {
    if (state.projectLanguages.length < 2) {
        await showAppAlert('Add more languages to your project first (via the language menu).', 'info');
        return;
    }

    // Get selected provider and API key
    const provider = getSelectedProvider();
    const providerConfig = llmProviders[provider];
    const apiKey = localStorage.getItem(providerConfig.storageKey);

    if (!apiKey) {
        await showAppAlert('Add your LLM API key in Settings to use AI translation.', 'error');
        return;
    }

    // Show confirmation dialog with source language selector
    const sourceLang = await showTranslateConfirmDialog(providerConfig.name);
    if (!sourceLang) return; // User cancelled

    const targetLangs = state.projectLanguages.filter(lang => lang !== sourceLang);

    // Collect all texts that need translation
    const textsToTranslate = [];

    // Go through all screenshots and collect headlines/subheadlines
    state.screenshots.forEach((screenshot, index) => {
        const text = screenshot.text || state.text;

        // Headline
        const headline = text.headlines?.[sourceLang] || '';
        if (headline.trim()) {
            textsToTranslate.push({
                type: 'headline',
                screenshotIndex: index,
                text: headline
            });
        }

        // Subheadline
        const subheadline = text.subheadlines?.[sourceLang] || '';
        if (subheadline.trim()) {
            textsToTranslate.push({
                type: 'subheadline',
                screenshotIndex: index,
                text: subheadline
            });
        }
    });

    if (textsToTranslate.length === 0) {
        await showAppAlert(`No text found in ${languageNames[sourceLang] || sourceLang}. Add headlines or subheadlines first.`, 'info');
        return;
    }

    // Create progress dialog with spinner
    const progressOverlay = document.createElement('div');
    progressOverlay.className = 'modal-overlay visible';
    progressOverlay.id = 'translate-progress-overlay';
    progressOverlay.innerHTML = `
        <div class="modal" style="text-align: center; min-width: 320px;">
            <div class="modal-icon" style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #764ba2; animation: spin 1s linear infinite;">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
            </div>
            <h3 class="modal-title">Translating...</h3>
            <p class="modal-message" id="translate-progress-text">Sending to AI...</p>
            <p class="modal-message" id="translate-progress-detail" style="font-size: 11px; color: var(--text-tertiary); margin-top: 8px;"></p>
        </div>
        <style>
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    document.body.appendChild(progressOverlay);

    const progressText = document.getElementById('translate-progress-text');
    const progressDetail = document.getElementById('translate-progress-detail');

    // Helper to update status
    const updateStatus = (text, detail = '') => {
        if (progressText) progressText.textContent = text;
        if (progressDetail) progressDetail.textContent = detail;
    };

    updateStatus('Sending to AI...', `${textsToTranslate.length} texts to ${targetLangs.length} languages using ${providerConfig.name}`);

    try {
        // Build a single prompt with all texts
        const targetLangNames = targetLangs.map(lang => `${languageNames[lang]} (${lang})`).join(', ');

        // Group texts by screenshot for context-aware prompt
        const screenshotGroups = {};
        textsToTranslate.forEach((item, i) => {
            if (!screenshotGroups[item.screenshotIndex]) {
                screenshotGroups[item.screenshotIndex] = { headline: null, subheadline: null, indices: {} };
            }
            screenshotGroups[item.screenshotIndex][item.type] = item.text;
            screenshotGroups[item.screenshotIndex].indices[item.type] = i;
        });

        // Build context-rich prompt showing screenshot groupings
        let contextualTexts = '';
        Object.keys(screenshotGroups).sort((a, b) => Number(a) - Number(b)).forEach(screenshotIdx => {
            const group = screenshotGroups[screenshotIdx];
            contextualTexts += `\nScreenshot ${Number(screenshotIdx) + 1}:\n`;
            if (group.headline !== null) {
                contextualTexts += `  [${group.indices.headline}] Headline: "${group.headline}"\n`;
            }
            if (group.subheadline !== null) {
                contextualTexts += `  [${group.indices.subheadline}] Subheadline: "${group.subheadline}"\n`;
            }
        });

        const prompt = `You are a professional translator for app preview marketing copy. Translate the following text from ${languageNames[sourceLang]} to these languages: ${targetLangNames}.

    CONTEXT: These are marketing texts for app previews. Each screen has a headline and/or subheadline that work together as a pair. The subheadline typically elaborates on or supports the headline. When translating, ensure:
- Headlines and subheadlines on the same screenshot remain thematically consistent
- Translations across all screenshots maintain a cohesive marketing voice
- SIMILAR LENGTH to the originals - do NOT make translations longer, as they must fit on screen
- Marketing-focused and compelling language
- Culturally appropriate for each target market
- Natural-sounding in each language

IMPORTANT: The translated text will be displayed on app screenshots with limited space. If the source text is short, the translation MUST also be short. Prioritize brevity over literal accuracy.

Source texts (${languageNames[sourceLang]}):
${contextualTexts}

Respond ONLY with a valid JSON object. The structure should be:
{
  "0": {"de": "German translation", "fr": "French translation", ...},
  "1": {"de": "German translation", "fr": "French translation", ...}
}

Where the keys (0, 1, etc.) correspond to the text indices [N] shown above.
Translate to these language codes: ${targetLangs.join(', ')}`;

        let responseText;

        if (provider === 'anthropic') {
            responseText = await translateWithAnthropic(apiKey, prompt);
        } else if (provider === 'openai') {
            responseText = await translateWithOpenAI(apiKey, prompt);
        } else if (provider === 'google') {
            responseText = await translateWithGoogle(apiKey, prompt);
        }

        updateStatus('Processing response...', 'Parsing translations');

        // Clean up response - remove markdown code blocks and extract JSON
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Try to extract JSON object if there's extra text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            responseText = jsonMatch[0];
        }

        console.log('Translation response:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));

        let translations;
        try {
            translations = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error. Response was:', responseText);
            throw new Error('Failed to parse translation response. The AI may have returned incomplete text.');
        }

        updateStatus('Applying translations...', 'Updating screenshots');

        // Apply translations
        let appliedCount = 0;
        textsToTranslate.forEach((item, index) => {
            const itemTranslations = translations[index] || translations[String(index)];
            if (!itemTranslations) return;

            const screenshot = state.screenshots[item.screenshotIndex];
            const text = screenshot.text || state.text;

            targetLangs.forEach(lang => {
                if (itemTranslations[lang]) {
                    if (item.type === 'headline') {
                        if (!text.headlines) text.headlines = {};
                        text.headlines[lang] = itemTranslations[lang];
                    } else {
                        if (!text.subheadlines) text.subheadlines = {};
                        text.subheadlines[lang] = itemTranslations[lang];
                        // Enable subheadline display when translations are added
                        text.subheadlineEnabled = true;
                    }
                    appliedCount++;
                }
            });
        });

        // Update UI
        syncUIWithState();
        updateCanvas();
        saveState();

        // Remove progress overlay
        progressOverlay.remove();

        await showAppAlert(`Successfully translated ${appliedCount} text(s)!`, 'success');

    } catch (error) {
        console.error('Translation error:', error);
        progressOverlay.remove();

        if (error.message === 'Failed to fetch') {
            await showAppAlert('Connection failed. Check your API key in Settings.', 'error');
        } else if (error.message === 'AI_UNAVAILABLE' || error.message.includes('401') || error.message.includes('403')) {
            await showAppAlert('Invalid API key. Update it in Settings (gear icon).', 'error');
        } else {
            await showAppAlert('Translation failed: ' + error.message, 'error');
        }
    }
}

// Provider-specific translation functions
async function translateWithAnthropic(apiKey, prompt) {
    const model = getSelectedModel('anthropic');
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 4096,
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) {
        const status = response.status;
        if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
        throw new Error(`API request failed: ${status}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

async function translateWithOpenAI(apiKey, prompt) {
    const model = getSelectedModel('openai');
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            max_completion_tokens: 16384,
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) {
        const status = response.status;
        const errorBody = await response.json().catch(() => ({}));
        console.error('OpenAI API Error:', {
            status,
            model,
            error: errorBody
        });
        if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
        throw new Error(`API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function translateWithGoogle(apiKey, prompt) {
    const model = getSelectedModel('google');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        const status = response.status;
        if (status === 401 || status === 403 || status === 400) throw new Error('AI_UNAVAILABLE');
        throw new Error(`API request failed: ${status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

function setTranslateStatus(message, type) {
    const status = document.getElementById('ai-translate-status');
    status.textContent = message;
    status.className = 'ai-translate-status' + (type ? ' ' + type : '');
}

// Settings modal functions
// LLM configuration is in llm.js (llmProviders, getSelectedModel, getSelectedProvider)

// Theme management
function applyTheme(preference) {
    if (preference === 'light' || preference === 'dark') {
        document.documentElement.dataset.theme = preference;
    } else {
        delete document.documentElement.dataset.theme;
    }
}

function initTheme() {
    const saved = localStorage.getItem('themePreference') || 'auto';
    applyTheme(saved);
}

// Apply theme immediately (before async init)
initTheme();

function openSettingsModal() {
    // Load saved provider
    const savedProvider = getSelectedProvider();
    document.querySelectorAll('input[name="ai-provider"]').forEach(radio => {
        radio.checked = radio.value === savedProvider;
    });

    // Show the correct API section
    updateProviderSection(savedProvider);

    // Load all saved API keys and models
    Object.entries(llmProviders).forEach(([provider, config]) => {
        const savedKey = localStorage.getItem(config.storageKey);
        const input = document.getElementById(`settings-api-key-${provider}`);
        if (input) {
            input.value = savedKey || '';
            input.type = 'password';
        }

        const status = document.getElementById(`settings-key-status-${provider}`);
        if (status) {
            if (savedKey) {
                status.textContent = '✓ API key is saved';
                status.className = 'settings-key-status success';
            } else {
                status.textContent = '';
                status.className = 'settings-key-status';
            }
        }

        // Populate and load saved model selection
        const modelSelect = document.getElementById(`settings-model-${provider}`);
        if (modelSelect) {
            // Populate options from llm.js config
            modelSelect.innerHTML = generateModelOptions(provider);
            // Set saved value
            const savedModel = localStorage.getItem(config.modelStorageKey) || config.defaultModel;
            modelSelect.value = savedModel;
        }
    });

    // Load saved theme preference
    const savedTheme = localStorage.getItem('themePreference') || 'auto';
    document.querySelectorAll('#theme-selector button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === savedTheme);
    });

    document.getElementById('settings-modal').classList.add('visible');
}

function updateProviderSection(provider) {
    document.querySelectorAll('.settings-api-section').forEach(section => {
        section.style.display = section.dataset.provider === provider ? 'block' : 'none';
    });
}

function saveSettings() {
    // Save theme preference
    const activeThemeBtn = document.querySelector('#theme-selector button.active');
    const themePreference = activeThemeBtn ? activeThemeBtn.dataset.theme : 'auto';
    localStorage.setItem('themePreference', themePreference);
    applyTheme(themePreference);

    // Save selected provider
    const selectedProvider = document.querySelector('input[name="ai-provider"]:checked').value;
    localStorage.setItem('aiProvider', selectedProvider);

    // Save all API keys and models
    let allValid = true;
    Object.entries(llmProviders).forEach(([provider, config]) => {
        const input = document.getElementById(`settings-api-key-${provider}`);
        const status = document.getElementById(`settings-key-status-${provider}`);
        if (!input || !status) return;

        const key = input.value.trim();

        if (key) {
            // Validate key format
            if (key.startsWith(config.keyPrefix)) {
                localStorage.setItem(config.storageKey, key);
                status.textContent = '✓ API key saved';
                status.className = 'settings-key-status success';
            } else {
                status.textContent = `Invalid format. Should start with ${config.keyPrefix}...`;
                status.className = 'settings-key-status error';
                if (provider === selectedProvider) allValid = false;
            }
        } else {
            localStorage.removeItem(config.storageKey);
            status.textContent = '';
            status.className = 'settings-key-status';
        }

        // Save model selection
        const modelSelect = document.getElementById(`settings-model-${provider}`);
        if (modelSelect) {
            localStorage.setItem(config.modelStorageKey, modelSelect.value);
        }
    });

    if (allValid) {
        setTimeout(() => {
            document.getElementById('settings-modal').classList.remove('visible');
        }, 500);
    }
}

// Helper function to set text value for current screenshot
function setTextValue(key, value) {
    setTextSetting(key, value);
}

function setTextLanguageValue(key, value, lang = null) {
    const text = getTextSettings();
    if (!text.perLanguageLayout) {
        // Global mode - write directly to text
        text[key] = value;
        return;
    }
    const targetLang = lang || getTextLayoutLanguage(text);
    const settings = getTextLanguageSettings(text, targetLang);
    settings[key] = value;
    text.currentLayoutLang = targetLang;
}

// Helper function to get text settings for current screenshot
function getTextSettings() {
    return getText();
}

// Load text UI from current screenshot's settings
function loadTextUIFromScreenshot() {
    updateTextUI(getText());
}

// Load text UI from default settings
function loadTextUIFromGlobal() {
    updateTextUI(state.defaults.text);
}

// Update all text UI elements
function updateTextUI(text) {
    const headlineLang = text.currentHeadlineLang || 'en';
    const subheadlineLang = text.currentSubheadlineLang || 'en';
    const layoutLang = getTextLayoutLanguage(text);
    const headlineLayout = getEffectiveLayout(text, headlineLang);
    const subheadlineLayout = getEffectiveLayout(text, subheadlineLang);
    const layoutSettings = getEffectiveLayout(text, layoutLang);
    const headlineText = text.headlines ? (text.headlines[headlineLang] || '') : (text.headline || '');
    const subheadlineText = text.subheadlines ? (text.subheadlines[subheadlineLang] || '') : (text.subheadline || '');

    document.getElementById('headline-text').value = headlineText;
    document.getElementById('headline-font').value = text.headlineFont;
    updateFontPickerPreview();
    document.getElementById('headline-size').value = headlineLayout.headlineSize;
    document.getElementById('headline-color').value = text.headlineColor;
    document.getElementById('headline-weight').value = text.headlineWeight;
    // Sync text style buttons
    document.querySelectorAll('#headline-style button').forEach(btn => {
        const style = btn.dataset.style;
        const key = 'headline' + style.charAt(0).toUpperCase() + style.slice(1);
        btn.classList.toggle('active', text[key] || false);
    });
    document.querySelectorAll('#text-position button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.position === layoutSettings.position);
    });
    document.getElementById('text-offset-y').value = layoutSettings.offsetY;
    document.getElementById('text-offset-y-value').textContent = formatValue(layoutSettings.offsetY) + '%';
    document.getElementById('line-height').value = layoutSettings.lineHeight;
    document.getElementById('line-height-value').textContent = formatValue(layoutSettings.lineHeight) + '%';
    document.getElementById('subheadline-text').value = subheadlineText;
    document.getElementById('subheadline-font').value = text.subheadlineFont || text.headlineFont;
    document.getElementById('subheadline-size').value = subheadlineLayout.subheadlineSize;
    document.getElementById('subheadline-color').value = text.subheadlineColor;
    document.getElementById('subheadline-opacity').value = text.subheadlineOpacity;
    document.getElementById('subheadline-opacity-value').textContent = formatValue(text.subheadlineOpacity) + '%';
    document.getElementById('subheadline-weight').value = text.subheadlineWeight || '400';
    // Sync subheadline style buttons
    document.querySelectorAll('#subheadline-style button').forEach(btn => {
        const style = btn.dataset.style;
        const key = 'subheadline' + style.charAt(0).toUpperCase() + style.slice(1);
        btn.classList.toggle('active', text[key] || false);
    });
}

function applyPositionPreset(preset) {
    const presets = {
        'centered': { scale: 70, x: 50, y: 50, rotation: 0, perspective: 0 },
        'bleed-bottom': { scale: 85, x: 50, y: 120, rotation: 0, perspective: 0 },
        'bleed-top': { scale: 85, x: 50, y: -20, rotation: 0, perspective: 0 },
        'float-center': { scale: 60, x: 50, y: 50, rotation: 0, perspective: 0 },
        'tilt-left': { scale: 65, x: 50, y: 60, rotation: -8, perspective: 0 },
        'tilt-right': { scale: 65, x: 50, y: 60, rotation: 8, perspective: 0 },
        'perspective': { scale: 65, x: 50, y: 50, rotation: 0, perspective: 15 },
        'float-bottom': { scale: 55, x: 50, y: 70, rotation: 0, perspective: 0 }
    };

    const p = presets[preset];
    if (!p) return;

    setScreenshotSetting('scale', p.scale);
    setScreenshotSetting('x', p.x);
    setScreenshotSetting('y', p.y);
    setScreenshotSetting('rotation', p.rotation);
    setScreenshotSetting('perspective', p.perspective);

    // Update UI controls
    document.getElementById('screenshot-scale').value = p.scale;
    document.getElementById('screenshot-scale-value').textContent = formatValue(p.scale) + '%';
    document.getElementById('screenshot-x').value = p.x;
    document.getElementById('screenshot-x-value').textContent = formatValue(p.x) + '%';
    document.getElementById('screenshot-y').value = p.y;
    document.getElementById('screenshot-y-value').textContent = formatValue(p.y) + '%';
    document.getElementById('screenshot-rotation').value = p.rotation;
    document.getElementById('screenshot-rotation-value').textContent = formatValue(p.rotation) + '°';
    syncPositionPresetSelection();

    updateCanvas();
}

function handleFiles(files) {
    // Process files sequentially to handle duplicates one at a time
    processFilesSequentially(Array.from(files).filter(f => f.type.startsWith('image/')));
}

// Handle files from desktop app (receives array of {dataUrl, name})
function handleFilesFromDesktop(filesData) {
    processDesktopFilesSequentially(filesData);
}

async function processDesktopFilesSequentially(filesData) {
    for (const fileData of filesData) {
        await processDesktopImageFile(fileData);
    }
}

// Import screenshots via Tauri native file dialog
async function importScreenshotsFromTauri() {
    if (!window.__TAURI__) return;
    try {
        const selected = await window.__TAURI__.dialog.open({
            multiple: true,
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
        });
        if (!selected) return;
        const paths = Array.isArray(selected) ? selected : [selected];
        for (const filePath of paths) {
            const bytes = await window.__TAURI__.fs.readFile(filePath);
            const blob = new Blob([bytes]);
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            const name = filePath.split(/[\\/]/).pop();
            await handleFilesFromDesktop([{ dataUrl, name }]);
        }
    } catch (err) {
        console.error('Tauri import error:', err);
    }
}

async function processDesktopImageFile(fileData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = async () => {
            // Detect device type based on aspect ratio
            const ratio = img.width / img.height;
            let deviceType = 'iPhone';
            if (ratio > 0.6) {
                deviceType = 'iPad';
            }

            // Detect language from filename
            const detectedLang = detectLanguageFromFilename(fileData.name);

            // Check if this is a localized version of an existing screenshot
            const existingIndex = findScreenshotByBaseFilename(fileData.name);

            if (existingIndex !== -1) {
                // Found a screenshot with matching base filename
                const existingScreenshot = state.screenshots[existingIndex];
                const hasExistingLangImage = existingScreenshot.localizedImages?.[detectedLang]?.image;

                if (hasExistingLangImage) {
                    // There's already an image for this language - show dialog
                    const choice = await showDuplicateDialog({
                        existingIndex: existingIndex,
                        detectedLang: detectedLang,
                        newImage: img,
                        newSrc: fileData.dataUrl,
                        newName: fileData.name
                    });

                    if (choice === 'replace') {
                        addLocalizedImage(existingIndex, detectedLang, img, fileData.dataUrl, fileData.name);
                    } else if (choice === 'create') {
                        createNewScreenshot(img, fileData.dataUrl, fileData.name, detectedLang, deviceType);
                    }
                } else {
                    // No image for this language yet - just add it silently
                    addLocalizedImage(existingIndex, detectedLang, img, fileData.dataUrl, fileData.name);
                }
            } else {
                createNewScreenshot(img, fileData.dataUrl, fileData.name, detectedLang, deviceType);
            }

            // Update 3D texture if in 3D mode
            const ss = getScreenshotSettings();
            if (ss.use3D && typeof updateScreenTexture === 'function') {
                updateScreenTexture();
            }
            updateCanvas();
            resolve();
        };
        img.src = fileData.dataUrl;
    });
}

async function processFilesSequentially(files) {
    for (const file of files) {
        await processImageFile(file);
    }
}

async function processImageFile(file) {
    let sourceUrl = null;
    try {
        const uploaded = await uploadMediaFile(file);
        sourceUrl = uploaded?.url || null;
    } catch (uploadError) {
        console.error('Upload failed, falling back to browser data URL:', uploadError);
    }

    if (!sourceUrl) {
        sourceUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = async () => {
            // Detect device type based on aspect ratio
            const ratio = img.width / img.height;
            let deviceType = 'iPhone';
            if (ratio > 0.6) {
                deviceType = 'iPad';
            }

            // Detect language from filename
            const detectedLang = detectLanguageFromFilename(file.name);

            // Check if this is a localized version of an existing screenshot
            const existingIndex = findScreenshotByBaseFilename(file.name);

            if (existingIndex !== -1) {
                // Found a screenshot with matching base filename
                const existingScreenshot = state.screenshots[existingIndex];
                const hasExistingLangImage = existingScreenshot.localizedImages?.[detectedLang]?.image;

                if (hasExistingLangImage) {
                    // There's already an image for this language - show dialog
                    const choice = await showDuplicateDialog({
                        existingIndex: existingIndex,
                        detectedLang: detectedLang,
                        newImage: img,
                        newSrc: sourceUrl,
                        newName: file.name
                    });

                    if (choice === 'replace') {
                        addLocalizedImage(existingIndex, detectedLang, img, sourceUrl, file.name);
                    } else if (choice === 'create') {
                        createNewScreenshot(img, sourceUrl, file.name, detectedLang, deviceType);
                    }
                    // 'ignore' does nothing
                } else {
                    // No image for this language yet - just add it silently
                    addLocalizedImage(existingIndex, detectedLang, img, sourceUrl, file.name);
                }
            } else {
                // No duplicate - create new screenshot
                createNewScreenshot(img, sourceUrl, file.name, detectedLang, deviceType);
            }

            // Update 3D texture if in 3D mode
            const ss = getScreenshotSettings();
            if (ss.use3D && typeof updateScreenTexture === 'function') {
                updateScreenTexture();
            }
            updateCanvas();
            resolve();
        };
        img.src = sourceUrl;
    });
}

function createNewScreenshot(img, src, name, lang, deviceType) {
    const localizedImages = {};
    if (img && src) {
        localizedImages[lang || 'en'] = {
            image: img,
            src: src,
            name: name
        };
    }

    // Auto-add language to project if not already present
    if (lang && !state.projectLanguages.includes(lang)) {
        addProjectLanguage(lang);
    }

    const textDefaults = normalizeTextSettings(state.defaults.text);
    state.defaults.text = textDefaults;

    // Each screenshot gets its own copy of all settings from defaults
    state.screenshots.push({
        image: img || null, // Keep for legacy compatibility
        name: name || 'Blank Screen',
        deviceType: deviceType,
        localizedImages: localizedImages,
        background: JSON.parse(JSON.stringify(state.defaults.background)),
        screenshot: JSON.parse(JSON.stringify(state.defaults.screenshot)),
        text: JSON.parse(JSON.stringify(textDefaults)),
        elements: JSON.parse(JSON.stringify(state.defaults.elements || [])),
        popouts: [],
        // Legacy overrides for backwards compatibility
        overrides: {}
    });

    updateScreenshotList();
    if (state.screenshots.length === 1) {
        state.selectedIndex = 0;
        // Show Magical Titles tooltip hint for first screenshot
        setTimeout(() => showMagicalTitlesTooltip(), 500);
    }
}

let draggedScreenshotIndex = null;

function updateScreenshotList() {
    screenshotList.innerHTML = '';
    const isEmpty = state.screenshots.length === 0;
    noScreenshot.style.display = isEmpty ? 'block' : 'none';
    if (previewStrip) previewStrip.classList.toggle('empty-state', isEmpty);

    // Disable right sidebar and export buttons when no screenshots
    const rightSidebar = document.querySelector('.sidebar-right');
    if (rightSidebar) rightSidebar.classList.toggle('disabled', isEmpty);
    const exportCurrent = document.getElementById('export-current');
    const exportAll = document.getElementById('export-all');
    if (exportCurrent) { exportCurrent.disabled = isEmpty; exportCurrent.style.opacity = isEmpty ? '0.4' : ''; exportCurrent.style.pointerEvents = isEmpty ? 'none' : ''; }
    if (exportAll) { exportAll.disabled = isEmpty; exportAll.style.opacity = isEmpty ? '0.4' : ''; exportAll.style.pointerEvents = isEmpty ? 'none' : ''; }

    // Show transfer mode hint if active
    if (state.transferTarget !== null && state.screenshots.length > 1) {
        const hint = document.createElement('div');
        hint.className = 'transfer-hint';
        hint.innerHTML = `
            <span>Select a screenshot to copy style from</span>
            <button class="transfer-cancel" onclick="cancelTransfer()">Cancel</button>
        `;
        screenshotList.appendChild(hint);
    }

    state.screenshots.forEach((screenshot, index) => {
        const item = document.createElement('div');
        const isTransferTarget = state.transferTarget === index;
        const isTransferMode = state.transferTarget !== null;
        item.className = 'screenshot-item' +
            (index === state.selectedIndex ? ' selected' : '') +
            (isTransferTarget ? ' transfer-target' : '') +
            (isTransferMode && !isTransferTarget ? ' transfer-source-option' : '');

        // Enable drag and drop (disabled in transfer mode)
        if (!isTransferMode) {
            item.draggable = true;
            item.dataset.index = index;
        }

        // Show different UI in transfer mode
        const buttonsHtml = isTransferMode ? '' : `
            <div class="screenshot-menu-wrapper">
                <button class="screenshot-menu-btn" data-index="${index}" title="More options">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2"/>
                        <circle cx="12" cy="12" r="2"/>
                        <circle cx="12" cy="19" r="2"/>
                    </svg>
                </button>
                <div class="screenshot-menu" data-index="${index}">
                    <button class="screenshot-menu-item screenshot-translations" data-index="${index}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2v3M22 22l-5-10-5 10M14 18h6"/>
                        </svg>
                        Manage Translations...
                    </button>
                    <button class="screenshot-menu-item screenshot-replace" data-index="${index}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Replace Screenshot...
                    </button>
                    <button class="screenshot-menu-item screenshot-transfer" data-index="${index}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy style from...
                    </button>
                    <button class="screenshot-menu-item screenshot-apply-all" data-index="${index}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            <path d="M14 14l2 2 4-4"/>
                        </svg>
                        Apply style to all...
                    </button>
                    <button class="screenshot-menu-item screenshot-duplicate" data-index="${index}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Duplicate
                    </button>
                    <button class="screenshot-menu-item screenshot-delete danger" data-index="${index}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                        Remove
                    </button>
                </div>
            </div>
        `;

        // Get localized thumbnail image
        const thumbImg = getScreenshotImage(screenshot);
        const thumbSrc = thumbImg?.src || '';
        const isBlank = !thumbSrc;

        // Build language flags indicator
        const availableLangs = getAvailableLanguagesForScreenshot(screenshot);
        const isComplete = isScreenshotComplete(screenshot);
        let langFlagsHtml = '';
        if (state.projectLanguages.length > 1) {
            const flags = availableLangs.map(lang => languageFlags[lang] || '🏳️').join('');
            const checkmark = isComplete ? '<span class="screenshot-complete">✓</span>' : '';
            langFlagsHtml = `<span class="screenshot-lang-flags">${flags}${checkmark}</span>`;
        }

        const thumbHtml = isBlank
            ? `<div class="screenshot-thumb blank-thumb">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
              </div>`
            : `<img class="screenshot-thumb" src="${thumbSrc}" alt="${screenshot.name}">`;

        item.innerHTML = `
            <div class="drag-handle">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/>
                    <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
                    <circle cx="9" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
                </svg>
            </div>
            ${thumbHtml}
            <div class="screenshot-info">
                <div class="screenshot-name">${screenshot.name}</div>
                <div class="screenshot-device">${isTransferTarget ? 'Click source to copy style' : screenshot.deviceType}${langFlagsHtml}</div>
            </div>
            ${buttonsHtml}
        `;

        // Drag and drop handlers
        item.addEventListener('dragstart', (e) => {
            draggedScreenshotIndex = index;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedScreenshotIndex = null;
            // Remove all drag-over states
            document.querySelectorAll('.screenshot-item.drag-insert-after, .screenshot-item.drag-insert-before').forEach(el => {
                el.classList.remove('drag-insert-after', 'drag-insert-before');
            });
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedScreenshotIndex !== null && draggedScreenshotIndex !== index) {
                // Determine if cursor is in top or bottom half
                const rect = item.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const isAbove = e.clientY < midpoint;

                // Clear all indicators first
                document.querySelectorAll('.screenshot-item.drag-insert-after, .screenshot-item.drag-insert-before').forEach(el => {
                    el.classList.remove('drag-insert-after', 'drag-insert-before');
                });

                // Show line on the item AFTER which the drop will occur
                if (isAbove && index === 0) {
                    // Dropping before the first item - show line above it
                    item.classList.add('drag-insert-before');
                } else if (isAbove && index > 0) {
                    // Dropping before this item = after the previous item
                    const items = screenshotList.querySelectorAll('.screenshot-item');
                    const prevItem = items[index - 1];
                    if (prevItem && !prevItem.classList.contains('dragging')) {
                        prevItem.classList.add('drag-insert-after');
                    }
                } else if (!isAbove) {
                    // Dropping after this item
                    item.classList.add('drag-insert-after');
                }
            }
        });

        item.addEventListener('dragleave', () => {
            // Don't remove here - let dragover on other items handle it
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();

            // Determine drop position based on cursor
            const rect = item.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const dropAbove = e.clientY < midpoint;

            const mediaFile = getDraggedMediaFileData(e);

            document.querySelectorAll('.screenshot-item.drag-insert-after, .screenshot-item.drag-insert-before').forEach(el => {
                el.classList.remove('drag-insert-after', 'drag-insert-before');
            });

            if (mediaFile && draggedScreenshotIndex === null) {
                await replaceScreenshotWithMedia(index, mediaFile.url, mediaFile.name);
                return;
            }

            if (draggedScreenshotIndex !== null && draggedScreenshotIndex !== index) {
                // Calculate target index based on drop position
                let targetIndex = dropAbove ? index : index + 1;

                // Adjust if dragging from before the target
                if (draggedScreenshotIndex < targetIndex) {
                    targetIndex--;
                }

                // Reorder screenshots
                const draggedItem = state.screenshots[draggedScreenshotIndex];
                state.screenshots.splice(draggedScreenshotIndex, 1);
                state.screenshots.splice(targetIndex, 0, draggedItem);

                // Update selected index to follow the selected item
                if (state.selectedIndex === draggedScreenshotIndex) {
                    state.selectedIndex = targetIndex;
                } else if (draggedScreenshotIndex < state.selectedIndex && targetIndex >= state.selectedIndex) {
                    state.selectedIndex--;
                } else if (draggedScreenshotIndex > state.selectedIndex && targetIndex <= state.selectedIndex) {
                    state.selectedIndex++;
                }

                updateScreenshotList();
                updateCanvas();
            }
        });

        item.addEventListener('click', (e) => {
            if (e.target.closest('.screenshot-menu-wrapper') || e.target.closest('.drag-handle')) {
                return;
            }

            // Handle transfer mode click
            if (state.transferTarget !== null) {
                if (index !== state.transferTarget) {
                    // Transfer style from clicked screenshot to target
                    transferStyle(index, state.transferTarget);
                }
                return;
            }

            // Normal selection
            state.selectedIndex = index;
            updateScreenshotList();
            // Sync all UI with current screenshot's settings
            syncUIWithState();
            setSelectedCanvasTarget({ type: 'screenshot' }, { skipCanvasRefresh: true });
            updateGradientStopsUI();
            // Update 3D texture if in 3D mode
            const ss = getScreenshotSettings();
            if (ss.use3D && typeof updateScreenTexture === 'function') {
                updateScreenTexture();
            }
            updateCanvas();
        });

        // Menu button handler
        const menuBtn = item.querySelector('.screenshot-menu-btn');
        const menu = item.querySelector('.screenshot-menu');
        if (menuBtn && menu) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close all other menus first
                document.querySelectorAll('.screenshot-menu.open').forEach(m => {
                    if (m !== menu) {
                        m.classList.remove('open');
                        m.closest('.screenshot-menu-wrapper')?.querySelector('.screenshot-menu-btn')?.classList.remove('active');
                    }
                });
                menu.classList.toggle('open');
                menuBtn.classList.toggle('active', menu.classList.contains('open'));
            });
        }

        // Manage Translations button handler
        const translationsBtn = item.querySelector('.screenshot-translations');
        if (translationsBtn) {
            translationsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu?.classList.remove('open');
                openScreenshotTranslationsModal(index);
            });
        }

        // Replace button handler
        const replaceBtn = item.querySelector('.screenshot-replace');
        if (replaceBtn) {
            replaceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu?.classList.remove('open');
                replaceScreenshot(index);
            });
        }

        // Transfer button handler
        const transferBtn = item.querySelector('.screenshot-transfer');
        if (transferBtn) {
            transferBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu?.classList.remove('open');
                state.transferTarget = index;
                updateScreenshotList();
            });
        }

        // Apply style to all button handler
        const applyAllBtn = item.querySelector('.screenshot-apply-all');
        if (applyAllBtn) {
            applyAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu?.classList.remove('open');
                showApplyStyleModal(index);
            });
        }

        const duplicateBtn = item.querySelector('.screenshot-duplicate');
        if (duplicateBtn) {
            duplicateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu?.classList.remove('open');
                duplicateScreenshot(index);
            });
        }

        // Delete button handler
        const deleteBtn = item.querySelector('.screenshot-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu?.classList.remove('open');
                deleteScreenshotAt(index);
            });
        }

        screenshotList.appendChild(item);
    });

    // Hide add buttons during transfer mode
    const addButtonsContainer = document.querySelector('.sidebar-add-buttons');
    if (addButtonsContainer) {
        addButtonsContainer.style.display = state.transferTarget === null ? '' : 'none';
    }

    // Update project selector to reflect current screenshot count
    updateProjectSelector();
}

function cancelTransfer() {
    state.transferTarget = null;
    updateScreenshotList();
}

function getCanvasContextTargetIndex() {
    if (!state.screenshots.length) return null;
    const menuIndex = parseInt(canvasContextMenu?.dataset.index || '', 10);
    const fallbackIndex = Number.isInteger(menuIndex) ? menuIndex : state.selectedIndex;
    return Math.min(Math.max(0, fallbackIndex), state.screenshots.length - 1);
}

function swapScreenshotsWithAdjacent(index, direction) {
    if (state.screenshots.length < 2) return false;

    const adjacentIndex = direction === 'left' ? index - 1 : index + 1;
    if (adjacentIndex < 0 || adjacentIndex >= state.screenshots.length) return false;

    [state.screenshots[index], state.screenshots[adjacentIndex]] = [
        state.screenshots[adjacentIndex],
        state.screenshots[index]
    ];

    if (state.selectedIndex === index) {
        state.selectedIndex = adjacentIndex;
    } else if (state.selectedIndex === adjacentIndex) {
        state.selectedIndex = index;
    }

    if (Number.isInteger(state.transferTarget)) {
        if (state.transferTarget === index) {
            state.transferTarget = adjacentIndex;
        } else if (state.transferTarget === adjacentIndex) {
            state.transferTarget = index;
        }
    }

    updateScreenshotList();
    syncUIWithState();
    updateGradientStopsUI();
    updateCanvas();
    return true;
}

function closeCanvasContextMenu() {
    if (!canvasContextMenu) return;
    canvasContextMenu.classList.remove('open');
    canvasContextMenu.style.left = '';
    canvasContextMenu.style.top = '';
    canvasContextMenu.dataset.index = '';
    canvasContextMenu.setAttribute('aria-hidden', 'true');
}

function openCanvasContextMenu(x, y, screenshotIndex) {
    if (!canvasContextMenu) return;

    const moveLeftItem = canvasContextMenu.querySelector('.canvas-menu-move-left');
    const moveRightItem = canvasContextMenu.querySelector('.canvas-menu-move-right');
    const hasAdjacent = state.screenshots.length > 1;
    if (moveLeftItem) {
        moveLeftItem.disabled = isSliding || !hasAdjacent || screenshotIndex <= 0;
    }
    if (moveRightItem) {
        moveRightItem.disabled = isSliding || !hasAdjacent || screenshotIndex >= state.screenshots.length - 1;
    }

    canvasContextMenu.dataset.index = String(screenshotIndex);
    canvasContextMenu.classList.add('open');
    canvasContextMenu.setAttribute('aria-hidden', 'false');

    const margin = 8;
    const menuRect = canvasContextMenu.getBoundingClientRect();
    let left = x;
    let top = y;

    if (left + menuRect.width > window.innerWidth - margin) {
        left = window.innerWidth - menuRect.width - margin;
    }
    if (top + menuRect.height > window.innerHeight - margin) {
        top = window.innerHeight - menuRect.height - margin;
    }

    canvasContextMenu.style.left = `${Math.max(margin, left)}px`;
    canvasContextMenu.style.top = `${Math.max(margin, top)}px`;
}

function transferStyle(sourceIndex, targetIndex) {
    const source = state.screenshots[sourceIndex];
    const target = state.screenshots[targetIndex];

    if (!source || !target) {
        state.transferTarget = null;
        updateScreenshotList();
        return;
    }

    // Deep copy background settings
    target.background = JSON.parse(JSON.stringify(source.background));
    // Handle background image separately (not JSON serializable)
    if (source.background.image) {
        target.background.image = source.background.image;
    }

    // Deep copy screenshot settings
    target.screenshot = JSON.parse(JSON.stringify(source.screenshot));

    // Copy text styling but preserve actual text content
    const targetHeadlines = target.text.headlines;
    const targetSubheadlines = target.text.subheadlines;
    target.text = JSON.parse(JSON.stringify(source.text));
    // Restore original text content
    target.text.headlines = targetHeadlines;
    target.text.subheadlines = targetSubheadlines;

    // Deep copy elements (reconstruct Image objects for graphics and icons)
    target.elements = (source.elements || []).map(el => {
        const copy = JSON.parse(JSON.stringify({ ...el, image: undefined }));
        if ((el.type === 'graphic' || el.type === 'device') && el.image) {
            copy.image = el.image;
        } else if (el.type === 'icon' && el.image) {
            copy.image = el.image;
        }
        copy.id = crypto.randomUUID();
        return copy;
    });

    // Explicitly skip popouts — crop regions are specific to each screenshot's source image

    // Reset transfer mode
    state.transferTarget = null;

    // Update UI
    updateScreenshotList();
    syncUIWithState();
    updateGradientStopsUI();
    updateCanvas();
}

// Track which screenshot to apply style from
let applyStyleSourceIndex = null;

function showApplyStyleModal(sourceIndex) {
    applyStyleSourceIndex = sourceIndex;
    document.getElementById('apply-style-modal').classList.add('visible');
}

function applyStyleToAll() {
    if (applyStyleSourceIndex === null) return;

    const source = state.screenshots[applyStyleSourceIndex];
    if (!source) {
        applyStyleSourceIndex = null;
        return;
    }

    // Apply style to all other screenshots
    state.screenshots.forEach((target, index) => {
        if (index === applyStyleSourceIndex) return; // Skip source

        // Deep copy background settings
        target.background = JSON.parse(JSON.stringify(source.background));
        // Handle background image separately (not JSON serializable)
        if (source.background.image) {
            target.background.image = source.background.image;
        }

        // Deep copy screenshot settings
        target.screenshot = JSON.parse(JSON.stringify(source.screenshot));

        // Copy text styling but preserve actual text content
        const targetHeadlines = target.text.headlines;
        const targetSubheadlines = target.text.subheadlines;
        target.text = JSON.parse(JSON.stringify(source.text));
        // Restore original text content
        target.text.headlines = targetHeadlines;
        target.text.subheadlines = targetSubheadlines;

        // Deep copy elements
        target.elements = (source.elements || []).map(el => {
            const copy = JSON.parse(JSON.stringify({ ...el, image: undefined }));
            if ((el.type === 'graphic' || el.type === 'device') && el.image) {
                copy.image = el.image;
            }
            copy.id = crypto.randomUUID();
            return copy;
        });

        // Explicitly skip popouts — crop regions are specific to each screenshot's source image
    });

    applyStyleSourceIndex = null;

    // Update UI
    updateScreenshotList();
    syncUIWithState();
    updateGradientStopsUI();
    updateCanvas();
}

// Replace screenshot image via file picker
function replaceScreenshot(index) {
    const screenshot = state.screenshots[index];
    if (!screenshot) return;

    // Create a hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) {
            document.body.removeChild(fileInput);
            return;
        }

        let sourceUrl = null;
        try {
            const uploaded = await uploadMediaFile(file);
            sourceUrl = uploaded?.url || null;
        } catch (uploadError) {
            console.error('Replace upload failed, using data URL fallback:', uploadError);
        }

        if (!sourceUrl) {
            sourceUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.readAsDataURL(file);
            });
        }

        const img = new Image();
        img.onload = () => {
            // Get the current language
            const lang = state.currentLanguage;

            // Update the localized image for the current language
            if (!screenshot.localizedImages) {
                screenshot.localizedImages = {};
            }

            screenshot.localizedImages[lang] = {
                image: img,
                src: sourceUrl,
                name: file.name
            };

            // Also update legacy image field for compatibility
            screenshot.image = img;

            // Update displays
            updateScreenshotList();
            updateCanvas();
            saveState();
        };
        img.src = sourceUrl;

        document.body.removeChild(fileInput);
    });

    // Trigger file dialog
    fileInput.click();
}

function updateGradientStopsUI() {
    const container = document.getElementById('gradient-stops');
    container.innerHTML = '';

    const bg = getBackground();
    bg.gradient.stops.forEach((stop, index) => {
        const div = document.createElement('div');
        div.className = 'gradient-stop';
        div.innerHTML = `
            <input type="color" value="${stop.color}" data-stop="${index}">
            <input type="number" value="${stop.position}" min="0" max="100" data-stop="${index}">
            <span>%</span>
            ${index > 1 ? `<button class="screenshot-delete gradient-stop-delete" type="button" title="Remove color stop" aria-label="Remove color stop" data-stop="${index}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>` : ''}
        `;

        div.querySelector('input[type="color"]').addEventListener('input', (e) => {
            const currentBg = getBackground();
            currentBg.gradient.stops[index].color = e.target.value;
            // Deselect preset when manually changing colors
            document.querySelectorAll('.preset-swatch').forEach(s => s.classList.remove('selected'));
            updateUsedGradientPresets();
            updateCanvas();
        });

        div.querySelector('input[type="number"]').addEventListener('input', (e) => {
            const currentBg = getBackground();
            currentBg.gradient.stops[index].position = parseInt(e.target.value);
            // Deselect preset when manually changing positions
            document.querySelectorAll('.preset-swatch').forEach(s => s.classList.remove('selected'));
            updateUsedGradientPresets();
            updateCanvas();
        });

        const deleteBtn = div.querySelector('.screenshot-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const currentBg = getBackground();
                currentBg.gradient.stops.splice(index, 1);
                // Deselect preset when deleting a stop
                document.querySelectorAll('.preset-swatch').forEach(s => s.classList.remove('selected'));
                updateGradientStopsUI();
                updateUsedGradientPresets();
                updateCanvas();
            });
        }

        container.appendChild(div);
    });
}

function getCanvasDimensions() {
    if (state.outputDevice === 'custom') {
        return { width: state.customWidth, height: state.customHeight };
    }
    return deviceDimensions[state.outputDevice];
}

