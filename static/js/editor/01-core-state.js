// State management
const state = {
    screenshots: [],
    selectedIndex: 0,
    transferTarget: null, // Index of screenshot waiting to receive style transfer
    outputDevice: 'iphone-6.9',
    currentLanguage: 'en', // Global current language for all text
    projectLanguages: ['en'], // Languages available in this project
    aiAnalysisCache: {},
    customWidth: 1290,
    customHeight: 2796,
    // Default settings applied to new screenshots
    defaults: {
        background: {
            type: 'gradient',
            gradient: {
                angle: 135,
                stops: [
                    { color: '#667eea', position: 0 },
                    { color: '#764ba2', position: 100 }
                ]
            },
            solid: '#1a1a2e',
            image: null,
            imageFit: 'cover',
            imageBlur: 0,
            overlayColor: '#000000',
            overlayOpacity: 0,
            noise: false,
            noiseIntensity: 10
        },
        screenshot: {
            scale: 70,
            y: 60,
            x: 50,
            rotation: 0,
            perspective: 0,
            cornerRadius: 24,
            use3D: false,
            device3D: 'iphone',
            device2D: 'apple-iphone-15-pro-max-2023-medium',
            rotation3D: { x: 0, y: 0, z: 0 },
            shadow: {
                enabled: true,
                color: '#000000',
                blur: 40,
                opacity: 30,
                x: 0,
                y: 20
            },
            frame: {
                enabled: false,
                color: '#1d1d1f',
                width: 12,
                opacity: 100
            }
        },
        text: {
            headlineEnabled: true,
            headlines: { en: '' },
            headlineLanguages: ['en'],
            currentHeadlineLang: 'en',
            headlineFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Display'",
            headlineSize: 100,
            headlineWeight: '600',
            headlineItalic: false,
            headlineUnderline: false,
            headlineStrikethrough: false,
            headlineColor: '#ffffff',
            perLanguageLayout: false,
            languageSettings: {
                en: {
                    headlineSize: 100,
                    subheadlineSize: 50,
                    position: 'top',
                    offsetY: 12,
                    lineHeight: 110
                }
            },
            currentLayoutLang: 'en',
            position: 'top',
            offsetY: 12,
            lineHeight: 110,
            subheadlineEnabled: false,
            subheadlines: { en: '' },
            subheadlineLanguages: ['en'],
            currentSubheadlineLang: 'en',
            subheadlineFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Display'",
            subheadlineSize: 50,
            subheadlineWeight: '400',
            subheadlineItalic: false,
            subheadlineUnderline: false,
            subheadlineStrikethrough: false,
            subheadlineColor: '#ffffff',
            subheadlineOpacity: 70
        },
        elements: [],
        popouts: []
    }
};

const baseTextDefaults = JSON.parse(JSON.stringify(state.defaults.text));

// Runtime-only state (not persisted)
let selectedElementId = null;
let selectedPopoutId = null;
let draggingElement = null;
let hoveredCanvasTarget = null;
let selectedCanvasTarget = null;

const editorHistory = {
    undoStack: [],
    redoStack: [],
    maxEntries: 100,
    shortcutsBound: false,
    applying: false
};

// Global custom tooltip state
let customTooltipEl = null;
let customTooltipTimer = null;
let customTooltipTarget = null;
let customTooltipVisible = false;
let tooltipMutationObserver = null;

// Preload laurel SVG images for element frames
const laurelImages = {};
['laurel-simple-left', 'laurel-detailed-left'].forEach(name => {
    const img = new Image();
    img.src = `img/${name}.svg`;
    laurelImages[name] = img;
});

// Helper functions to get/set current screenshot settings
function getCurrentScreenshot() {
    if (state.screenshots.length === 0) return null;
    return state.screenshots[state.selectedIndex];
}

function getBackground() {
    const screenshot = getCurrentScreenshot();
    return screenshot ? screenshot.background : state.defaults.background;
}

function getScreenshotSettings() {
    const screenshot = getCurrentScreenshot();
    if (screenshot) {
        if (!screenshot.screenshot) {
            screenshot.screenshot = JSON.parse(JSON.stringify(state.defaults.screenshot));
        }
        if (screenshot.screenshot.device2D === undefined || screenshot.screenshot.device2D === null) {
            screenshot.screenshot.device2D = state.defaults.screenshot.device2D ?? '';
        }
        return screenshot.screenshot;
    }

    if (state.defaults.screenshot.device2D === undefined || state.defaults.screenshot.device2D === null) {
        state.defaults.screenshot.device2D = 'apple-iphone-15-pro-max-2023-medium';
    }
    return state.defaults.screenshot;
}

function getText() {
    const screenshot = getCurrentScreenshot();
    if (screenshot) {
        screenshot.text = normalizeTextSettings(screenshot.text);
        return screenshot.text;
    }
    state.defaults.text = normalizeTextSettings(state.defaults.text);
    return state.defaults.text;
}

function getTextLayoutLanguage(text) {
    if (text.currentLayoutLang) return text.currentLayoutLang;
    if (text.headlineEnabled !== false) return text.currentHeadlineLang || 'en';
    if (text.subheadlineEnabled) return text.currentSubheadlineLang || 'en';
    return text.currentHeadlineLang || text.currentSubheadlineLang || 'en';
}

function getTextLanguageSettings(text, lang) {
    if (!text.languageSettings) text.languageSettings = {};
    if (!text.languageSettings[lang]) {
        const sourceLang = text.currentLayoutLang || text.currentHeadlineLang || text.currentSubheadlineLang || 'en';
        const sourceSettings = text.languageSettings[sourceLang];
        text.languageSettings[lang] = {
            headlineSize: sourceSettings ? sourceSettings.headlineSize : (text.headlineSize || 100),
            subheadlineSize: sourceSettings ? sourceSettings.subheadlineSize : (text.subheadlineSize || 50),
            position: sourceSettings ? sourceSettings.position : (text.position || 'top'),
            offsetY: sourceSettings ? sourceSettings.offsetY : (typeof text.offsetY === 'number' ? text.offsetY : 12),
            lineHeight: sourceSettings ? sourceSettings.lineHeight : (text.lineHeight || 110)
        };
    }
    return text.languageSettings[lang];
}

function getEffectiveLayout(text, lang) {
    if (!text.perLanguageLayout) {
        return {
            headlineSize: text.headlineSize || 100,
            subheadlineSize: text.subheadlineSize || 50,
            position: text.position || 'top',
            offsetY: typeof text.offsetY === 'number' ? text.offsetY : 12,
            lineHeight: text.lineHeight || 110
        };
    }
    return getTextLanguageSettings(text, lang);
}

