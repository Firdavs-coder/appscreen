function updateCanvas(options = {}) {
    const skipSave = !!options.skipSave;
    const skipInlinePreviews = !!options.skipInlinePreviews;

    // During dragging, queue render for next frame instead of rendering immediately
    if (isDragging && !options.forceImmediate) {
        if (renderFrameScheduled) return;
        renderFrameScheduled = true;
        requestAnimationFrame(() => {
            renderFrameScheduled = false;
            updateCanvas({ ...options, forceImmediate: true });
        });
        return;
    }

    if (!skipSave) {
        syncUnsavedChanges();
    }
    const dims = getCanvasDimensions();
    canvas.width = dims.width;
    canvas.height = dims.height;

    // Scale for preview - fit to available canvas area height
    const canvasAreaEl = document.querySelector('.canvas-area');
    const availableHeight = canvasAreaEl ? canvasAreaEl.clientHeight - 40 : 630; // 40px for padding
    const availableWidth = 400;
    const scale = Math.min(availableWidth / dims.width, availableHeight / dims.height);
    canvas.style.width = (dims.width * scale) + 'px';
    canvas.style.height = (dims.height * scale) + 'px';

    // Empty state: don't render the default gradient screen
    if (state.screenshots.length === 0) {
        setCanvasLoading(isInitialLoadInProgress);
        ctx.clearRect(0, 0, dims.width, dims.height);
        hideCanvasSelectionToolbar();
        if (!skipInlinePreviews) {
            updateInlinePreviews();
        }
        return;
    }

    const screenshotsStillLoading = state.screenshots.some((screenshot) =>
        typeof isScreenshotImageLoading === 'function' && isScreenshotImageLoading(screenshot)
    );
    setCanvasLoading(isInitialLoadInProgress || screenshotsStillLoading);

    // Draw background
    drawBackground();

    // Draw noise overlay on background if enabled
    if (getBackground().noise) {
        drawNoise();
    }

    // Elements behind screenshot
    drawElements(ctx, dims, 'behind-screenshot');

    // Draw screenshot (2D mode) or 3D phone model
    if (state.screenshots.length > 0) {
        const screenshot = state.screenshots[state.selectedIndex];
        const img = screenshot ? getScreenshotImage(screenshot) : null;
        const ss = getScreenshotSettings();
        const use3D = ss.use3D || false;
        if (use3D && img && typeof renderThreeJSToCanvas === 'function' && phoneModelLoaded) {
            // In 3D mode, update the screen texture and render the phone model
            if (typeof updateScreenTexture === 'function') {
                updateScreenTexture();
            }
            renderThreeJSToCanvas(canvas, dims.width, dims.height);
        } else if (!use3D) {
            // In 2D mode, draw the screenshot normally
            drawScreenshot();
        }
    }

    // Elements above screenshot but behind text
    drawElements(ctx, dims, 'above-screenshot');

    // Draw popouts (cropped regions from source image)
    drawPopouts(ctx, dims);

    // Draw text
    drawText();

    // Elements above text
    drawElements(ctx, dims, 'above-text');

    // Hover highlight for canvas items
    drawCanvasHoverOutline();
    updateCanvasSelectionToolbar();

    // Update all inline previews
    if (!skipInlinePreviews) {
        updateInlinePreviews();
    }
}

function updateInlinePreviews() {
    // Skip inline preview rendering during dragging for performance
    if (isDragging) return;

    const dims = getCanvasDimensions();
    // Compute preview scale dynamically from available canvas area height
    const canvasAreaEl = document.querySelector('.canvas-area');
    const availableHeight = canvasAreaEl ? canvasAreaEl.clientHeight - 40 : 630;
    const availableWidth = 400;
    const previewScale = Math.min(availableWidth / dims.width, availableHeight / dims.height);

    // Initialize Three.js if any screenshot uses 3D mode
    const any3D = state.screenshots.some(s => s.screenshot?.use3D);
    if (any3D && typeof showThreeJS === 'function') {
        showThreeJS(true);
    }

    // Hide all legacy side previews
    sidePreviewLeft.classList.add('hidden');
    sidePreviewRight.classList.add('hidden');
    sidePreviewFarLeft.classList.add('hidden');
    sidePreviewFarRight.classList.add('hidden');

    // Remove old inline wrappers (keep the original canvas-wrapper for the selected)
    const existingInline = previewStrip.querySelectorAll('.canvas-wrapper-inline');
    existingInline.forEach(el => el.remove());

    if (state.screenshots.length <= 1) {
        // Single or no screenshot - just show the main canvas wrapper
        canvasWrapper.style.display = '';
        canvasWrapper.classList.toggle('selected', state.screenshots.length === 1);
        return;
    }

    // Keep the original selected canvas-wrapper visible and interactive (drag/edit target)
    canvasWrapper.style.display = '';
    canvasWrapper.classList.add('selected');

    // Render all non-selected screenshots as inline wrappers
    state.screenshots.forEach((screenshot, index) => {
        if (index === state.selectedIndex) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-wrapper canvas-wrapper-inline';
        wrapper.dataset.index = index;
        bindMediaDropTarget(wrapper, () => index);

        const inlineCanvas = document.createElement('canvas');
        const inlineCtx = inlineCanvas.getContext('2d');

        renderScreenshotToCanvas(index, inlineCanvas, inlineCtx, dims, previewScale);

        wrapper.appendChild(inlineCanvas);

        // Click to select
        wrapper.addEventListener('click', (e) => {
            // Don't interfere with context menu
            if (e.button !== 0) return;
            selectInlineScreenshot(index);
        });

        // Right-click context menu
        wrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            selectInlineScreenshot(index);
            openCanvasContextMenu(e.clientX, e.clientY, index);
        });

        // Keep visual order around the selected (main) wrapper
        if (index < state.selectedIndex) {
            previewStrip.insertBefore(wrapper, canvasWrapper);
        } else {
            previewStrip.appendChild(wrapper);
        }
    });
}

function selectInlineScreenshot(index) {
    if (index === state.selectedIndex) return;
    
    state.selectedIndex = index;
    updateScreenshotList();
    syncUIWithState();
    setSelectedCanvasTarget({ type: 'screenshot' }, { skipCanvasRefresh: true });
    updateGradientStopsUI();
    
    // Update 3D texture if needed
    const ss = getScreenshotSettings();
    if (ss.use3D && typeof updateScreenTexture === 'function') {
        updateScreenTexture();
    }
    
    updateCanvas();
}

// Keep slideToScreenshot as a simple redirect for keyboard/swipe navigation
function slideToScreenshot(newIndex, direction) {
    if (newIndex < 0 || newIndex >= state.screenshots.length) return;
    selectInlineScreenshot(newIndex);
}

function renderScreenshotToCanvas(index, targetCanvas, targetCtx, dims, previewScale) {
    const screenshot = state.screenshots[index];
    if (!screenshot) return;

    // Get localized image for current language
    const img = getScreenshotImage(screenshot);

    // Set canvas size (this also clears the canvas)
    targetCanvas.width = dims.width;
    targetCanvas.height = dims.height;
    targetCanvas.style.width = (dims.width * previewScale) + 'px';
    targetCanvas.style.height = (dims.height * previewScale) + 'px';

    // Clear canvas explicitly
    targetCtx.clearRect(0, 0, dims.width, dims.height);

    // Draw background for this screenshot
    const bg = screenshot.background;
    drawBackgroundToContext(targetCtx, dims, bg);

    // Draw noise if enabled
    if (bg.noise) {
        drawNoiseToContext(targetCtx, dims, bg.noiseIntensity);
    }

    const elements = screenshot.elements || [];

    // Elements behind screenshot
    drawElementsToContext(targetCtx, dims, elements, 'behind-screenshot');

    // Draw screenshot - 3D if active for this screenshot, otherwise 2D
    const settings = screenshot.screenshot;
    const use3D = settings.use3D || false;

    if (img) {
        if (use3D && typeof renderThreeJSForScreenshot === 'function' && phoneModelLoaded) {
            // Render 3D phone model for this specific screenshot
            renderThreeJSForScreenshot(targetCanvas, dims.width, dims.height, index);
        } else {
            // Draw 2D screenshot using localized image
            drawScreenshotToContext(targetCtx, dims, img, settings);
        }
    }

    // Elements above screenshot
    drawElementsToContext(targetCtx, dims, elements, 'above-screenshot');

    // Draw popouts
    const popouts = screenshot.popouts || [];
    drawPopoutsToContext(targetCtx, dims, popouts, img, settings);

    // Draw text
    const txt = screenshot.text;
    drawTextToContext(targetCtx, dims, txt);

    // Elements above text
    drawElementsToContext(targetCtx, dims, elements, 'above-text');
}

