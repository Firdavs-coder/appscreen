// Editor Module 04a: Elements and popouts interactions.
// Purpose: Handles element/popout list UIs, properties panels, drag/resize behavior, and crop-preview interactions.

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