function normalizeTextSettings(text) {
    const merged = JSON.parse(JSON.stringify(baseTextDefaults));
    if (text) {
        Object.assign(merged, text);
        if (text.languageSettings) {
            merged.languageSettings = JSON.parse(JSON.stringify(text.languageSettings));
        }
    }

    merged.headlines = merged.headlines || { en: '' };
    merged.headlineLanguages = merged.headlineLanguages || ['en'];
    merged.currentHeadlineLang = merged.currentHeadlineLang || merged.headlineLanguages[0] || 'en';
    merged.currentLayoutLang = merged.currentLayoutLang || merged.currentHeadlineLang || 'en';

    merged.subheadlines = merged.subheadlines || { en: '' };
    merged.subheadlineLanguages = merged.subheadlineLanguages || ['en'];
    merged.currentSubheadlineLang = merged.currentSubheadlineLang || merged.subheadlineLanguages[0] || 'en';

    if (!merged.languageSettings) merged.languageSettings = {};
    const languages = new Set([...merged.headlineLanguages, ...merged.subheadlineLanguages]);
    if (languages.size === 0) languages.add('en');
    languages.forEach((lang) => {
        getTextLanguageSettings(merged, lang);
    });

    return merged;
}

function getElements() {
    const screenshot = getCurrentScreenshot();
    return screenshot ? (screenshot.elements || []) : [];
}

function getSelectedElement() {
    if (!selectedElementId) return null;
    return getElements().find(el => el.id === selectedElementId) || null;
}

function getElementText(el) {
    if (el.texts) {
        return el.texts[state.currentLanguage]
            || el.texts['en']
            || Object.values(el.texts).find(v => v)
            || el.text || '';
    }
    return el.text || '';
}

function setElementProperty(id, key, value) {
    const elements = getElements();
    const el = elements.find(e => e.id === id);
    if (el) {
        el[key] = value;
        updateCanvas();
        updateElementsList();
    }
}

function setHoveredCanvasTarget(target) {
    const sameTarget =
        (hoveredCanvasTarget === null && target === null)
        || (hoveredCanvasTarget && target
            && hoveredCanvasTarget.type === target.type
            && hoveredCanvasTarget.id === target.id);

    if (sameTarget) return;
    hoveredCanvasTarget = target;
    updateCanvas({ skipSave: true, skipInlinePreviews: true });
}

function areCanvasTargetsEqual(a, b) {
    return !!a && !!b && a.type === b.type && a.id === b.id;
}

function normalizeCanvasTarget(target) {
    if (!target || !target.type) return null;

    if (target.type === 'element') {
        if (!target.id) return null;
        return getElements().some(el => el.id === target.id)
            ? { type: 'element', id: target.id }
            : null;
    }

    if (target.type === 'popout') {
        if (!target.id) return null;
        return getPopouts().some(p => p.id === target.id)
            ? { type: 'popout', id: target.id }
            : null;
    }

    if (target.type === 'screenshot') {
        return state.screenshots.length ? { type: 'screenshot' } : null;
    }

    if (target.type === 'text') {
        return getCanvasTextBounds() ? { type: 'text' } : null;
    }

    return null;
}

function getSelectedCanvasTarget() {
    const explicitTarget = normalizeCanvasTarget(selectedCanvasTarget);
    if (explicitTarget) return explicitTarget;

    if (selectedPopoutId) {
        const popoutTarget = normalizeCanvasTarget({ type: 'popout', id: selectedPopoutId });
        if (popoutTarget) return popoutTarget;
    }

    if (selectedElementId) {
        const elementTarget = normalizeCanvasTarget({ type: 'element', id: selectedElementId });
        if (elementTarget) return elementTarget;
    }

    return null;
}

function setSelectedCanvasTarget(target, options = {}) {
    const normalized = normalizeCanvasTarget(target);
    const sameTarget =
        (selectedCanvasTarget === null && normalized === null)
        || areCanvasTargetsEqual(selectedCanvasTarget, normalized);

    if (sameTarget) return;
    selectedCanvasTarget = normalized;

    if (!options.skipCanvasRefresh) {
        updateCanvas({ skipSave: true, skipInlinePreviews: true });
    }
}

function activateSidebarTab(tabName) {
    if (!tabName) return;

    const tabBtn = document.querySelector(`.tab[data-tab="${tabName}"]`);
    const tabContent = document.getElementById('tab-' + tabName);
    if (!tabBtn || !tabContent) return;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tabBtn.classList.add('active');
    tabContent.classList.add('active');
    localStorage.setItem('activeTab', tabName);
}

function getScreenshotBounds(dims = getCanvasDimensions()) {
    const screenshot = getCurrentScreenshot();
    if (!screenshot) return null;

    const settings = getScreenshotSettings();
    if (!settings || settings.use3D) return null;

    const img = getScreenshotImage(screenshot);
    if (!img) return null;

    const scale = settings.scale / 100;
    let imgWidth = dims.width * scale;
    let imgHeight = (img.height / img.width) * imgWidth;

    if (imgHeight > dims.height * scale) {
        imgHeight = dims.height * scale;
        imgWidth = (img.width / img.height) * imgHeight;
    }

    const moveX = Math.max(dims.width - imgWidth, dims.width * 0.15);
    const moveY = Math.max(dims.height - imgHeight, dims.height * 0.15);
    const x = (dims.width - imgWidth) / 2 + (settings.x / 100 - 0.5) * moveX;
    const y = (dims.height - imgHeight) / 2 + (settings.y / 100 - 0.5) * moveY;

    const twoDModel = get2DDeviceModel(settings);
    if (twoDModel) {
        const layout = get2DDeviceLayoutForScreen(twoDModel, x, y, imgWidth, imgHeight, settings);
        if (layout) {
            return {
                x: layout.frameX,
                y: layout.frameY,
                width: layout.frameWidth,
                height: layout.frameHeight
            };
        }
    }

    return { x, y, width: imgWidth, height: imgHeight };
}

function getElementBounds(el, dims = getCanvasDimensions()) {
    if (!el) return null;

    const cx = dims.width * (el.x / 100);
    const cy = dims.height * (el.y / 100);
    const elWidth = dims.width * (el.width / 100);
    let elHeight;

    if (el.type === 'emoji' || el.type === 'icon') {
        elHeight = elWidth;
    } else if ((el.type === 'graphic' || el.type === 'device') && el.image) {
        elHeight = elWidth * (el.image.height / el.image.width);
    } else {
        elHeight = el.fontSize * 1.5;
    }

    return {
        x: cx - elWidth / 2,
        y: cy - elHeight / 2,
        width: elWidth,
        height: elHeight
    };
}