function drawBackgroundToContext(context, dims, bg) {
    if (bg.type === 'gradient') {
        const angle = bg.gradient.angle * Math.PI / 180;
        const x1 = dims.width / 2 - Math.cos(angle) * dims.width;
        const y1 = dims.height / 2 - Math.sin(angle) * dims.height;
        const x2 = dims.width / 2 + Math.cos(angle) * dims.width;
        const y2 = dims.height / 2 + Math.sin(angle) * dims.height;

        const gradient = context.createLinearGradient(x1, y1, x2, y2);
        bg.gradient.stops.forEach(stop => {
            gradient.addColorStop(stop.position / 100, stop.color);
        });

        context.fillStyle = gradient;
        context.fillRect(0, 0, dims.width, dims.height);
    } else if (bg.type === 'solid') {
        context.fillStyle = bg.solid;
        context.fillRect(0, 0, dims.width, dims.height);
    } else if (bg.type === 'image' && bg.image) {
        const img = bg.image;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        let dx = 0, dy = 0, dw = dims.width, dh = dims.height;

        if (bg.imageFit === 'cover') {
            const imgRatio = img.width / img.height;
            const canvasRatio = dims.width / dims.height;

            if (imgRatio > canvasRatio) {
                sw = img.height * canvasRatio;
                sx = (img.width - sw) / 2;
            } else {
                sh = img.width / canvasRatio;
                sy = (img.height - sh) / 2;
            }
        } else if (bg.imageFit === 'contain') {
            const imgRatio = img.width / img.height;
            const canvasRatio = dims.width / dims.height;

            if (imgRatio > canvasRatio) {
                dh = dims.width / imgRatio;
                dy = (dims.height - dh) / 2;
            } else {
                dw = dims.height * imgRatio;
                dx = (dims.width - dw) / 2;
            }

            context.fillStyle = '#000';
            context.fillRect(0, 0, dims.width, dims.height);
        }

        if (bg.imageBlur > 0) {
            context.filter = `blur(${bg.imageBlur}px)`;
        }

        context.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
        context.filter = 'none';

        if (bg.overlayOpacity > 0) {
            context.fillStyle = bg.overlayColor;
            context.globalAlpha = bg.overlayOpacity / 100;
            context.fillRect(0, 0, dims.width, dims.height);
            context.globalAlpha = 1;
        }
    }
}

function drawNoiseToContext(context, dims, intensity) {
    const imageData = context.getImageData(0, 0, dims.width, dims.height);
    const data = imageData.data;
    const noiseAmount = intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 255 * noiseAmount;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }

    context.putImageData(imageData, 0, 0);
}

function drawScreenshotToContext(context, dims, img, settings) {
    if (!img) return;

    const scale = settings.scale / 100;
    let imgWidth = dims.width * scale;
    let imgHeight = (img.height / img.width) * imgWidth;

    if (imgHeight > dims.height * scale) {
        imgHeight = dims.height * scale;
        imgWidth = (img.width / img.height) * imgHeight;
    }

    // Keep the original preset movement behavior
    const moveX = Math.max(dims.width - imgWidth, dims.width * 0.15);
    const moveY = Math.max(dims.height - imgHeight, dims.height * 0.15);
    const x = (dims.width - imgWidth) / 2 + (settings.x / 100 - 0.5) * moveX;
    const y = (dims.height - imgHeight) / 2 + (settings.y / 100 - 0.5) * moveY;

    const twoDModel = get2DDeviceModel(settings);
    const frameImage = ensure2DDeviceFrameImage(twoDModel);
    const modelLayout = twoDModel
        ? get2DDeviceLayoutForScreen(twoDModel, x, y, imgWidth, imgHeight, settings)
        : null;
    const has2DFrame = !!(modelLayout && frameImage);

    const drawX = has2DFrame ? modelLayout.screenX : x;
    const drawY = has2DFrame ? modelLayout.screenY : y;
    const drawWidth = has2DFrame ? modelLayout.screenWidth : imgWidth;
    const drawHeight = has2DFrame ? modelLayout.screenHeight : imgHeight;
    const radius = has2DFrame
        ? modelLayout.screenRadius
        : (settings.cornerRadius || 0) * (imgWidth / 400);

    const shadowX = has2DFrame ? modelLayout.frameX : drawX;
    const shadowY = has2DFrame ? modelLayout.frameY : drawY;
    const shadowWidth = has2DFrame ? modelLayout.frameWidth : drawWidth;
    const shadowHeight = has2DFrame ? modelLayout.frameHeight : drawHeight;
    const shadowRadius = has2DFrame ? modelLayout.frameRadius : radius;

    const centerX = x + imgWidth / 2;
    const centerY = y + imgHeight / 2;

    context.save();

    // Apply transformations
    context.translate(centerX, centerY);

    // Apply rotation
    if (settings.rotation !== 0) {
        context.rotate(settings.rotation * Math.PI / 180);
    }

    // Apply perspective (simulated with scale transform)
    if (settings.perspective !== 0) {
        context.transform(1, settings.perspective * 0.01, 0, 1, 0, 0);
    }

    context.translate(-centerX, -centerY);

    // Draw shadow first (needs a filled shape, not clipped)
    if (settings.shadow && settings.shadow.enabled) {
        const shadowOpacity = settings.shadow.opacity / 100;
        const shadowColor = settings.shadow.color + Math.round(shadowOpacity * 255).toString(16).padStart(2, '0');
        context.shadowColor = shadowColor;
        context.shadowBlur = settings.shadow.blur;
        context.shadowOffsetX = settings.shadow.x;
        context.shadowOffsetY = settings.shadow.y;

        // Draw filled rounded rect for shadow
        context.fillStyle = '#000';
        context.beginPath();
        addRoundedRectPath(context, shadowX, shadowY, shadowWidth, shadowHeight, shadowRadius);
        context.fill();

        // Reset shadow before drawing image
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
    }

    // Draw image.
    if (has2DFrame) {
        draw2DFramedScreenshotToRect(context, dims, img, modelLayout, frameImage);
    } else {
        context.beginPath();
        addRoundedRectPath(context, drawX, drawY, drawWidth, drawHeight, radius);
        context.clip();
        drawImageCoverToRect(context, img, drawX, drawY, drawWidth, drawHeight);
    }

    // Restore context to remove clip region before drawing frame
    context.restore();

    if (has2DFrame) {
        context.save();
        context.translate(centerX, centerY);
        if (settings.rotation !== 0) {
            context.rotate(settings.rotation * Math.PI / 180);
        }
        if (settings.perspective !== 0) {
            context.transform(1, settings.perspective * 0.01, 0, 1, 0, 0);
        }
        context.translate(-centerX, -centerY);
        context.drawImage(frameImage, modelLayout.frameX, modelLayout.frameY, modelLayout.frameWidth, modelLayout.frameHeight);
        context.restore();
    }

    // Draw device frame if enabled
    if (settings.frame && settings.frame.enabled) {
        context.save();
        context.translate(centerX, centerY);
        if (settings.rotation !== 0) {
            context.rotate(settings.rotation * Math.PI / 180);
        }
        if (settings.perspective !== 0) {
            context.transform(1, settings.perspective * 0.01, 0, 1, 0, 0);
        }
        context.translate(-centerX, -centerY);
        drawDeviceFrameToContext(context, drawX, drawY, drawWidth, drawHeight, settings);
        context.restore();
    }
}

function drawDeviceFrameToContext(context, x, y, width, height, settings) {
    const frameColor = settings.frame.color;
    const frameWidth = settings.frame.width * (width / 400);
    const frameOpacity = settings.frame.opacity / 100;
    const radius = (settings.cornerRadius || 0) * (width / 400) + frameWidth;

    context.globalAlpha = frameOpacity;
    context.strokeStyle = frameColor;
    context.lineWidth = frameWidth;
    context.beginPath();
    context.roundRect(x - frameWidth / 2, y - frameWidth / 2, width + frameWidth, height + frameWidth, radius);
    context.stroke();
    context.globalAlpha = 1;
}