function getPopoutBounds(p, dims = getCanvasDimensions()) {
    if (!p) return null;

    const screenshot = getCurrentScreenshot();
    if (!screenshot) return null;
    const img = getScreenshotImage(screenshot);
    if (!img) return null;

    const cx = dims.width * (p.x / 100);
    const cy = dims.height * (p.y / 100);
    const displayW = dims.width * (p.width / 100);
    const sw = (p.cropWidth / 100) * img.width;
    const sh = (p.cropHeight / 100) * img.height;
    if (sw <= 0 || sh <= 0) return null;

    const displayH = displayW * (sh / sw);

    return {
        x: cx - displayW / 2,
        y: cy - displayH / 2,
        width: displayW,
        height: displayH
    };
}

function getCanvasTextBounds(dims = getCanvasDimensions()) {
    const text = getTextSettings();

    const headlineEnabled = text.headlineEnabled !== false;
    const subheadlineEnabled = text.subheadlineEnabled || false;

    const headlineLang = text.currentHeadlineLang || 'en';
    const subheadlineLang = text.currentSubheadlineLang || 'en';
    const layoutLang = getTextLayoutLanguage(text);
    const headlineLayout = getEffectiveLayout(text, headlineLang);
    const subheadlineLayout = getEffectiveLayout(text, subheadlineLang);
    const layoutSettings = getEffectiveLayout(text, layoutLang);

    const headline = headlineEnabled && text.headlines ? (text.headlines[headlineLang] || '') : '';
    const subheadline = subheadlineEnabled && text.subheadlines ? (text.subheadlines[subheadlineLang] || '') : '';

    if (!headline && !subheadline) return null;

    const padding = dims.width * 0.08;
    const textY = layoutSettings.position === 'top'
        ? dims.height * (layoutSettings.offsetY / 100)
        : dims.height * (1 - layoutSettings.offsetY / 100);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const includeLineBounds = (line, y, fontSize, baselineMode) => {
        const lineWidth = ctx.measureText(line).width;
        const left = dims.width / 2 - lineWidth / 2;
        const right = left + lineWidth;
        const top = baselineMode === 'top' ? y : y - fontSize;
        const bottom = baselineMode === 'top' ? y + fontSize : y;

        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
    };

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = layoutSettings.position === 'top' ? 'top' : 'bottom';

    let currentY = textY;

    if (headline) {
        const fontStyle = text.headlineItalic ? 'italic' : 'normal';
        ctx.font = `${fontStyle} ${text.headlineWeight} ${headlineLayout.headlineSize}px ${text.headlineFont}`;

        const lines = wrapText(ctx, headline, dims.width - padding * 2);
        const lineHeight = headlineLayout.headlineSize * (layoutSettings.lineHeight / 100);

        if (layoutSettings.position === 'bottom') {
            currentY -= (lines.length - 1) * lineHeight;
        }

        let lastLineY = currentY;
        lines.forEach((line, i) => {
            const y = currentY + i * lineHeight;
            lastLineY = y;
            includeLineBounds(line, y, headlineLayout.headlineSize, layoutSettings.position === 'top' ? 'top' : 'bottom');
        });

        const gap = lineHeight - headlineLayout.headlineSize;
        if (layoutSettings.position === 'top') {
            currentY = lastLineY + headlineLayout.headlineSize + gap;
        } else {
            currentY = lastLineY + gap;
        }
    }

    if (subheadline) {
        const subFontStyle = text.subheadlineItalic ? 'italic' : 'normal';
        const subWeight = text.subheadlineWeight || '400';
        ctx.font = `${subFontStyle} ${subWeight} ${subheadlineLayout.subheadlineSize}px ${text.subheadlineFont || text.headlineFont}`;

        const lines = wrapText(ctx, subheadline, dims.width - padding * 2);
        const subLineHeight = subheadlineLayout.subheadlineSize * 1.4;
        const subY = currentY;
        const subBaseline = 'top';

        lines.forEach((line, i) => {
            const y = subY + i * subLineHeight;
            includeLineBounds(line, y, subheadlineLayout.subheadlineSize, subBaseline);
        });
    }

    ctx.restore();

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

    const outlinePad = Math.max(3, (dims.width / 400) * 6);
    return {
        x: minX - outlinePad,
        y: minY - outlinePad,
        width: (maxX - minX) + outlinePad * 2,
        height: (maxY - minY) + outlinePad * 2
    };
}

function getCanvasHoverBounds(target, dims = getCanvasDimensions()) {
    if (!target) return null;

    if (target.type === 'element') {
        const el = getElements().find(item => item.id === target.id);
        return getElementBounds(el, dims);
    }
    if (target.type === 'popout') {
        const popout = getPopouts().find(item => item.id === target.id);
        return getPopoutBounds(popout, dims);
    }
    if (target.type === 'text') {
        return getCanvasTextBounds(dims);
    }
    if (target.type === 'screenshot') {
        return getScreenshotBounds(dims);
    }
    return null;
}

function isCanvasTargetResizable(target) {
    return !!target && (target.type === 'element' || target.type === 'popout' || target.type === 'screenshot');
}

function getHoverHandleSize(dims = getCanvasDimensions()) {
    const scale = dims.width / 400;
    return Math.max(8, 10 * scale);
}

function getCanvasOutlinePadding(dims = getCanvasDimensions()) {
    const scale = dims.width / 400;
    return Math.max(6, 8 * scale);
}

function getResizeHandlesForBounds(bounds, inset = 0) {
    return [
        { id: 'top-left', x: bounds.x - inset, y: bounds.y - inset },
        { id: 'top-right', x: bounds.x + bounds.width + inset, y: bounds.y - inset },
        { id: 'bottom-left', x: bounds.x - inset, y: bounds.y + bounds.height + inset },
        { id: 'bottom-right', x: bounds.x + bounds.width + inset, y: bounds.y + bounds.height + inset }
    ];
}

function getResizeAnchorForHandle(bounds, handle) {
    switch (handle) {
        case 'top-left':
            return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
        case 'top-right':
            return { x: bounds.x, y: bounds.y + bounds.height };
        case 'bottom-left':
            return { x: bounds.x + bounds.width, y: bounds.y };
        case 'bottom-right':
            return { x: bounds.x, y: bounds.y };
        default:
            return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    }
}

function hitTestResizeHandle(target, canvasX, canvasY, dims = getCanvasDimensions()) {
    if (!isCanvasTargetResizable(target)) return null;

    const bounds = getCanvasHoverBounds(target, dims);
    if (!bounds) return null;

    const handleSize = getHoverHandleSize(dims);
    const hitRadius = handleSize * 1.25;
    const handles = getResizeHandlesForBounds(bounds, getCanvasOutlinePadding(dims));

    for (const handle of handles) {
        if (Math.abs(canvasX - handle.x) <= hitRadius && Math.abs(canvasY - handle.y) <= hitRadius) {
            return handle.id;
        }
    }
    return null;
}

function drawCanvasHoverOutline() {
    if (draggingElement) return;

    const selectedTarget = getSelectedCanvasTarget();
    const hoverTarget = hoveredCanvasTarget;
    if (!selectedTarget && !hoverTarget) return;

    const dims = getCanvasDimensions();
    const scale = dims.width / 400;
    const pad = getCanvasOutlinePadding(dims);

    function drawOutline(target, options = {}) {
        const bounds = getCanvasHoverBounds(target, dims);
        if (!bounds) return;

        const drawHandles = !!options.drawHandles;
        const stroke = options.stroke || 'rgba(10, 132, 255, 0.95)';
        const lineWidth = options.lineWidth || Math.max(1.5, 2 * scale);

        ctx.save();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([]); // Hover and selected outlines are solid
        ctx.strokeRect(
            bounds.x - pad,
            bounds.y - pad,
            bounds.width + pad * 2,
            bounds.height + pad * 2
        );

        if (drawHandles && isCanvasTargetResizable(target)) {
            const handleSize = getHoverHandleSize(dims);
            const handles = getResizeHandlesForBounds(bounds, pad);

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = 'rgba(10, 132, 255, 1)';
            ctx.lineWidth = Math.max(1, 1.5 * scale);

            handles.forEach((h) => {
                ctx.fillRect(
                    h.x - handleSize / 2,
                    h.y - handleSize / 2,
                    handleSize,
                    handleSize
                );
                ctx.strokeRect(
                    h.x - handleSize / 2,
                    h.y - handleSize / 2,
                    handleSize,
                    handleSize
                );
            });
        }

        ctx.restore();
    }

    // Show hover outline even when something else is selected
    if (hoverTarget && (!selectedTarget || !areCanvasTargetsEqual(selectedTarget, hoverTarget))) {
        drawOutline(hoverTarget, {
            drawHandles: !selectedTarget,
            stroke: 'rgba(10, 132, 255, 0.7)',
            lineWidth: Math.max(1.25, 1.6 * scale)
        });
    }

    if (selectedTarget) {
        drawOutline(selectedTarget, {
            drawHandles: true,
            stroke: 'rgba(10, 132, 255, 0.95)',
            lineWidth: Math.max(1.5, 2 * scale)
        });
    } else if (hoverTarget) {
        drawOutline(hoverTarget, {
            drawHandles: true,
            stroke: 'rgba(10, 132, 255, 0.95)',
            lineWidth: Math.max(1.5, 2 * scale)
        });
    }
}

function hideCanvasSelectionToolbar() {
    if (!canvasSelectionToolbar) return;
    canvasSelectionToolbar.hidden = true;
    canvasSelectionToolbar.setAttribute('aria-hidden', 'true');
}

function canMoveCanvasTarget(target, direction) {
    if (!target) return false;

    if (target.type === 'element') {
        const elements = getElements();
        const idx = elements.findIndex(el => el.id === target.id);
        if (idx === -1) return false;
        return direction === 'forward' ? idx < elements.length - 1 : idx > 0;
    }

    if (target.type === 'popout') {
        const popouts = getPopouts();
        const idx = popouts.findIndex(p => p.id === target.id);
        if (idx === -1) return false;
        return direction === 'forward' ? idx < popouts.length - 1 : idx > 0;
    }

    return false;
}

function canCopyCanvasTarget(target) {
    if (!target) return false;
    if (target.type === 'element' || target.type === 'popout') return true;
    if (target.type === 'screenshot') return !!getScreenshotImage(getCurrentScreenshot());
    return false;
}

function canDeleteCanvasTarget(target) {
    return !!target && (target.type === 'element' || target.type === 'popout' || target.type === 'screenshot');
}

function hasCanvasTargetActions(target) {
    if (!target) return false;
    return target.type === 'element' || target.type === 'popout' || target.type === 'screenshot';
}

function updateCanvasSelectionToolbar() {
    if (!canvasSelectionToolbar) return;
    if (draggingElement) {
        hideCanvasSelectionToolbar();
        return;
    }

    const target = getSelectedCanvasTarget();
    if (!target || !hasCanvasTargetActions(target)) {
        hideCanvasSelectionToolbar();
        return;
    }

    const dims = getCanvasDimensions();
    const bounds = getCanvasHoverBounds(target, dims);
    if (!bounds) {
        hideCanvasSelectionToolbar();
        return;
    }

    canvasSelectionToolbar.hidden = false;
    canvasSelectionToolbar.setAttribute('aria-hidden', 'false');

    const moveBackBtn = canvasSelectionToolbar.querySelector('[data-action="move-back"]');
    const moveForwardBtn = canvasSelectionToolbar.querySelector('[data-action="move-forward"]');
    const copyBtn = canvasSelectionToolbar.querySelector('[data-action="copy"]');
    const deleteBtn = canvasSelectionToolbar.querySelector('[data-action="delete"]');
    if (moveBackBtn) moveBackBtn.disabled = !canMoveCanvasTarget(target, 'back');
    if (moveForwardBtn) moveForwardBtn.disabled = !canMoveCanvasTarget(target, 'forward');
    if (copyBtn) copyBtn.disabled = !canCopyCanvasTarget(target);
    if (deleteBtn) deleteBtn.disabled = !canDeleteCanvasTarget(target);

    const canvasRect = canvas.getBoundingClientRect();
    const wrapperRect = canvasWrapper.getBoundingClientRect();
    const scaleX = canvasRect.width / Math.max(1, dims.width);
    const scaleY = canvasRect.height / Math.max(1, dims.height);

    const outlinePad = getCanvasOutlinePadding(dims);
    const handleSize = isCanvasTargetResizable(target) ? getHoverHandleSize(dims) : 0;
    const handleHalf = handleSize / 2;

    const cornerRight = (bounds.x + bounds.width + outlinePad + handleHalf) * scaleX;
    const cornerTop = (bounds.y - outlinePad - handleHalf) * scaleY;
    const canvasOffsetX = canvasRect.left - wrapperRect.left;
    const canvasOffsetY = canvasRect.top - wrapperRect.top;

    const margin = 8;
    const cornerClearance = Math.max(4, Math.round(handleSize * 0.35));
    const toolbarWidth = canvasSelectionToolbar.offsetWidth;
    const toolbarHeight = canvasSelectionToolbar.offsetHeight;

    // Default: outside top-right corner of selected bounds
    let left = canvasOffsetX + cornerRight + cornerClearance;
    let top = canvasOffsetY + cornerTop - toolbarHeight - cornerClearance;

    // If no space on the right, keep it at the top-right corner but shift inward.
    if (left + toolbarWidth > wrapperRect.width - margin) {
        left = canvasOffsetX + cornerRight - toolbarWidth;
    }

    // If no space above, place below the top-right corner
    if (top < margin) {
        top = canvasOffsetY + cornerTop + cornerClearance;
    }

    const maxLeft = wrapperRect.width - toolbarWidth - margin;
    const maxTop = wrapperRect.height - toolbarHeight - margin;
    left = Math.max(margin, Math.min(maxLeft, left));
    top = Math.max(margin, Math.min(maxTop, top));

    canvasSelectionToolbar.style.left = `${left}px`;
    canvasSelectionToolbar.style.top = `${top}px`;
}