function drawTextToContext(context, dims, txt) {
    // Check enabled states (default headline to true for backwards compatibility)
    const headlineEnabled = txt.headlineEnabled !== false;
    const subheadlineEnabled = txt.subheadlineEnabled || false;

    const headlineLang = txt.currentHeadlineLang || 'en';
    const subheadlineLang = txt.currentSubheadlineLang || 'en';
    const layoutLang = getTextLayoutLanguage(txt);
    const headlineLayout = getEffectiveLayout(txt, headlineLang);
    const subheadlineLayout = getEffectiveLayout(txt, subheadlineLang);
    const layoutSettings = getEffectiveLayout(txt, layoutLang);

    const headline = headlineEnabled && txt.headlines ? (txt.headlines[headlineLang] || '') : '';
    const subheadline = subheadlineEnabled && txt.subheadlines ? (txt.subheadlines[subheadlineLang] || '') : '';

    if (!headline && !subheadline) return;

    const padding = dims.width * 0.08;
    const textY = layoutSettings.position === 'top'
        ? dims.height * (layoutSettings.offsetY / 100)
        : dims.height * (1 - layoutSettings.offsetY / 100);

    context.textAlign = 'center';
    context.textBaseline = layoutSettings.position === 'top' ? 'top' : 'bottom';

    let currentY = textY;

    // Draw headline
    if (headline) {
        const fontStyle = txt.headlineItalic ? 'italic' : 'normal';
        context.font = `${fontStyle} ${txt.headlineWeight} ${headlineLayout.headlineSize}px ${txt.headlineFont}`;
        context.fillStyle = txt.headlineColor;

        const lines = wrapText(context, headline, dims.width - padding * 2);
        const lineHeight = headlineLayout.headlineSize * (layoutSettings.lineHeight / 100);

        // For bottom positioning, offset currentY so lines draw correctly
        if (layoutSettings.position === 'bottom') {
            currentY -= (lines.length - 1) * lineHeight;
        }

        let lastLineY;
        lines.forEach((line, i) => {
            const y = currentY + i * lineHeight;
            lastLineY = y;
            context.fillText(line, dims.width / 2, y);

            // Calculate text metrics for decorations
            const textWidth = context.measureText(line).width;
            const fontSize = headlineLayout.headlineSize;
            const lineThickness = Math.max(2, fontSize * 0.05);
            const x = dims.width / 2 - textWidth / 2;

            // Draw underline
            if (txt.headlineUnderline) {
                const underlineY = layoutSettings.position === 'top'
                    ? y + fontSize * 0.9
                    : y + fontSize * 0.1;
                context.fillRect(x, underlineY, textWidth, lineThickness);
            }

            // Draw strikethrough
            if (txt.headlineStrikethrough) {
                const strikeY = layoutSettings.position === 'top'
                    ? y + fontSize * 0.4
                    : y - fontSize * 0.4;
                context.fillRect(x, strikeY, textWidth, lineThickness);
            }
        });

        // Track where subheadline should start (below the bottom edge of headline)
        // The gap between headline and subheadline should be (lineHeight - fontSize)
        // This is the "extra" spacing beyond the text itself
        const gap = lineHeight - headlineLayout.headlineSize;
        if (layoutSettings.position === 'top') {
            // For top: lastLineY is top of last line, add fontSize to get bottom, then add gap
            currentY = lastLineY + headlineLayout.headlineSize + gap;
        } else {
            // For bottom: lastLineY is already the bottom of last line, just add gap
            currentY = lastLineY + gap;
        }
    }

    // Draw subheadline (always below headline visually)
    if (subheadline) {
        const subFontStyle = txt.subheadlineItalic ? 'italic' : 'normal';
        const subWeight = txt.subheadlineWeight || '400';
        context.font = `${subFontStyle} ${subWeight} ${subheadlineLayout.subheadlineSize}px ${txt.subheadlineFont || txt.headlineFont}`;
        context.fillStyle = hexToRgba(txt.subheadlineColor, txt.subheadlineOpacity / 100);

        const lines = wrapText(context, subheadline, dims.width - padding * 2);
        const subLineHeight = subheadlineLayout.subheadlineSize * 1.4;

        // Subheadline starts after headline with gap determined by headline lineHeight
        // For bottom position, switch to 'top' baseline so subheadline draws downward
        const subY = currentY;
        if (layoutSettings.position === 'bottom') {
            context.textBaseline = 'top';
        }

        lines.forEach((line, i) => {
            const y = subY + i * subLineHeight;
            context.fillText(line, dims.width / 2, y);

            // Calculate text metrics for decorations
            const textWidth = context.measureText(line).width;
            const fontSize = subheadlineLayout.subheadlineSize;
            const lineThickness = Math.max(2, fontSize * 0.05);
            const x = dims.width / 2 - textWidth / 2;

            // Draw underline (using 'top' baseline for subheadline)
            if (txt.subheadlineUnderline) {
                const underlineY = y + fontSize * 0.9;
                context.fillRect(x, underlineY, textWidth, lineThickness);
            }

            // Draw strikethrough
            if (txt.subheadlineStrikethrough) {
                const strikeY = y + fontSize * 0.4;
                context.fillRect(x, strikeY, textWidth, lineThickness);
            }
        });

        // Restore baseline if we changed it
        if (layoutSettings.position === 'bottom') {
            context.textBaseline = 'bottom';
        }
    }
}

// Draw elements for the current screenshot at a specific layer
function drawElements(context, dims, layer) {
    const elements = getElements();
    drawElementsToContext(context, dims, elements, layer);
}

function drawDeviceElementToContext(context, el, dims, elWidth) {
    if (!el?.image) return;

    const img = el.image;
    const aspect = img.height / img.width;
    const elHeight = elWidth * aspect;
    const x = -elWidth / 2;
    const y = -elHeight / 2;

    const style = el.deviceStyle || {};
    const shadow = style.shadow || { enabled: false };
    const frame = style.frame || { enabled: false };
    const cornerRadius = typeof style.cornerRadius === 'number' ? style.cornerRadius : 24;
    const radius = cornerRadius * (elWidth / 400);

    if (shadow.enabled) {
        context.save();
        context.shadowColor = hexToRgba(shadow.color || '#000000', (shadow.opacity ?? 30) / 100);
        context.shadowBlur = shadow.blur || 0;
        context.shadowOffsetX = shadow.x || 0;
        context.shadowOffsetY = shadow.y || 0;
        context.fillStyle = '#000';
        context.beginPath();
        context.roundRect(x, y, elWidth, elHeight, radius);
        context.fill();
        context.restore();
    }

    context.save();
    context.beginPath();
    context.roundRect(x, y, elWidth, elHeight, radius);
    context.clip();
    context.drawImage(img, x, y, elWidth, elHeight);
    context.restore();

    if (frame.enabled) {
        drawDeviceFrameToContext(context, x, y, elWidth, elHeight, {
            cornerRadius,
            frame: {
                enabled: true,
                color: frame.color || '#1d1d1f',
                width: frame.width ?? 12,
                opacity: frame.opacity ?? 100
            }
        });
    }
}