// ===== Popout accessors =====
function getPopouts() {
    const screenshot = getCurrentScreenshot();
    return screenshot ? (screenshot.popouts || []) : [];
}

function getSelectedPopout() {
    if (!selectedPopoutId) return null;
    return getPopouts().find(p => p.id === selectedPopoutId) || null;
}

function setPopoutProperty(id, key, value) {
    const popouts = getPopouts();
    const p = popouts.find(po => po.id === id);
    if (p) {
        if (key.includes('.')) {
            const parts = key.split('.');
            let obj = p;
            for (let i = 0; i < parts.length - 1; i++) {
                obj = obj[parts[i]];
            }
            obj[parts[parts.length - 1]] = value;
        } else {
            p[key] = value;
        }
        updateCanvas();
        updatePopoutProperties();
    }
}

function addPopout() {
    const screenshot = getCurrentScreenshot();
    if (!screenshot) return;
    const img = getScreenshotImage(screenshot);
    if (!img) return;
    if (!screenshot.popouts) screenshot.popouts = [];
    const p = {
        id: crypto.randomUUID(),
        cropX: 25, cropY: 25, cropWidth: 30, cropHeight: 30,
        x: 70, y: 30,
        width: 30,
        rotation: 0, opacity: 100, cornerRadius: 12,
        shadow: { enabled: true, color: '#000000', blur: 30, opacity: 40, x: 0, y: 15 },
        border: { enabled: true, color: '#ffffff', width: 3, opacity: 100 }
    };
    screenshot.popouts.push(p);
    selectedPopoutId = p.id;
    setSelectedCanvasTarget({ type: 'popout', id: p.id }, { skipCanvasRefresh: true });
    updateCanvas();
    updatePopoutsList();
    updatePopoutProperties();
}

function deletePopout(id) {
    const screenshot = getCurrentScreenshot();
    if (!screenshot || !screenshot.popouts) return;
    screenshot.popouts = screenshot.popouts.filter(p => p.id !== id);
    if (selectedPopoutId === id) selectedPopoutId = null;
    if (selectedCanvasTarget?.type === 'popout' && selectedCanvasTarget.id === id) {
        selectedCanvasTarget = null;
    }
    updateCanvas();
    updatePopoutsList();
    updatePopoutProperties();
}

function movePopout(id, direction) {
    const screenshot = getCurrentScreenshot();
    if (!screenshot || !screenshot.popouts) return;
    const idx = screenshot.popouts.findIndex(p => p.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx < screenshot.popouts.length - 1) {
        [screenshot.popouts[idx], screenshot.popouts[idx + 1]] = [screenshot.popouts[idx + 1], screenshot.popouts[idx]];
    } else if (direction === 'down' && idx > 0) {
        [screenshot.popouts[idx], screenshot.popouts[idx - 1]] = [screenshot.popouts[idx - 1], screenshot.popouts[idx]];
    }
    updateCanvas();
    updatePopoutsList();
}

function duplicatePopout(id) {
    const screenshot = getCurrentScreenshot();
    if (!screenshot || !screenshot.popouts) return;

    const idx = screenshot.popouts.findIndex(p => p.id === id);
    if (idx === -1) return;

    const source = screenshot.popouts[idx];
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = crypto.randomUUID();
    copy.x = Math.max(0, Math.min(100, (source.x || 50) + 2));
    copy.y = Math.max(0, Math.min(100, (source.y || 50) + 2));

    screenshot.popouts.splice(idx + 1, 0, copy);
    selectedPopoutId = copy.id;
    setSelectedCanvasTarget({ type: 'popout', id: copy.id }, { skipCanvasRefresh: true });
    updateCanvas();
    updatePopoutsList();
    updatePopoutProperties();
}

function addGraphicElement(img, src, name) {
    const screenshot = getCurrentScreenshot();
    if (!screenshot) return;
    if (!screenshot.elements) screenshot.elements = [];
    const el = {
        id: crypto.randomUUID(),
        type: 'graphic',
        x: 50, y: 50,
        width: 20,
        rotation: 0,
        opacity: 100,
        layer: 'above-text',
        image: img,
        src: src,
        name: name || 'Graphic',
        text: '',
        font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display'",
        fontSize: 60,
        fontWeight: '600',
        fontColor: '#ffffff',
        italic: false,
        frame: 'none',
        frameColor: '#ffffff',
        frameScale: 100
    };
    screenshot.elements.push(el);
    selectedElementId = el.id;
    setSelectedCanvasTarget({ type: 'element', id: el.id }, { skipCanvasRefresh: true });
    updateCanvas();
    updateElementsList();
    updateElementProperties();
}

function addTextElement() {
    const screenshot = getCurrentScreenshot();
    if (!screenshot) return;
    if (!screenshot.elements) screenshot.elements = [];
    const el = {
        id: crypto.randomUUID(),
        type: 'text',
        x: 50, y: 50,
        width: 40,
        rotation: 0,
        opacity: 100,
        layer: 'above-text',
        image: null,
        src: null,
        name: 'Text',
        text: 'Your Text',
        texts: { [state.currentLanguage]: 'Your Text' },
        font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display'",
        fontSize: 60,
        fontWeight: '600',
        fontColor: '#ffffff',
        italic: false,
        frame: 'none',
        frameColor: '#ffffff',
        frameScale: 100
    };
    screenshot.elements.push(el);
    selectedElementId = el.id;
    setSelectedCanvasTarget({ type: 'element', id: el.id }, { skipCanvasRefresh: true });
    updateCanvas();
    updateElementsList();
    updateElementProperties();
}