// Draw elements to any context (for side previews and export)
function drawElementsToContext(context, dims, elements, layer) {
    const filtered = elements.filter(el => el.layer === layer);
    filtered.forEach(el => {
        context.save();
        context.globalAlpha = el.opacity / 100;

        const cx = dims.width * (el.x / 100);
        const cy = dims.height * (el.y / 100);
        const elWidth = dims.width * (el.width / 100);

        context.translate(cx, cy);
        if (el.rotation !== 0) {
            context.rotate(el.rotation * Math.PI / 180);
        }

        if (el.type === 'emoji' && el.emoji) {
            const emojiSize = elWidth * 0.85;
            context.font = `${emojiSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(el.emoji, 0, 0);
        } else if (el.type === 'icon' && el.image) {
            // Shadow
            if (el.iconShadow?.enabled) {
                const s = el.iconShadow;
                const hex = s.color || '#000000';
                const r = parseInt(hex.slice(1,3), 16);
                const g = parseInt(hex.slice(3,5), 16);
                const b = parseInt(hex.slice(5,7), 16);
                context.shadowColor = `rgba(${r},${g},${b},${(s.opacity || 0) / 100})`;
                context.shadowBlur = s.blur || 0;
                context.shadowOffsetX = s.x || 0;
                context.shadowOffsetY = s.y || 0;
            }
            // Icons are square (1:1)
            context.drawImage(el.image, -elWidth / 2, -elWidth / 2, elWidth, elWidth);
            // Reset shadow
            if (el.iconShadow?.enabled) {
                context.shadowColor = 'transparent';
                context.shadowBlur = 0;
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 0;
            }
        } else if (el.type === 'device' && el.image) {
            drawDeviceElementToContext(context, el, dims, elWidth);
        } else if (el.type === 'graphic' && el.image) {
            const aspect = el.image.height / el.image.width;
            const elHeight = elWidth * aspect;
            context.drawImage(el.image, -elWidth / 2, -elHeight / 2, elWidth, elHeight);
        } else if (el.type === 'text') {
            const elText = getElementText(el);
            if (!elText) { context.restore(); return; }
            const fontStyle = el.italic ? 'italic' : 'normal';
            context.font = `${fontStyle} ${el.fontWeight} ${el.fontSize}px ${el.font}`;
            context.fillStyle = el.fontColor;
            context.textAlign = 'center';
            context.textBaseline = 'middle';

            // Word-wrap text within element width (respects manual line breaks)
            const lines = wrapText(context, elText, elWidth);
            const lineHeight = el.fontSize * 1.05;
            const totalHeight = (lines.length - 1) * lineHeight + el.fontSize;

            // Draw frame behind text if enabled
            if (el.frame && el.frame !== 'none') {
                drawElementFrame(context, el, dims, elWidth, totalHeight);
            }

            // Draw text lines
            const startY = -(totalHeight / 2) + el.fontSize / 2;
            lines.forEach((line, i) => {
                context.fillText(line, 0, startY + i * lineHeight);
            });
        }

        context.restore();
    });
}

// ===== Popout rendering =====
function drawPopouts(context, dims) {
    const screenshot = getCurrentScreenshot();
    if (!screenshot) return;
    const img = getScreenshotImage(screenshot);
    if (!img) return;
    const popouts = screenshot.popouts || [];
    const ss = getScreenshotSettings();
    drawPopoutsToContext(context, dims, popouts, img, ss);
}

function drawPopoutsToContext(context, dims, popouts, img, screenshotSettings) {
    if (!img || !popouts || popouts.length === 0) return;

    popouts.forEach(p => {
        context.save();
        context.globalAlpha = p.opacity / 100;

        // Crop from source image (percentages -> pixels)
        const sx = (p.cropX / 100) * img.width;
        const sy = (p.cropY / 100) * img.height;
        const sw = (p.cropWidth / 100) * img.width;
        const sh = (p.cropHeight / 100) * img.height;

        // Display position and size (percentages -> canvas pixels)
        const displayW = dims.width * (p.width / 100);
        const cropAspect = sh / sw;
        const displayH = displayW * cropAspect;
        const cx = dims.width * (p.x / 100);
        const cy = dims.height * (p.y / 100);

        context.translate(cx, cy);

        // Apply popout's own rotation only (no 3D transform inheritance)
        if (p.rotation !== 0) {
            context.rotate(p.rotation * Math.PI / 180);
        }

        const halfW = displayW / 2;
        const halfH = displayH / 2;
        const radius = p.cornerRadius * (displayW / 300);

        // Draw shadow
        if (p.shadow && p.shadow.enabled) {
            const shadowOpacity = p.shadow.opacity / 100;
            const hex = p.shadow.color || '#000000';
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            context.shadowColor = `rgba(${r},${g},${b},${shadowOpacity})`;
            context.shadowBlur = p.shadow.blur;
            context.shadowOffsetX = p.shadow.x;
            context.shadowOffsetY = p.shadow.y;

            context.fillStyle = '#000';
            context.beginPath();
            context.roundRect(-halfW, -halfH, displayW, displayH, radius);
            context.fill();

            context.shadowColor = 'transparent';
            context.shadowBlur = 0;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;
        }

        // Draw border behind the image
        if (p.border && p.border.enabled) {
            const bw = p.border.width;
            context.save();
            context.globalAlpha = (p.opacity / 100) * (p.border.opacity / 100);
            context.fillStyle = p.border.color;
            context.beginPath();
            context.roundRect(-halfW - bw, -halfH - bw, displayW + bw * 2, displayH + bw * 2, radius + bw);
            context.fill();
            context.restore();
        }

        // Clip and draw cropped image
        context.beginPath();
        context.roundRect(-halfW, -halfH, displayW, displayH, radius);
        context.clip();
        context.drawImage(img, sx, sy, sw, sh, -halfW, -halfH, displayW, displayH);

        context.restore();
    });
}

// Draw decorative frames around text elements
function drawElementFrame(context, el, dims, textWidth, textHeight) {
    const scale = el.frameScale / 100;
    const padding = el.fontSize * 0.4 * scale;
    // Measure the widest line (using wrapText to match rendering)
    const elWidth = dims.width * (el.width / 100);
    const lines = wrapText(context, getElementText(el), elWidth);
    const maxLineW = Math.max(...lines.map(l => context.measureText(l).width));
    const frameW = maxLineW + padding * 2;
    const frameH = textHeight + padding * 2;

    context.save();
    context.strokeStyle = el.frameColor;
    context.fillStyle = 'none';
    context.lineWidth = Math.max(2, el.fontSize * 0.04) * scale;

    const isLaurel = el.frame.startsWith('laurel-');
    const hasStar = el.frame.endsWith('-star');

    if (isLaurel) {
        const variant = el.frame.includes('detailed') ? 'laurel-detailed-left' : 'laurel-simple-left';
        drawLaurelSVG(context, variant, frameW, frameH, scale, el.frameColor);
        if (hasStar) {
            drawStar(context, 0, -frameH / 2 - el.fontSize * 0.2 * scale, el.fontSize * 0.3 * scale, el.frameColor);
        }
    } else if (el.frame === 'badge-circle') {
        context.beginPath();
        const radius = Math.max(frameW, frameH) / 2 + padding * 0.5;
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.stroke();
    } else if (el.frame === 'badge-ribbon') {
        const sw = frameW + padding;
        const sh = frameH + padding * 1.5;
        context.beginPath();
        context.moveTo(-sw / 2, -sh / 2);
        context.lineTo(sw / 2, -sh / 2);
        context.lineTo(sw / 2, sh / 2 - padding);
        context.lineTo(0, sh / 2);
        context.lineTo(-sw / 2, sh / 2 - padding);
        context.closePath();
        context.stroke();
    }

    context.restore();
}

// Draw laurel wreath using SVG image — left branch + mirrored right branch
function drawLaurelSVG(context, variant, w, h, scale, color) {
    const img = laurelImages[variant];
    if (!img || !img.complete || !img.naturalWidth) return;

    // Scale SVG branch to match the frame height
    const branchH = h * 1.1 * scale;
    const aspect = img.naturalWidth / img.naturalHeight;
    const branchW = branchH * aspect;

    // The SVG is black fill — use a temp canvas to recolor it
    const tmp = document.createElement('canvas');
    tmp.width = Math.ceil(branchW);
    tmp.height = Math.ceil(branchH);
    const tctx = tmp.getContext('2d');

    // Draw the SVG scaled into the temp canvas
    tctx.drawImage(img, 0, 0, branchW, branchH);

    // Recolor: draw color on top using source-in composite
    tctx.globalCompositeOperation = 'source-in';
    tctx.fillStyle = color;
    tctx.fillRect(0, 0, branchW, branchH);

    // Position: left branch sits to the left of the text area
    const gap = 2 * scale;
    const leftX = -w / 2 - branchW - gap;
    const topY = -branchH / 2;

    // Draw left branch
    context.drawImage(tmp, leftX, topY, branchW, branchH);

    // Draw right branch (mirrored horizontally)
    context.save();
    context.scale(-1, 1);
    context.drawImage(tmp, leftX, topY, branchW, branchH);
    context.restore();
}

// Draw a 5-point star
function drawStar(context, cx, cy, size, color) {
    context.save();
    context.fillStyle = color;
    context.beginPath();
    for (let i = 0; i < 5; i++) {
        const outer = (i * 2 * Math.PI / 5) - Math.PI / 2;
        const inner = outer + Math.PI / 5;
        const ox = cx + Math.cos(outer) * size;
        const oy = cy + Math.sin(outer) * size;
        const ix = cx + Math.cos(inner) * size * 0.4;
        const iy = cy + Math.sin(inner) * size * 0.4;
        if (i === 0) context.moveTo(ox, oy);
        else context.lineTo(ox, oy);
        context.lineTo(ix, iy);
    }
    context.closePath();
    context.fill();
    context.restore();
}

function drawBackground() {
    const dims = getCanvasDimensions();
    const bg = getBackground();

    if (bg.type === 'gradient') {
        const angle = bg.gradient.angle * Math.PI / 180;
        const x1 = dims.width / 2 - Math.cos(angle) * dims.width;
        const y1 = dims.height / 2 - Math.sin(angle) * dims.height;
        const x2 = dims.width / 2 + Math.cos(angle) * dims.width;
        const y2 = dims.height / 2 + Math.sin(angle) * dims.height;

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        bg.gradient.stops.forEach(stop => {
            gradient.addColorStop(stop.position / 100, stop.color);
        });

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, dims.width, dims.height);
    } else if (bg.type === 'solid') {
        ctx.fillStyle = bg.solid;
        ctx.fillRect(0, 0, dims.width, dims.height);
    } else if (bg.type === 'image' && bg.image) {
        const img = bg.image;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        let dx = 0, dy = 0, dw = dims.width, dh = dims.height;

        if (bg.imageFit === 'cover') {
            const imgRatio = img.width / img.height;
            const canvasRatio = dims.width / dims.height;

            if (imgRatio > canvasRatio) {
                sw = img.height * canvasRatio;
                sx = (img.width - sw) / 2;
            } else {
                sh = img.width / canvasRatio;
                sy = (img.height - sh) / 2;
            }
        } else if (bg.imageFit === 'contain') {
            const imgRatio = img.width / img.height;
            const canvasRatio = dims.width / dims.height;

            if (imgRatio > canvasRatio) {
                dh = dims.width / imgRatio;
                dy = (dims.height - dh) / 2;
            } else {
                dw = dims.height * imgRatio;
                dx = (dims.width - dw) / 2;
            }

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, dims.width, dims.height);
        }

        if (bg.imageBlur > 0) {
            ctx.filter = `blur(${bg.imageBlur}px)`;
        }

        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
        ctx.filter = 'none';

        // Overlay
        if (bg.overlayOpacity > 0) {
            ctx.fillStyle = bg.overlayColor;
            ctx.globalAlpha = bg.overlayOpacity / 100;
            ctx.fillRect(0, 0, dims.width, dims.height);
            ctx.globalAlpha = 1;
        }
    }
}

function drawScreenshot() {
    const dims = getCanvasDimensions();
    const screenshot = state.screenshots[state.selectedIndex];
    if (!screenshot) return;

    // Use localized image based on current language
    const img = getScreenshotImage(screenshot);
    if (!img) return;

    const settings = getScreenshotSettings();
    const scale = settings.scale / 100;

    // Calculate scaled dimensions
    let imgWidth = dims.width * scale;
    let imgHeight = (img.height / img.width) * imgWidth;

    // If image is taller than canvas after scaling, adjust
    if (imgHeight > dims.height * scale) {
        imgHeight = dims.height * scale;
        imgWidth = (img.width / img.height) * imgHeight;
    }

    // Keep the original preset movement behavior
    const moveX = Math.max(dims.width - imgWidth, dims.width * 0.15);
    const moveY = Math.max(dims.height - imgHeight, dims.height * 0.15);
    const x = (dims.width - imgWidth) / 2 + (settings.x / 100 - 0.5) * moveX;
    const y = (dims.height - imgHeight) / 2 + (settings.y / 100 - 0.5) * moveY;

    const twoDModel = get2DDeviceModel(settings);
    const frameImage = ensure2DDeviceFrameImage(twoDModel);
    const modelLayout = twoDModel
        ? get2DDeviceLayoutForScreen(twoDModel, x, y, imgWidth, imgHeight, settings)
        : null;
    const has2DFrame = !!(modelLayout && frameImage);

    const drawX = has2DFrame ? modelLayout.screenX : x;
    const drawY = has2DFrame ? modelLayout.screenY : y;
    const drawWidth = has2DFrame ? modelLayout.screenWidth : imgWidth;
    const drawHeight = has2DFrame ? modelLayout.screenHeight : imgHeight;
    const radius = has2DFrame
        ? modelLayout.screenRadius
        : settings.cornerRadius * (imgWidth / 400);

    const shadowX = has2DFrame ? modelLayout.frameX : drawX;
    const shadowY = has2DFrame ? modelLayout.frameY : drawY;
    const shadowWidth = has2DFrame ? modelLayout.frameWidth : drawWidth;
    const shadowHeight = has2DFrame ? modelLayout.frameHeight : drawHeight;
    const shadowRadius = has2DFrame ? modelLayout.frameRadius : radius;

    // Center point for transformations
    const centerX = x + imgWidth / 2;
    const centerY = y + imgHeight / 2;

    ctx.save();

    // Apply transformations
    ctx.translate(centerX, centerY);

    // Apply rotation
    if (settings.rotation !== 0) {
        ctx.rotate(settings.rotation * Math.PI / 180);
    }

    // Apply perspective (simulated with scale transform)
    if (settings.perspective !== 0) {
        ctx.transform(1, settings.perspective * 0.01, 0, 1, 0, 0);
    }

    ctx.translate(-centerX, -centerY);

    // Draw shadow first (needs a filled shape, not clipped)
    if (settings.shadow.enabled) {
        const shadowColor = hexToRgba(settings.shadow.color, settings.shadow.opacity / 100);
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = settings.shadow.blur;
        ctx.shadowOffsetX = settings.shadow.x;
        ctx.shadowOffsetY = settings.shadow.y;

        // Draw filled rounded rect for shadow
        ctx.fillStyle = '#000';
        ctx.beginPath();
        addRoundedRectPath(ctx, shadowX, shadowY, shadowWidth, shadowHeight, shadowRadius);
        ctx.fill();

        // Reset shadow before drawing image
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    // Draw image.
    if (has2DFrame) {
        draw2DFramedScreenshotToRect(ctx, dims, img, modelLayout, frameImage);
    } else {
        ctx.beginPath();
        addRoundedRectPath(ctx, drawX, drawY, drawWidth, drawHeight, radius);
        ctx.clip();
        drawImageCoverToRect(ctx, img, drawX, drawY, drawWidth, drawHeight);
    }

    // Restore context to remove clip region before drawing frame
    ctx.restore();

    // Draw frame image on top (without clip region)
    if (has2DFrame) {
        ctx.save();
        ctx.translate(centerX, centerY);
        if (settings.rotation !== 0) {
            ctx.rotate(settings.rotation * Math.PI / 180);
        }
        if (settings.perspective !== 0) {
            ctx.transform(1, settings.perspective * 0.01, 0, 1, 0, 0);
        }
        ctx.translate(-centerX, -centerY);
        ctx.drawImage(frameImage, modelLayout.frameX, modelLayout.frameY, modelLayout.frameWidth, modelLayout.frameHeight);
        ctx.restore();
    }

    // Draw device frame if enabled (needs separate transform context)
    if (settings.frame.enabled) {
        ctx.save();
        ctx.translate(centerX, centerY);
        if (settings.rotation !== 0) {
            ctx.rotate(settings.rotation * Math.PI / 180);
        }
        if (settings.perspective !== 0) {
            ctx.transform(1, settings.perspective * 0.01, 0, 1, 0, 0);
        }
        ctx.translate(-centerX, -centerY);
        drawDeviceFrame(drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
    }
}

function drawDeviceFrame(x, y, width, height) {
    const settings = getScreenshotSettings();
    const frameColor = settings.frame.color;
    const frameWidth = settings.frame.width * (width / 400); // Scale with image
    const frameOpacity = settings.frame.opacity / 100;
    const radius = settings.cornerRadius * (width / 400) + frameWidth;

    ctx.globalAlpha = frameOpacity;
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = frameWidth;
    ctx.beginPath();
    roundRect(ctx, x - frameWidth / 2, y - frameWidth / 2, width + frameWidth, height + frameWidth, radius);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function drawText() {
    const dims = getCanvasDimensions();
    const text = getTextSettings();

    // Check enabled states (default headline to true for backwards compatibility)
    const headlineEnabled = text.headlineEnabled !== false;
    const subheadlineEnabled = text.subheadlineEnabled || false;

    const headlineLang = text.currentHeadlineLang || 'en';
    const subheadlineLang = text.currentSubheadlineLang || 'en';
    const layoutLang = getTextLayoutLanguage(text);
    const headlineLayout = getEffectiveLayout(text, headlineLang);
    const subheadlineLayout = getEffectiveLayout(text, subheadlineLang);
    const layoutSettings = getEffectiveLayout(text, layoutLang);

    // Get current language text (only if enabled)
    const headline = headlineEnabled && text.headlines ? (text.headlines[headlineLang] || '') : '';
    const subheadline = subheadlineEnabled && text.subheadlines ? (text.subheadlines[subheadlineLang] || '') : '';

    if (!headline && !subheadline) return;

    const padding = dims.width * 0.08;
    const textY = layoutSettings.position === 'top'
        ? dims.height * (layoutSettings.offsetY / 100)
        : dims.height * (1 - layoutSettings.offsetY / 100);

    ctx.textAlign = 'center';
    ctx.textBaseline = layoutSettings.position === 'top' ? 'top' : 'bottom';

    let currentY = textY;

    // Draw headline
    if (headline) {
        const fontStyle = text.headlineItalic ? 'italic' : 'normal';
        ctx.font = `${fontStyle} ${text.headlineWeight} ${headlineLayout.headlineSize}px ${text.headlineFont}`;
        ctx.fillStyle = text.headlineColor;

        const lines = wrapText(ctx, headline, dims.width - padding * 2);
        const lineHeight = headlineLayout.headlineSize * (layoutSettings.lineHeight / 100);

        if (layoutSettings.position === 'bottom') {
            currentY -= (lines.length - 1) * lineHeight;
        }

        let lastLineY;
        lines.forEach((line, i) => {
            const y = currentY + i * lineHeight;
            lastLineY = y;
            ctx.fillText(line, dims.width / 2, y);

            // Calculate text metrics for decorations
            // When textBaseline is 'top', y is at top of text; when 'bottom', y is at bottom
            const textWidth = ctx.measureText(line).width;
            const fontSize = headlineLayout.headlineSize;
            const lineThickness = Math.max(2, fontSize * 0.05);
            const x = dims.width / 2 - textWidth / 2;

            // Draw underline
            if (text.headlineUnderline) {
                const underlineY = layoutSettings.position === 'top'
                    ? y + fontSize * 0.9  // Below text when baseline is top
                    : y + fontSize * 0.1; // Below text when baseline is bottom
                ctx.fillRect(x, underlineY, textWidth, lineThickness);
            }

            // Draw strikethrough
            if (text.headlineStrikethrough) {
                const strikeY = layoutSettings.position === 'top'
                    ? y + fontSize * 0.4  // Middle of text when baseline is top
                    : y - fontSize * 0.4; // Middle of text when baseline is bottom
                ctx.fillRect(x, strikeY, textWidth, lineThickness);
            }
        });

        // Track where subheadline should start (below the bottom edge of headline)
        // The gap between headline and subheadline should be (lineHeight - fontSize)
        // This is the "extra" spacing beyond the text itself
        const gap = lineHeight - headlineLayout.headlineSize;
        if (layoutSettings.position === 'top') {
            // For top: lastLineY is top of last line, add fontSize to get bottom, then add gap
            currentY = lastLineY + headlineLayout.headlineSize + gap;
        } else {
            // For bottom: lastLineY is already the bottom of last line, just add gap
            currentY = lastLineY + gap;
        }
    }

    // Draw subheadline (always below headline visually)
    if (subheadline) {
        const subFontStyle = text.subheadlineItalic ? 'italic' : 'normal';
        const subWeight = text.subheadlineWeight || '400';
        ctx.font = `${subFontStyle} ${subWeight} ${subheadlineLayout.subheadlineSize}px ${text.subheadlineFont || text.headlineFont}`;
        ctx.fillStyle = hexToRgba(text.subheadlineColor, text.subheadlineOpacity / 100);

        const lines = wrapText(ctx, subheadline, dims.width - padding * 2);
        const subLineHeight = subheadlineLayout.subheadlineSize * 1.4;

        // Subheadline starts after headline with gap determined by headline lineHeight
        // For bottom position, switch to 'top' baseline so subheadline draws downward
        const subY = currentY;
        if (layoutSettings.position === 'bottom') {
            ctx.textBaseline = 'top';
        }

        lines.forEach((line, i) => {
            const y = subY + i * subLineHeight;
            ctx.fillText(line, dims.width / 2, y);

            // Calculate text metrics for decorations
            const textWidth = ctx.measureText(line).width;
            const fontSize = subheadlineLayout.subheadlineSize;
            const lineThickness = Math.max(2, fontSize * 0.05);
            const x = dims.width / 2 - textWidth / 2;

            // Draw underline (using 'top' baseline for subheadline)
            if (text.subheadlineUnderline) {
                const underlineY = y + fontSize * 0.9;
                ctx.fillRect(x, underlineY, textWidth, lineThickness);
            }

            // Draw strikethrough
            if (text.subheadlineStrikethrough) {
                const strikeY = y + fontSize * 0.4;
                ctx.fillRect(x, strikeY, textWidth, lineThickness);
            }
        });

        // Restore baseline if we changed it
        if (layoutSettings.position === 'bottom') {
            ctx.textBaseline = 'bottom';
        }
    }
}

function drawNoise() {
    const dims = getCanvasDimensions();
    const imageData = ctx.getImageData(0, 0, dims.width, dims.height);
    const data = imageData.data;
    const intensity = getBackground().noiseIntensity / 100 * 50;

    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * intensity;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }

    ctx.putImageData(imageData, 0, 0);
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
    const lines = [];
    const rawLines = String(text).split(/\r?\n/);

    rawLines.forEach((rawLine) => {
        if (rawLine === '') {
            lines.push('');
            return;
        }

        const words = rawLine.split(' ');
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

    });

    return lines;
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function exportCurrent() {
    if (state.screenshots.length === 0) {
        await showAppAlert('Please upload a screenshot first', 'info');
        return;
    }

    // Ensure canvas is up-to-date (especially important for 3D mode)
    updateCanvas();

    const link = document.createElement('a');
    link.download = `screenshot-${state.selectedIndex + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

async function exportAll() {
    if (state.screenshots.length === 0) {
        await showAppAlert('Please upload screenshots first', 'info');
        return;
    }

    // Check if project has multiple languages configured
    const hasMultipleLanguages = state.projectLanguages.length > 1;

    if (hasMultipleLanguages) {
        // Show language choice dialog
        showExportLanguageDialog(async (choice) => {
            if (choice === 'current') {
                await exportAllForLanguage(state.currentLanguage);
            } else if (choice === 'all') {
                await exportAllLanguages();
            }
        });
    } else {
        // Only one language, export directly
        await exportAllForLanguage(state.currentLanguage);
    }
}

// Show export progress modal
function showExportProgress(status, detail, percent) {
    const modal = document.getElementById('export-progress-modal');
    const statusEl = document.getElementById('export-progress-status');
    const detailEl = document.getElementById('export-progress-detail');
    const fillEl = document.getElementById('export-progress-fill');

    if (modal) modal.classList.add('visible');
    if (statusEl) statusEl.textContent = status;
    if (detailEl) detailEl.textContent = detail || '';
    if (fillEl) fillEl.style.width = `${percent}%`;
}

// Hide export progress modal
function hideExportProgress() {
    const modal = document.getElementById('export-progress-modal');
    if (modal) modal.classList.remove('visible');
}

// Export all screenshots for a specific language
async function exportAllForLanguage(lang) {
    const originalIndex = state.selectedIndex;
    const originalLang = state.currentLanguage;
    const zip = new JSZip();
    const total = state.screenshots.length;

    // Show progress
    const langName = languageNames[lang] || lang.toUpperCase();
    showExportProgress('Exporting...', `Preparing ${langName} screenshots`, 0);

    // Save original text languages for each screenshot
    const originalTextLangs = state.screenshots.map(s => ({
        headline: s.text.currentHeadlineLang,
        subheadline: s.text.currentSubheadlineLang
    }));

    // Temporarily switch to the target language (images and text)
    state.currentLanguage = lang;
    state.screenshots.forEach(s => {
        s.text.currentHeadlineLang = lang;
        s.text.currentSubheadlineLang = lang;
    });

    for (let i = 0; i < state.screenshots.length; i++) {
        state.selectedIndex = i;
        updateCanvas();

        // Update progress
        const percent = Math.round(((i + 1) / total) * 90); // Reserve 10% for ZIP generation
        showExportProgress('Exporting...', `Screenshot ${i + 1} of ${total}`, percent);

        await new Promise(resolve => setTimeout(resolve, 100));

        // Get canvas data as base64, strip the data URL prefix
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

        zip.file(`screenshot-${i + 1}.png`, base64Data, { base64: true });
    }

    // Restore original settings
    state.selectedIndex = originalIndex;
    state.currentLanguage = originalLang;
    state.screenshots.forEach((s, i) => {
        s.text.currentHeadlineLang = originalTextLangs[i].headline;
        s.text.currentSubheadlineLang = originalTextLangs[i].subheadline;
    });
    updateCanvas();

    // Generate ZIP
    showExportProgress('Generating ZIP...', '', 95);
    const content = await zip.generateAsync({ type: 'blob' });

    showExportProgress('Complete!', '', 100);
    await new Promise(resolve => setTimeout(resolve, 1500));
    hideExportProgress();

    const link = document.createElement('a');
    link.download = `screenshots_${state.outputDevice}_${lang}.zip`;
    link.href = URL.createObjectURL(content);
    link.click();
    URL.revokeObjectURL(link.href);
}

// Export all screenshots for all languages (separate folders)
async function exportAllLanguages() {
    const originalIndex = state.selectedIndex;
    const originalLang = state.currentLanguage;
    const zip = new JSZip();

    const totalLangs = state.projectLanguages.length;
    const totalScreenshots = state.screenshots.length;
    const totalItems = totalLangs * totalScreenshots;
    let completedItems = 0;

    // Show progress
    showExportProgress('Exporting...', 'Preparing all languages', 0);

    // Save original text languages for each screenshot
    const originalTextLangs = state.screenshots.map(s => ({
        headline: s.text.currentHeadlineLang,
        subheadline: s.text.currentSubheadlineLang
    }));

    for (let langIdx = 0; langIdx < state.projectLanguages.length; langIdx++) {
        const lang = state.projectLanguages[langIdx];
        const langName = languageNames[lang] || lang.toUpperCase();

        // Temporarily switch to this language (images and text)
        state.currentLanguage = lang;
        state.screenshots.forEach(s => {
            s.text.currentHeadlineLang = lang;
            s.text.currentSubheadlineLang = lang;
        });

        for (let i = 0; i < state.screenshots.length; i++) {
            state.selectedIndex = i;
            updateCanvas();

            completedItems++;
            const percent = Math.round((completedItems / totalItems) * 90); // Reserve 10% for ZIP
            showExportProgress('Exporting...', `${langName}: Screenshot ${i + 1} of ${totalScreenshots}`, percent);

            await new Promise(resolve => setTimeout(resolve, 100));

            // Get canvas data as base64, strip the data URL prefix
            const dataUrl = canvas.toDataURL('image/png');
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

            // Use language code as folder name
            zip.file(`${lang}/screenshot-${i + 1}.png`, base64Data, { base64: true });
        }
    }

    // Restore original settings
    state.selectedIndex = originalIndex;
    state.currentLanguage = originalLang;
    state.screenshots.forEach((s, i) => {
        s.text.currentHeadlineLang = originalTextLangs[i].headline;
        s.text.currentSubheadlineLang = originalTextLangs[i].subheadline;
    });
    updateCanvas();

    // Generate ZIP
    showExportProgress('Generating ZIP...', '', 95);
    const content = await zip.generateAsync({ type: 'blob' });

    showExportProgress('Complete!', '', 100);
    await new Promise(resolve => setTimeout(resolve, 1500));
    hideExportProgress();

    const link = document.createElement('a');
    link.download = `screenshots_${state.outputDevice}_all-languages.zip`;
    link.href = URL.createObjectURL(content);
    link.click();
    URL.revokeObjectURL(link.href);
}

// ===== Emoji Picker (inline dropdown) =====

let emojiPickerInitialized = false;

function showEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    const iconPicker = document.getElementById('icon-picker');
    if (!picker) return;

    // Close icon picker if open
    if (iconPicker) iconPicker.style.display = 'none';

    // Toggle
    if (picker.style.display !== 'none') {
        picker.style.display = 'none';
        return;
    }

    picker.style.display = '';
    const searchInput = document.getElementById('emoji-search');
    if (searchInput) {
        searchInput.value = '';
        setTimeout(() => searchInput.focus(), 50);
    }

    // Reset to popular category
    document.querySelectorAll('#emoji-categories .picker-cat').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === 'popular');
    });
    renderEmojiGrid('popular');

    if (!emojiPickerInitialized) {
        emojiPickerInitialized = true;

        // Category tabs
        document.querySelectorAll('#emoji-categories .picker-cat').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#emoji-categories .picker-cat').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const searchVal = document.getElementById('emoji-search').value.trim();
                if (searchVal) {
                    renderEmojiSearchResults(searchVal);
                } else {
                    renderEmojiGrid(btn.dataset.category);
                }
            });
        });

        // Search
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const val = searchInput.value.trim().toLowerCase();
                if (val) {
                    renderEmojiSearchResults(val);
                } else {
                    const active = document.querySelector('#emoji-categories .picker-cat.active');
                    renderEmojiGrid(active?.dataset.category || 'popular');
                }
            });
        }
    }
}