function addDeviceElementFromScreenshot(options = {}) {
    const screenshot = getCurrentScreenshot();
    if (!screenshot) return;

    const img = getScreenshotImage(screenshot);
    if (!img) {
        showAppAlert('Add or select a screenshot image first to create a device copy.', 'info');
        return;
    }

    if (!screenshot.elements) screenshot.elements = [];

    const ss = getScreenshotSettings();
    const width = Math.max(12, Math.min(80, (ss?.scale || 70) * 0.55));
    const shift = options.offset ? 2 : 0;

    const el = {
        id: crypto.randomUUID(),
        type: 'device',
        x: Math.max(0, Math.min(100, 50 + shift)),
        y: Math.max(0, Math.min(100, 50 + shift)),
        width,
        rotation: 0,
        opacity: 100,
        layer: 'above-screenshot',
        image: img,
        src: img.src,
        name: 'Device',
        deviceStyle: {
            cornerRadius: ss?.cornerRadius || 24,
            shadow: JSON.parse(JSON.stringify(ss?.shadow || { enabled: false })),
            frame: JSON.parse(JSON.stringify(ss?.frame || { enabled: false }))
        }
    };

    screenshot.elements.push(el);
    selectedElementId = el.id;
    selectedPopoutId = null;
    setSelectedCanvasTarget({ type: 'element', id: el.id }, { skipCanvasRefresh: true });
    updateElementsList();
    updateElementProperties();
    updateCanvas();
}

// ===== Lucide SVG loading & caching =====
const lucideSVGCache = new Map(); // name -> raw SVG text

async function fetchLucideSVG(name) {
    if (lucideSVGCache.has(name)) return lucideSVGCache.get(name);
    const url = `https://unpkg.com/lucide-static@latest/icons/${name}.svg`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch icon: ${name}`);
    const svgText = await resp.text();
    lucideSVGCache.set(name, svgText);
    return svgText;
}

function colorizeLucideSVG(svgText, color, strokeWidth) {
    return svgText
        .replace(/stroke="currentColor"/g, `stroke="${color}"`)
        .replace(/stroke-width="[^"]*"/g, `stroke-width="${strokeWidth}"`);
}

async function getLucideImage(name, color, strokeWidth) {
    const rawSVG = await fetchLucideSVG(name);
    const colorized = colorizeLucideSVG(rawSVG, color, strokeWidth);
    const blob = new Blob([colorized], { type: 'image/svg+xml' });
    const blobURL = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = blobURL;
    });
}

async function updateIconImage(el) {
    if (el.type !== 'icon') return;
    try {
        el.image = await getLucideImage(el.iconName, el.iconColor, el.iconStrokeWidth);
        updateCanvas();
    } catch (e) {
        console.error('Failed to update icon image:', e);
    }
}

function addEmojiElement(emoji, name) {
    const screenshot = getCurrentScreenshot();
    if (!screenshot) return;
    if (!screenshot.elements) screenshot.elements = [];
    const el = {
        id: crypto.randomUUID(),
        type: 'emoji',
        x: 50, y: 50,
        width: 15,
        rotation: 0,
        opacity: 100,
        layer: 'above-text',
        emoji: emoji,
        name: name || 'Emoji',
        image: null,
        src: null,
        text: '',
        font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display'",
        fontSize: 60,
        fontWeight: '600',
        fontColor: '#ffffff',
        italic: false,
        frame: 'none',
        frameColor: '#ffffff',
        frameScale: 100
    };
    screenshot.elements.push(el);
    selectedElementId = el.id;
    setSelectedCanvasTarget({ type: 'element', id: el.id }, { skipCanvasRefresh: true });
    updateCanvas();
    updateElementsList();
    updateElementProperties();
}

async function addIconElement(iconName) {
    const screenshot = getCurrentScreenshot();
    if (!screenshot) return;
    if (!screenshot.elements) screenshot.elements = [];
    const el = {
        id: crypto.randomUUID(),
        type: 'icon',
        x: 50, y: 50,
        width: 15,
        rotation: 0,
        opacity: 100,
        layer: 'above-text',
        iconName: iconName,
        iconColor: '#ffffff',
        iconStrokeWidth: 2,
        iconShadow: { enabled: false, color: '#000000', blur: 20, opacity: 40, x: 0, y: 10 },
        image: null,
        src: null,
        name: iconName,
        text: '',
        font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display'",
        fontSize: 60,
        fontWeight: '600',
        fontColor: '#ffffff',
        italic: false,
        frame: 'none',
        frameColor: '#ffffff',
        frameScale: 100
    };
    screenshot.elements.push(el);
    selectedElementId = el.id;
    setSelectedCanvasTarget({ type: 'element', id: el.id }, { skipCanvasRefresh: true });
    updateElementsList();
    updateElementProperties();
    // Async: fetch icon SVG
    try {
        el.image = await getLucideImage(iconName, el.iconColor, el.iconStrokeWidth);
        updateCanvas();
    } catch (e) {
        console.error('Failed to load icon:', e);
    }
    updateCanvas();
}

function deleteElement(id) {
    const screenshot = getCurrentScreenshot();
    if (!screenshot || !screenshot.elements) return;
    screenshot.elements = screenshot.elements.filter(e => e.id !== id);
    if (selectedElementId === id) selectedElementId = null;
    if (selectedCanvasTarget?.type === 'element' && selectedCanvasTarget.id === id) {
        selectedCanvasTarget = null;
    }
    updateCanvas();
    updateElementsList();
    updateElementProperties();
}

function moveElementLayer(id, direction) {
    const screenshot = getCurrentScreenshot();
    if (!screenshot || !screenshot.elements) return;
    const idx = screenshot.elements.findIndex(e => e.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx < screenshot.elements.length - 1) {
        [screenshot.elements[idx], screenshot.elements[idx + 1]] = [screenshot.elements[idx + 1], screenshot.elements[idx]];
    } else if (direction === 'down' && idx > 0) {
        [screenshot.elements[idx], screenshot.elements[idx - 1]] = [screenshot.elements[idx - 1], screenshot.elements[idx]];
    }
    updateCanvas();
    updateElementsList();
}

function duplicateElement(id) {
    const screenshot = getCurrentScreenshot();
    if (!screenshot || !screenshot.elements) return;

    const idx = screenshot.elements.findIndex(e => e.id === id);
    if (idx === -1) return;

    const source = screenshot.elements[idx];
    const copy = JSON.parse(JSON.stringify({ ...source, image: undefined }));
    if ((source.type === 'graphic' || source.type === 'icon' || source.type === 'device') && source.image) {
        copy.image = source.image;
    }

    copy.id = crypto.randomUUID();
    copy.x = Math.max(0, Math.min(100, (source.x || 50) + 2));
    copy.y = Math.max(0, Math.min(100, (source.y || 50) + 2));

    screenshot.elements.splice(idx + 1, 0, copy);
    selectedElementId = copy.id;
    setSelectedCanvasTarget({ type: 'element', id: copy.id }, { skipCanvasRefresh: true });
    updateCanvas();
    updateElementsList();
    updateElementProperties();
}

function deleteScreenshotAt(index) {
    if (index < 0 || index >= state.screenshots.length) return;

    const keepScreenshotSelection = selectedCanvasTarget?.type === 'screenshot';

    state.screenshots.splice(index, 1);
    if (state.selectedIndex >= state.screenshots.length) {
        state.selectedIndex = Math.max(0, state.screenshots.length - 1);
    }

    if (!state.screenshots.length) {
        selectedCanvasTarget = null;
    }

    updateScreenshotList();
    syncUIWithState();
    if (keepScreenshotSelection && state.screenshots.length) {
        setSelectedCanvasTarget({ type: 'screenshot' }, { skipCanvasRefresh: true });
    }
    updateGradientStopsUI();
    updateCanvas();
}

function moveSelectedCanvasTarget(target, direction) {
    if (!target) return;

    if (target.type === 'element') {
        moveElementLayer(target.id, direction === 'forward' ? 'up' : 'down');
        return;
    }

    if (target.type === 'popout') {
        movePopout(target.id, direction === 'forward' ? 'up' : 'down');
    }
}

function duplicateSelectedCanvasTarget(target) {
    if (!target) return;

    if (target.type === 'element') {
        duplicateElement(target.id);
        return;
    }

    if (target.type === 'popout') {
        duplicatePopout(target.id);
        return;
    }

    if (target.type === 'screenshot') {
        addDeviceElementFromScreenshot({ offset: true });
    }
}

function deleteSelectedCanvasTarget(target) {
    if (!target) return;

    if (target.type === 'element') {
        deleteElement(target.id);
        return;
    }

    if (target.type === 'popout') {
        deletePopout(target.id);
        return;
    }

    if (target.type === 'screenshot') {
        deleteScreenshotAt(state.selectedIndex);
    }
}

// Add reset buttons to all slider control rows
function setupSliderResetButtons() {
    document.querySelectorAll('.control-row input[type="range"]').forEach(slider => {
        const row = slider.closest('.control-row');
        if (!row || row.querySelector('.slider-reset-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'slider-reset-btn';
        btn.type = 'button';
        btn.setAttribute('data-tooltip', 'Reset to default');
        btn.setAttribute('aria-label', 'Reset to default');
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a4 4 0 1 1 0 8h-1"/></svg>';
        btn.addEventListener('click', () => {
            slider.value = slider.defaultValue;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        row.appendChild(btn);
    });
}

function ensureCustomTooltipElement() {
    if (customTooltipEl) return customTooltipEl;
    const el = document.createElement('div');
    el.className = 'custom-tooltip-floating';
    el.setAttribute('role', 'tooltip');
    document.body.appendChild(el);
    customTooltipEl = el;
    return el;
}

function migrateTitleToCustomTooltip(root = document) {
    if (!root || !root.querySelectorAll) return;

    root.querySelectorAll('[title]').forEach(el => {
        const title = el.getAttribute('title');
        if (!title) return;
        if (!el.hasAttribute('data-tooltip')) {
            el.setAttribute('data-tooltip', title);
        }
        if (!el.hasAttribute('aria-label') && (el.tagName === 'BUTTON' || el.tagName === 'A')) {
            el.setAttribute('aria-label', title);
        }
        el.removeAttribute('title');
    });

    if (root.matches && root.matches('[title]')) {
        const title = root.getAttribute('title');
        if (title) {
            if (!root.hasAttribute('data-tooltip')) {
                root.setAttribute('data-tooltip', title);
            }
            if (!root.hasAttribute('aria-label') && (root.tagName === 'BUTTON' || root.tagName === 'A')) {
                root.setAttribute('aria-label', title);
            }
            root.removeAttribute('title');
        }
    }
}

function hideCustomTooltip() {
    if (!customTooltipEl) return;
    customTooltipEl.classList.remove('visible', 'bottom', 'left-align');
    customTooltipVisible = false;
}

function positionCustomTooltip(target) {
    if (!target || !customTooltipEl) return;

    const rect = target.getBoundingClientRect();
    const margin = 8;
    let placeBottom = target.getAttribute('data-tooltip-pos') === 'bottom';
    const alignLeft = target.getAttribute('data-tooltip-align') === 'left';

    customTooltipEl.classList.toggle('bottom', placeBottom);
    customTooltipEl.classList.toggle('left-align', alignLeft);

    let left = alignLeft ? rect.left : rect.left + rect.width / 2;
    let top = placeBottom ? rect.bottom + margin : rect.top - margin;

    customTooltipEl.style.left = `${Math.round(left)}px`;
    customTooltipEl.style.top = `${Math.round(top)}px`;

    let tooltipRect = customTooltipEl.getBoundingClientRect();
    const minX = 8;
    const maxX = window.innerWidth - 8;
    if (tooltipRect.left < minX) {
        left += (minX - tooltipRect.left);
    } else if (tooltipRect.right > maxX) {
        left -= (tooltipRect.right - maxX);
    }

    if (!placeBottom && tooltipRect.top < 8) {
        placeBottom = true;
        top = rect.bottom + margin;
        customTooltipEl.classList.add('bottom');
    } else if (placeBottom && tooltipRect.bottom > window.innerHeight - 8) {
        placeBottom = false;
        top = rect.top - margin;
        customTooltipEl.classList.remove('bottom');
    }

    customTooltipEl.style.left = `${Math.round(left)}px`;
    customTooltipEl.style.top = `${Math.round(top)}px`;
}

function showCustomTooltip(target) {
    const text = target?.getAttribute('data-tooltip');
    if (!target || !text) return;

    const el = ensureCustomTooltipElement();
    el.textContent = text;
    el.classList.add('visible');
    customTooltipVisible = true;
    positionCustomTooltip(target);
}

function setupCustomTooltips() {
    migrateTitleToCustomTooltip(document);
    ensureCustomTooltipElement();

    if (!tooltipMutationObserver) {
        tooltipMutationObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
                    migrateTitleToCustomTooltip(mutation.target);
                }

                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            migrateTitleToCustomTooltip(node);
                        }
                    });
                }
            });
        });

        tooltipMutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['title']
        });
    }

    document.addEventListener('mouseover', event => {
        const target = event.target.closest('[data-tooltip]');
        if (target === customTooltipTarget) return;

        clearTimeout(customTooltipTimer);
        hideCustomTooltip();
        customTooltipTarget = target;

        if (!target) return;

        customTooltipTimer = setTimeout(() => {
            if (customTooltipTarget === target) {
                showCustomTooltip(target);
            }
        }, 1000);
    });

    document.addEventListener('mouseout', event => {
        if (!customTooltipTarget) return;

        const leftTarget = event.target.closest('[data-tooltip]');
        if (leftTarget !== customTooltipTarget) return;

        if (event.relatedTarget && customTooltipTarget.contains(event.relatedTarget)) {
            return;
        }

        clearTimeout(customTooltipTimer);
        customTooltipTarget = null;
        hideCustomTooltip();
    });

    document.addEventListener('scroll', () => {
        hideCustomTooltip();
    }, true);

    document.addEventListener('mousedown', () => {
        clearTimeout(customTooltipTimer);
        hideCustomTooltip();
    });

    document.addEventListener('keydown', () => {
        clearTimeout(customTooltipTimer);
        hideCustomTooltip();
    });

    window.addEventListener('resize', () => {
        if (customTooltipVisible && customTooltipTarget) {
            positionCustomTooltip(customTooltipTarget);
        }
    });
}

// Format number to at most 1 decimal place
function formatValue(num) {
    const rounded = Math.round(num * 10) / 10;
    return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

function normalizeGradientColor(color, fallback = '#667eea') {
    if (typeof color !== 'string') return fallback;
    const value = color.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value;
    const shortMatch = value.match(/^#([0-9A-Fa-f]{3})$/);
    if (!shortMatch) return fallback;
    const expanded = shortMatch[1].split('').map(ch => ch + ch).join('');
    return `#${expanded}`;
}