function renderEmojiGrid(category) {
    const grid = document.getElementById('emoji-grid');
    if (!grid || typeof EMOJI_DATA === 'undefined') return;
    const emojis = EMOJI_DATA[category] || [];
    grid.innerHTML = emojis.map(e =>
        `<div class="picker-grid-item emoji-grid-item" data-emoji="${e.emoji}" data-name="${e.name}" title="${e.name}">${e.emoji}</div>`
    ).join('');
    wireEmojiClicks(grid);
}

function renderEmojiSearchResults(query) {
    const grid = document.getElementById('emoji-grid');
    if (!grid || typeof EMOJI_DATA === 'undefined') return;
    const results = [];
    for (const cat of Object.values(EMOJI_DATA)) {
        for (const e of cat) {
            if (e.name.toLowerCase().includes(query) ||
                e.keywords.some(k => k.includes(query))) {
                if (!results.find(r => r.emoji === e.emoji)) results.push(e);
            }
        }
    }
    grid.innerHTML = results.map(e =>
        `<div class="picker-grid-item emoji-grid-item" data-emoji="${e.emoji}" data-name="${e.name}" title="${e.name}">${e.emoji}</div>`
    ).join('');
    wireEmojiClicks(grid);
}

function wireEmojiClicks(grid) {
    grid.querySelectorAll('.emoji-grid-item').forEach(item => {
        item.onclick = () => {
            addEmojiElement(item.dataset.emoji, item.dataset.name);
            document.getElementById('emoji-picker').style.display = 'none';
        };
    });
}

// ===== Icon Picker (inline dropdown) =====

let iconPickerInitialized = false;
let iconSearchTimeout = null;

const iconImageObserver = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const item = entry.target;
            const name = item.dataset.iconName;
            if (name && !item.dataset.loaded) {
                item.dataset.loaded = 'true';
                loadIconPreview(item, name);
            }
            iconImageObserver.unobserve(item);
        }
    });
}, { root: document.getElementById('icon-grid'), rootMargin: '50px' }) : null;

async function loadIconPreview(item, name) {
    try {
        const svgText = await fetchLucideSVG(name);
        const colorized = colorizeLucideSVG(svgText, 'currentColor', 2);
        item.innerHTML = colorized;
        const svg = item.querySelector('svg');
        if (svg) {
            svg.style.width = '20px';
            svg.style.height = '20px';
        }
    } catch (e) {
        item.innerHTML = `<span style="font-size: 9px; color: var(--text-tertiary);">${name}</span>`;
    }
}

function showIconPicker() {
    const picker = document.getElementById('icon-picker');
    const emojiPicker = document.getElementById('emoji-picker');
    if (!picker) return;

    // Close emoji picker if open
    if (emojiPicker) emojiPicker.style.display = 'none';

    // Toggle
    if (picker.style.display !== 'none') {
        picker.style.display = 'none';
        return;
    }

    picker.style.display = '';
    const searchInput = document.getElementById('icon-search');
    if (searchInput) {
        searchInput.value = '';
        setTimeout(() => searchInput.focus(), 50);
    }

    // Reset to popular category
    document.querySelectorAll('#icon-categories .picker-cat').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === 'popular');
    });
    renderIconGrid('popular');

    if (!iconPickerInitialized) {
        iconPickerInitialized = true;

        // Category tabs
        document.querySelectorAll('#icon-categories .picker-cat').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#icon-categories .picker-cat').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const searchVal = document.getElementById('icon-search').value.trim();
                if (searchVal) {
                    renderIconSearchResults(searchVal);
                } else {
                    renderIconGrid(btn.dataset.category);
                }
            });
        });

        // Debounced search
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(iconSearchTimeout);
                iconSearchTimeout = setTimeout(() => {
                    const val = searchInput.value.trim().toLowerCase();
                    if (val) {
                        renderIconSearchResults(val);
                    } else {
                        const active = document.querySelector('#icon-categories .picker-cat.active');
                        renderIconGrid(active?.dataset.category || 'popular');
                    }
                }, 200);
            });
        }
    }
}