function normalizeGradientStopsForPreset(stops) {
    const fallback = [
        { color: '#667eea', position: 0 },
        { color: '#764ba2', position: 100 }
    ];
    if (!Array.isArray(stops) || stops.length < 2) return fallback;

    const normalized = stops
        .map((stop, index) => ({
            color: normalizeGradientColor(stop?.color, fallback[Math.min(index, fallback.length - 1)].color),
            position: Math.max(0, Math.min(100, Number(stop?.position ?? (index === 0 ? 0 : 100))))
        }))
        .sort((a, b) => a.position - b.position);

    normalized[0].position = 0;
    normalized[normalized.length - 1].position = 100;
    return normalized;
}

function gradientToCssString(gradient) {
    const angle = Math.max(0, Math.min(360, Math.round(Number(gradient?.angle ?? 135))));
    const stops = normalizeGradientStopsForPreset(gradient?.stops);
    return `linear-gradient(${angle}deg, ${stops.map(stop => `${stop.color} ${Math.round(stop.position)}%`).join(', ')})`;
}

function gradientPresetKey(gradientCss) {
    return String(gradientCss || '').replace(/\s+/g, '').toLowerCase();
}

function collectUsedGradientCssList() {
    const gradients = [];

    if (state.defaults?.background?.type === 'gradient' && state.defaults.background.gradient) {
        gradients.push(gradientToCssString(state.defaults.background.gradient));
    }

    state.screenshots.forEach((screenshot) => {
        if (screenshot?.background?.type === 'gradient' && screenshot.background.gradient) {
            gradients.push(gradientToCssString(screenshot.background.gradient));
        }
    });

    return gradients;
}

function updateUsedGradientPresets() {
    const presetContainer = document.getElementById('gradient-presets');
    if (!presetContainer) return;

    presetContainer.querySelectorAll('.preset-swatch[data-used-gradient="true"]').forEach(node => node.remove());

    const existingKeys = new Set(
        Array.from(presetContainer.querySelectorAll('.preset-swatch')).map(node => gradientPresetKey(node.dataset.gradient))
    );

    const addedKeys = new Set();
    const usedGradients = collectUsedGradientCssList();

    usedGradients.forEach((gradientCss) => {
        const key = gradientPresetKey(gradientCss);
        if (!key || existingKeys.has(key) || addedKeys.has(key)) return;

        const swatch = document.createElement('div');
        swatch.className = 'preset-swatch';
        swatch.dataset.usedGradient = 'true';
        swatch.dataset.gradient = gradientCss;
        swatch.title = 'Used Gradient';
        swatch.style.background = gradientCss;
        presetContainer.prepend(swatch);

        addedKeys.add(key);
    });
}

function setBackground(key, value) {
    const screenshot = getCurrentScreenshot();
    if (screenshot) {
        if (key.includes('.')) {
            const parts = key.split('.');
            let obj = screenshot.background;
            for (let i = 0; i < parts.length - 1; i++) {
                obj = obj[parts[i]];
            }
            obj[parts[parts.length - 1]] = value;
        } else {
            screenshot.background[key] = value;
        }
    }
}

function setScreenshotSetting(key, value) {
    const screenshot = getCurrentScreenshot();
    if (screenshot) {
        if (key.includes('.')) {
            const parts = key.split('.');
            let obj = screenshot.screenshot;
            for (let i = 0; i < parts.length - 1; i++) {
                obj = obj[parts[i]];
            }
            obj[parts[parts.length - 1]] = value;
        } else {
            screenshot.screenshot[key] = value;
        }
    }
}

function setTextSetting(key, value) {
    const screenshot = getCurrentScreenshot();
    if (screenshot) {
        screenshot.text[key] = value;
    }
}

function setCurrentScreenshotAsDefault() {
    const screenshot = getCurrentScreenshot();
    if (screenshot) {
        state.defaults.background = JSON.parse(JSON.stringify(screenshot.background));
        state.defaults.screenshot = JSON.parse(JSON.stringify(screenshot.screenshot));
        state.defaults.text = JSON.parse(JSON.stringify(screenshot.text));
    }
}