function renderIconGrid(category) {
    const grid = document.getElementById('icon-grid');
    if (!grid) return;
    const icons = category === 'popular' ? (typeof LUCIDE_POPULAR !== 'undefined' ? LUCIDE_POPULAR : []) :
                                            (typeof LUCIDE_ALL !== 'undefined' ? LUCIDE_ALL : []);
    grid.innerHTML = icons.map(name =>
        `<div class="picker-grid-item icon-grid-item" data-icon-name="${name}" title="${name}"><div class="icon-placeholder"></div></div>`
    ).join('');
    wireIconClicks(grid);
    if (iconImageObserver) {
        grid.querySelectorAll('.icon-grid-item').forEach(item => {
            iconImageObserver.observe(item);
        });
    }
}

function renderIconSearchResults(query) {
    const grid = document.getElementById('icon-grid');
    if (!grid) return;
    const allIcons = typeof LUCIDE_ALL !== 'undefined' ? LUCIDE_ALL : [];
    const results = allIcons.filter(name => name.includes(query));
    grid.innerHTML = results.map(name =>
        `<div class="picker-grid-item icon-grid-item" data-icon-name="${name}" title="${name}"><div class="icon-placeholder"></div></div>`
    ).join('');
    wireIconClicks(grid);
    if (iconImageObserver) {
        grid.querySelectorAll('.icon-grid-item').forEach(item => {
            iconImageObserver.observe(item);
        });
    }
}

function wireIconClicks(grid) {
    grid.querySelectorAll('.icon-grid-item').forEach(item => {
        item.onclick = () => {
            addIconElement(item.dataset.iconName);
            document.getElementById('icon-picker').style.display = 'none';
        };
    });
}

// Initialize custom dropdowns
function initializeCustomDropdowns() {
    // Find all select elements that don't have custom-select wrapper
    document.querySelectorAll('select:not(.custom-select-input)').forEach(select => {
        // Skip if already wrapped
        if (select.parentElement.classList.contains('custom-select')) {
            return;
        }

        const options = Array.from(select.options || []);
        if (options.length === 0) {
            return;
        }

        const selectedOption = options[select.selectedIndex] || options[0];
        const getOptionText = (option) => option?.text ?? option?.label ?? '';
        const getOptionFlag = (option) => option?.dataset?.flag || '';
        const getOptionLabel = (option) => option?.dataset?.label || option?.textContent || '';
        const renderOptionContent = (option) => {
            const flag = getOptionFlag(option);
            const label = getOptionLabel(option);
            return flag
                ? `<span class="custom-select-option-flag">${flag}</span><span class="custom-select-option-label">${label}</span>`
                : label;
        };

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select';
        
        // Create trigger
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.setAttribute('tabindex', '0');
        
        const triggerText = document.createElement('span');
        triggerText.className = 'custom-select-trigger-text';
        triggerText.innerHTML = renderOptionContent(selectedOption);
        
        const triggerArrow = document.createElement('span');
        triggerArrow.className = 'custom-select-trigger-arrow';
        triggerArrow.innerHTML = '<svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';
        
        trigger.appendChild(triggerText);
        trigger.appendChild(triggerArrow);
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-select-dropdown';
        
        // Add options to dropdown
        options.forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-select-option';
            if (option.selected) {
                optionDiv.classList.add('selected');
            }
            
            // Support custom data attribute for subtitle
            const subtitle = option.dataset?.subtitle || '';
            if (subtitle) {
                optionDiv.innerHTML = `<div class="custom-select-option-main">${renderOptionContent(option)}</div><div class="custom-select-option-sub">${subtitle}</div>`;
            } else {
                optionDiv.innerHTML = renderOptionContent(option);
            }
            
            optionDiv.dataset.value = option.value;
            
            optionDiv.addEventListener('click', () => {
                // Update select value
                select.value = option.value;
                
                // Update trigger text with subtitle if available
                if (subtitle) {
                    triggerText.innerHTML = `<div><div>${renderOptionContent(option)}</div><div style="font-size: 12px; color: var(--text-secondary);">${subtitle}</div></div>`;
                } else {
                    triggerText.innerHTML = renderOptionContent(option);
                }
                
                // Update selected state
                dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                optionDiv.classList.add('selected');
                
                // Close dropdown
                wrapper.classList.remove('open');
                
                // Trigger change event
                select.dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            dropdown.appendChild(optionDiv);
        });
        
        // Wrap the select element
        select.classList.add('custom-select-input');
        select.parentElement.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        wrapper.appendChild(trigger);
        wrapper.appendChild(dropdown);
        
        // Toggle dropdown on trigger click
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapper.classList.toggle('open');
        });
        
        // Keyboard support
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                wrapper.classList.toggle('open');
            } else if (e.key === 'Escape') {
                wrapper.classList.remove('open');
            } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && wrapper.classList.contains('open')) {
                e.preventDefault();
                const options = dropdown.querySelectorAll('.custom-select-option');
                const selectedIndex = Array.from(options).findIndex(opt => opt.classList.contains('selected'));
                let nextIndex = e.key === 'ArrowDown' ? selectedIndex + 1 : selectedIndex - 1;
                
                if (nextIndex >= 0 && nextIndex < options.length) {
                    options[nextIndex].click();
                }
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
            }
        });
    });
}

function refreshCustomSelect(select) {
    if (!select) return;

    const wrapper = select.parentElement;
    if (!wrapper || !wrapper.classList.contains('custom-select')) {
        initializeCustomDropdowns();
        return;
    }

    const triggerText = wrapper.querySelector('.custom-select-trigger-text');
    const dropdown = wrapper.querySelector('.custom-select-dropdown');
    if (!triggerText || !dropdown) return;

    const options = Array.from(select.options || []);
    const selectedOption = options[select.selectedIndex] || options[0];
    const getOptionText = (option) => option?.text ?? option?.label ?? '';
    const getOptionFlag = (option) => option?.dataset?.flag || '';
    const getOptionLabel = (option) => option?.dataset?.label || option?.textContent || '';
    const renderOptionContent = (option) => {
        const flag = getOptionFlag(option);
        const label = getOptionLabel(option);
        return flag
            ? `<span class="custom-select-option-flag">${flag}</span><span class="custom-select-option-label">${label}</span>`
            : label;
    };

    triggerText.innerHTML = renderOptionContent(selectedOption);
    dropdown.innerHTML = '';

    options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'custom-select-option';
        if (option.selected) {
            optionDiv.classList.add('selected');
        }

        const subtitle = option.dataset?.subtitle || '';
        if (subtitle) {
            optionDiv.innerHTML = `<div class="custom-select-option-main">${renderOptionContent(option)}</div><div class="custom-select-option-sub">${subtitle}</div>`;
        } else {
            optionDiv.innerHTML = renderOptionContent(option);
        }

        optionDiv.dataset.value = option.value;
        optionDiv.addEventListener('click', () => {
            select.value = option.value;
            refreshCustomSelect(select);
            select.dispatchEvent(new Event('change', { bubbles: true }));
            wrapper.classList.remove('open');
        });

        dropdown.appendChild(optionDiv);
    });
}

// Initialize the app
initSync();
initializeCustomDropdowns();