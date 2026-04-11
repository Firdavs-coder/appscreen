// Magical Titles - AI-powered title generation using vision APIs
// Analyzes app preview images and generates marketing headlines + subheadlines

// Track if the tooltip has been shown this session
let magicalTitlesTooltipShown = false;

/**
 * Show a tooltip suggesting the Magical Titles feature
 * Called when user adds their first screenshot(s) to a project
 */
function showMagicalTitlesTooltip() {
    // Don't show if already shown this session or dismissed before
    if (magicalTitlesTooltipShown) return;
    if (localStorage.getItem('magicalTitlesTooltipDismissed')) return;

    // Don't show if no API key is configured
    const provider = getSelectedProvider();
    const providerConfig = llmProviders[provider];
    const apiKey = localStorage.getItem(providerConfig.storageKey);
    if (!apiKey) return;

    magicalTitlesTooltipShown = true;

    const btn = document.getElementById('magical-titles-btn');
    if (!btn) return;

    // Make button position relative for tooltip positioning
    btn.style.position = 'relative';

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'feature-tooltip';
    tooltip.id = 'magical-titles-tooltip';
    tooltip.innerHTML = `
        <button class="feature-tooltip-close" onclick="dismissMagicalTitlesTooltip()">×</button>
        ✨ Try AI-generated titles!
    `;

    btn.appendChild(tooltip);

    // Auto-hide after 8 seconds
    setTimeout(() => {
        dismissMagicalTitlesTooltip();
    }, 8000);
}

/**
 * Dismiss the Magical Titles tooltip
 */
function dismissMagicalTitlesTooltip() {
    const tooltip = document.getElementById('magical-titles-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
    localStorage.setItem('magicalTitlesTooltipDismissed', 'true');
}

/**
 * Get the data URL for a screenshot image in a specific language
 * @param {Object} screenshot - Screenshot object from state
 * @param {string} lang - Language code to get image for
 * @returns {string|null} - Data URL or null if not found
 */
function getScreenshotDataUrl(screenshot, lang) {
    // Try specified language first
    const localized = screenshot.localizedImages?.[lang];
    if (localized?.src) return localized.src;

    // Fallback to first available language
    for (const l of state.projectLanguages) {
        if (screenshot.localizedImages?.[l]?.src) {
            return screenshot.localizedImages[l].src;
        }
    }

    return null;
}

/**
 * Parse a data URL into its components
 * @param {string} dataUrl - Data URL string
 * @returns {Object} - { mimeType, base64 }
 */
function parseDataUrl(dataUrl) {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return {
        mimeType: match[1],
        base64: match[2]
    };
}

/**
 * Generate titles using Anthropic Claude vision API
 * @param {string} apiKey - Anthropic API key
 * @param {Array} images - Array of { mimeType, base64 } objects
 * @param {string} prompt - Text prompt
 * @returns {Promise<string>} - Response text
 */
async function generateTitlesWithAnthropic(apiKey, images, prompt) {
    const model = getSelectedModel('anthropic');

    // Build content array with images first, then text
    const content = [];

    for (const img of images) {
        content.push({
            type: "image",
            source: {
                type: "base64",
                media_type: img.mimeType,
                data: img.base64
            }
        });
    }

    content.push({ type: "text", text: prompt });

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
            messages: [{ role: "user", content: content }]
        })
    });

    if (!response.ok) {
        const status = response.status;
        const errorBody = await response.json().catch(() => ({}));
        console.error('Anthropic Vision API Error:', { status, model, error: errorBody });
        if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
        throw new Error(`API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

/**
 * Generate titles using OpenAI GPT vision API
 * @param {string} apiKey - OpenAI API key
 * @param {Array} images - Array of { mimeType, base64 } objects
 * @param {string} prompt - Text prompt
 * @returns {Promise<string>} - Response text
 */
async function generateTitlesWithOpenAI(apiKey, images, prompt) {
    const model = getSelectedModel('openai');

    // Build content array with images and text
    const content = [];

    for (const img of images) {
        content.push({
            type: "image_url",
            image_url: {
                url: `data:${img.mimeType};base64,${img.base64}`
            }
        });
    }

    content.push({ type: "text", text: prompt });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            max_completion_tokens: 4096,
            messages: [{ role: "user", content: content }]
        })
    });

    if (!response.ok) {
        const status = response.status;
        const errorBody = await response.json().catch(() => ({}));
        console.error('OpenAI Vision API Error:', { status, model, error: errorBody });
        if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
        throw new Error(`API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * Generate titles using Google Gemini vision API
 * @param {string} apiKey - Google API key
 * @param {Array} images - Array of { mimeType, base64 } objects
 * @param {string} prompt - Text prompt
 * @returns {Promise<string>} - Response text
 */
async function generateTitlesWithGoogle(apiKey, images, prompt) {
    const model = getSelectedModel('google');

    // Build parts array with images and text
    const parts = [];

    for (const img of images) {
        parts.push({
            inlineData: {
                mimeType: img.mimeType,
                data: img.base64
            }
        });
    }

    parts.push({ text: prompt });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [{ parts: parts }]
        })
    });

    if (!response.ok) {
        const status = response.status;
        const errorBody = await response.json().catch(() => ({}));
        console.error('Google Vision API Error:', { status, model, error: errorBody });
        if (status === 401 || status === 403 || status === 400) throw new Error('AI_UNAVAILABLE');
        throw new Error(`API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

/**
 * Show the magical titles confirmation dialog
 */
function showMagicalTitlesDialog() {
    // Validate screenshots exist
    if (!state.screenshots || state.screenshots.length === 0) {
        showAppAlert('Please add some screenshots first.', 'info');
        return;
    }

    // Get provider and API key
    const provider = getSelectedProvider();
    const providerConfig = llmProviders[provider];
    const apiKey = localStorage.getItem(providerConfig.storageKey);

    if (!apiKey) {
        showAppAlert('Please configure your AI API key in Settings first.', 'error');
        return;
    }

    // Update modal info
    document.getElementById('magical-titles-count').textContent = state.screenshots.length;
    document.getElementById('magical-titles-provider').textContent = providerConfig.name;

    // Populate language dropdown
    const langSelect = document.getElementById('magical-titles-language');
    langSelect.innerHTML = state.projectLanguages.map(lang => {
        const langName = languageNames[lang] || lang;
        return `<option value="${lang}">${langName}</option>`;
    }).join('');

    // Show modal
    document.getElementById('magical-titles-modal').classList.add('visible');
}

/**
 * Hide the magical titles confirmation dialog
 */
function hideMagicalTitlesDialog() {
    document.getElementById('magical-titles-modal').classList.remove('visible');
}

/**
 * Main function to generate magical titles for all screenshots
 */
async function generateMagicalTitles() {
    // Hide the confirmation dialog
    hideMagicalTitlesDialog();

    // Get provider and API key
    const provider = getSelectedProvider();
    const providerConfig = llmProviders[provider];
    const apiKey = localStorage.getItem(providerConfig.storageKey);

    // Get selected language from dropdown
    const langSelect = document.getElementById('magical-titles-language');
    const sourceLang = langSelect.value || state.projectLanguages[0] || 'en';
    const langName = languageNames[sourceLang] || 'English';

    // Collect images from all screenshots
    const images = [];
    for (const screenshot of state.screenshots) {
        const dataUrl = getScreenshotDataUrl(screenshot, sourceLang);
        if (dataUrl) {
            const parsed = parseDataUrl(dataUrl);
            if (parsed) {
                images.push(parsed);
            }
        }
    }

    if (images.length === 0) {
        await showAppAlert('No screenshot images found. Please upload some screenshots first.', 'error');
        return;
    }

    // Build prompt
    const prompt = `You are an expert App Store and Google Play marketing copywriter. Analyze these ${images.length} app screenshots and create compelling marketing titles.

The screenshots are shown in order (1 through ${images.length}). Study what the app does and identify:
1. The main purpose and value proposition
2. The user problem it solves
3. Key features visible in each screen

CRITICAL: Screenshot 1's headline MUST focus on the main value proposition - what problem does this app solve for users? This is the most important title.

LENGTH REQUIREMENTS - THIS IS VERY IMPORTANT:
- headline: VERY SHORT, maximum 2-4 words. Punchy, memorable, benefit-focused.
- subheadline: SHORT, maximum 4-8 words. Expands on the headline.

UNIQUENESS - VERY IMPORTANT:
- Each screenshot MUST have a UNIQUE headline and subheadline
- Do NOT repeat or reuse similar titles across screenshots
- Each title should highlight a DIFFERENT feature or benefit

Examples of good headlines: "Track Every Expense", "Sleep Better Tonight", "Never Forget Again"
Examples of good subheadlines: "Automatic expense categorization and insights", "Science-backed sleep improvement", "Smart reminders that actually work"

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
    "0": { "headline": "...", "subheadline": "..." },
    "1": { "headline": "...", "subheadline": "..." }
}

Where the keys are 0-indexed screenshot numbers.
Write all titles in ${langName}.`;

    // Create progress overlay
    const progressOverlay = document.createElement('div');
    progressOverlay.id = 'magical-titles-progress';
    progressOverlay.innerHTML = `
        <div class="modal-overlay visible">
            <div class="modal">
                <div class="modal-icon" style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ffa500; animation: spin 2s linear infinite;">
                        <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z"/>
                    </svg>
                </div>
                <h3 class="modal-title">Generating Magical Titles...</h3>
                <p id="magical-titles-status" style="color: var(--text-secondary); margin-top: 8px;">Analyzing ${images.length} screenshots with AI...</p>
                <p id="magical-titles-detail" style="color: var(--text-tertiary); font-size: 12px; margin-top: 4px;">Using ${providerConfig.name}</p>
            </div>
        </div>
    `;
    document.body.appendChild(progressOverlay);

    const updateStatus = (text, detail = '') => {
        const statusEl = document.getElementById('magical-titles-status');
        const detailEl = document.getElementById('magical-titles-detail');
        if (statusEl) statusEl.textContent = text;
        if (detailEl) detailEl.textContent = detail;
    };

    try {
        // Call provider-specific API
        let responseText;

        updateStatus('Sending screenshots to AI...', `${images.length} images to analyze`);

        if (provider === 'anthropic') {
            responseText = await generateTitlesWithAnthropic(apiKey, images, prompt);
        } else if (provider === 'openai') {
            responseText = await generateTitlesWithOpenAI(apiKey, images, prompt);
        } else if (provider === 'google') {
            responseText = await generateTitlesWithGoogle(apiKey, images, prompt);
        } else {
            throw new Error(`Unknown provider: ${provider}`);
        }

        updateStatus('Processing response...', 'Parsing generated titles');

        // Clean up response - remove markdown code blocks if present
        responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        // Extract JSON object from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            responseText = jsonMatch[0];
        }

        console.log('Magical Titles response:', responseText);

        // Parse JSON
        const titles = JSON.parse(responseText);

        updateStatus('Applying titles...', 'Updating screenshots');

        // Apply titles to screenshots
        for (let i = 0; i < state.screenshots.length; i++) {
            const titleData = titles[String(i)];
            if (titleData) {
                const screenshot = state.screenshots[i];

                // Ensure text object exists with proper structure
                if (!screenshot.text) {
                    screenshot.text = {
                        headlines: {},
                        subheadlines: {}
                    };
                }
                if (!screenshot.text.headlines) screenshot.text.headlines = {};
                if (!screenshot.text.subheadlines) screenshot.text.subheadlines = {};

                // Set the titles for the source language
                if (titleData.headline) {
                    screenshot.text.headlines[sourceLang] = titleData.headline;
                    screenshot.text.headlineEnabled = true;
                }
                if (titleData.subheadline) {
                    screenshot.text.subheadlines[sourceLang] = titleData.subheadline;
                    screenshot.text.subheadlineEnabled = true;
                }
            }
        }

        // Update UI
        syncUIWithState();
        updateCanvas();
        saveState();

        // Remove progress overlay
        progressOverlay.remove();

        // Show success message
        await showAppAlert(`Generated titles for ${Object.keys(titles).length} screenshots in ${langName}!`, 'success');

    } catch (error) {
        console.error('Magical Titles error:', error);
        progressOverlay.remove();

        if (error.message === 'AI_UNAVAILABLE') {
            await showAppAlert('AI service unavailable. Please check your API key in Settings.', 'error');
        } else if (error instanceof SyntaxError) {
            await showAppAlert('Failed to parse AI response. Please try again.', 'error');
        } else {
            await showAppAlert(`Error generating titles: ${error.message}`, 'error');
        }
    }
}

function showAiGenerateDialog() {
    if (!state.screenshots || state.screenshots.length === 0) {
        showAppAlert('Please add some screenshots first.', 'info');
        return;
    }

    const provider = getSelectedProvider();
    const providerConfig = llmProviders[provider];
    const apiKey = localStorage.getItem(providerConfig.storageKey);

    if (!apiKey) {
        showAppAlert('Please configure your AI API key in Settings first.', 'error');
        return;
    }

    document.getElementById('ai-generate-count').textContent = state.screenshots.length;
    document.getElementById('ai-generate-provider').textContent = providerConfig.name;
    document.getElementById('ai-generate-modal').classList.add('visible');
}

function hideAiGenerateDialog() {
    document.getElementById('ai-generate-modal').classList.remove('visible');
}

function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

function toHexColor(r, g, b) {
    return '#' + [r, g, b].map(value => value.toString(16).padStart(2, '0')).join('');
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function mergeDeep(target, source) {
    if (Array.isArray(source)) return source.map(item => (item && typeof item === 'object') ? mergeDeep({}, item) : item);
    if (!source || typeof source !== 'object') return source;

    const output = Array.isArray(target) ? [...target] : { ...(target || {}) };
    Object.entries(source).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            output[key] = value.map(item => (item && typeof item === 'object') ? mergeDeep({}, item) : item);
        } else if (value && typeof value === 'object') {
            output[key] = mergeDeep(output[key] || {}, value);
        } else {
            output[key] = value;
        }
    });
    return output;
}

async function extractDominantColorsFromDataUrl(dataUrl, maxColors = 4) {
    try {
        const img = await loadImageFromDataUrl(dataUrl);
        const sampleSize = 48;
        const canvas = document.createElement('canvas');
        canvas.width = sampleSize;
        canvas.height = Math.max(1, Math.round((img.height / img.width) * sampleSize));
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return [];

        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const counts = new Map();

        for (let i = 0; i < pixels.length; i += 16) {
            const alpha = pixels[i + 3];
            if (alpha < 180) continue;

            const r = Math.round(pixels[i] / 32) * 32;
            const g = Math.round(pixels[i + 1] / 32) * 32;
            const b = Math.round(pixels[i + 2] / 32) * 32;
            const key = `${r},${g},${b}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        }

        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxColors)
            .map(([key]) => {
                const [r, g, b] = key.split(',').map(Number);
                return toHexColor(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
            });
    } catch (error) {
        console.warn('Failed to extract colors from screenshot:', error);
        return [];
    }
}

function normalizeGeneratedPopout(popout, index) {
    const normalized = mergeDeep({
        id: crypto.randomUUID(),
        cropX: 25,
        cropY: 25,
        cropWidth: 30,
        cropHeight: 30,
        x: 70,
        y: 30,
        width: 30,
        rotation: 0,
        opacity: 100,
        cornerRadius: 12,
        shadow: { enabled: true, color: '#000000', blur: 30, opacity: 40, x: 0, y: 15 },
        border: { enabled: true, color: '#ffffff', width: 3, opacity: 100 }
    }, popout || {});

    normalized.id = normalized.id || crypto.randomUUID();
    normalized.cropX = clamp(Number(normalized.cropX ?? 25), 0, 100);
    normalized.cropY = clamp(Number(normalized.cropY ?? 25), 0, 100);
    normalized.cropWidth = clamp(Number(normalized.cropWidth ?? 30), 5, 100);
    normalized.cropHeight = clamp(Number(normalized.cropHeight ?? 30), 5, 100);
    normalized.x = clamp(Number(normalized.x ?? 70), 0, 100);
    normalized.y = clamp(Number(normalized.y ?? 30), 0, 100);
    normalized.width = clamp(Number(normalized.width ?? 30), 8, 100);
    normalized.rotation = Number(normalized.rotation ?? 0);
    normalized.opacity = clamp(Number(normalized.opacity ?? 100), 0, 100);
    normalized.cornerRadius = clamp(Number(normalized.cornerRadius ?? 12), 0, 80);
    normalized.shadow = mergeDeep({ enabled: true, color: '#000000', blur: 30, opacity: 40, x: 0, y: 15 }, normalized.shadow || {});
    normalized.border = mergeDeep({ enabled: true, color: '#ffffff', width: 3, opacity: 100 }, normalized.border || {});

    if (!normalized.name) normalized.name = `AI Popout ${index + 1}`;
    return normalized;
}

function buildAiLayoutPrompt(screens, sourceLang, sourceLangName) {
    const screenCount = screens.length;
    const screenSummaries = screens.map((screen, index) => {
        const palette = screen.palette?.length ? screen.palette.join(', ') : 'unknown';
        const ratio = screen.ratio ? screen.ratio.toFixed(2) : 'unknown';
        return `Screenshot ${index + 1}: ratio ${ratio}, dominant colors ${palette}`;
    }).join('\n');

    return `You are an expert mobile app screenshot designer.
Analyze the screenshots and create a polished, high-end App Store / Play Store campaign design.

Goal:
- Use the screenshot's dominant colors to shape the background.
- Keep all screens visually cohesive as one campaign. Do NOT invent totally unrelated backgrounds per screen.
- Use one shared visual language: same family of blues/purples/charcoals/whites or the closest palette from the screenshots, with only subtle per-screen variation.
- Write clear, concise headline and subheadline copy that matches the visible UI.
- Make the headline feel like a hero banner: very large, bold, and readable from a distance.
- Choose screenshot position and sizing so the device feels dominant and premium.
- ALWAYS use a 3D device treatment and make the screenshot look like a real mockup, not a flat crop.
- If helpful, add lightweight decorative elements such as icons, emojis, labels, shapes, arrows, or soft UI accents.

Rules:
- Return ONLY valid JSON.
- Return exactly ${screenCount} entries in the "screens" array.
- Use ${sourceLangName} (${sourceLang}) for all generated text.
- Keep headlines short, punchy, benefit-focused, and LARGE.
- Keep subheadlines shorter than a sentence when possible and still readable.
- Prefer strong contrast between text and background.
- Use hex colors only.
- Keep screenshot settings within the editor's ranges: x/y 0-100, scale 30-100, rotation -45 to 45, cornerRadius 0-80, opacity 0-100.
- Use position "top" or "bottom" only.
- Use use3D=true for every screenshot.
- Use device3D="iphone" unless another device is clearly more appropriate.
- Keep headlineSize and subheadlineSize substantially larger than body text; do not make text tiny.
- Favor 1-3 line headlines and compact subheadlines.
- Do not change rotation3D.x, rotation3D.y, or rotation3D.z from the existing screenshot values.
- Do not use popouts.
- Prefer elements over popouts for any decoration.

Return this schema:
{
  "screens": [
    {
      "index": 0,
      "background": {
        "type": "gradient",
        "gradient": {
          "angle": 135,
          "stops": [
            { "color": "#667eea", "position": 0 },
            { "color": "#764ba2", "position": 100 }
          ]
        },
        "solid": "#1a1a2e",
        "overlayColor": "#000000",
        "overlayOpacity": 0,
        "noise": false,
        "noiseIntensity": 10
      },
      "screenshot": {
        "scale": 70,
        "x": 50,
        "y": 60,
        "rotation": 0,
        "perspective": 0,
        "cornerRadius": 24,
                "use3D": true,
        "device3D": "iphone",
        "shadow": {
          "enabled": true,
          "color": "#000000",
          "blur": 40,
          "opacity": 30,
          "x": 0,
          "y": 20
        },
        "frame": {
          "enabled": false,
          "color": "#1d1d1f",
          "width": 12,
          "opacity": 100
        }
      },
      "text": {
        "headlineEnabled": true,
        "headlines": { "${sourceLang}": "Headline text" },
        "headlineLanguages": ["${sourceLang}"],
        "currentHeadlineLang": "${sourceLang}",
        "headlineFont": "-apple-system, BlinkMacSystemFont, 'SF Pro Display'",
                "headlineSize": 136,
                "headlineWeight": "700",
        "headlineItalic": false,
        "headlineUnderline": false,
        "headlineStrikethrough": false,
        "headlineColor": "#ffffff",
        "perLanguageLayout": false,
        "languageSettings": {
          "${sourceLang}": {
                        "headlineSize": 136,
                        "subheadlineSize": 64,
            "position": "top",
                        "offsetY": 10,
                        "lineHeight": 96
          }
        },
        "currentLayoutLang": "${sourceLang}",
        "position": "top",
                "offsetY": 10,
                "lineHeight": 96,
        "subheadlineEnabled": true,
        "subheadlines": { "${sourceLang}": "Subheadline text" },
        "subheadlineLanguages": ["${sourceLang}"],
        "currentSubheadlineLang": "${sourceLang}",
        "subheadlineFont": "-apple-system, BlinkMacSystemFont, 'SF Pro Display'",
                "subheadlineSize": 64,
                "subheadlineWeight": "500",
        "subheadlineItalic": false,
        "subheadlineUnderline": false,
        "subheadlineStrikethrough": false,
        "subheadlineColor": "#ffffff",
        "subheadlineOpacity": 70
      },
            "elements": []
    }
  ]
}

Screen context:
${screenSummaries}`;
}

function applyGeneratedLayoutToScreenshot(screenshot, plan, sourceLang) {
    if (!screenshot || !plan) return;

    const preservedRotation3D = screenshot.screenshot?.rotation3D
        ? JSON.parse(JSON.stringify(screenshot.screenshot.rotation3D))
        : JSON.parse(JSON.stringify(state.defaults.screenshot.rotation3D || { x: 0, y: 0, z: 0 }));

    if (plan.background) {
        screenshot.background = mergeDeep(screenshot.background || JSON.parse(JSON.stringify(state.defaults.background)), plan.background);
    }

    if (plan.screenshot) {
        screenshot.screenshot = mergeDeep(screenshot.screenshot || JSON.parse(JSON.stringify(state.defaults.screenshot)), plan.screenshot);
    }

    screenshot.screenshot.use3D = plan.screenshot?.use3D !== false;
    screenshot.screenshot.device3D = plan.screenshot?.device3D || screenshot.screenshot.device3D || 'iphone';
    screenshot.screenshot.rotation3D = preservedRotation3D;
    screenshot.screenshot.scale = clamp(Number(screenshot.screenshot.scale ?? 70), 30, 100);
    screenshot.screenshot.rotation = clamp(Number(screenshot.screenshot.rotation ?? 0), -45, 45);
    screenshot.screenshot.cornerRadius = clamp(Number(screenshot.screenshot.cornerRadius ?? 24), 0, 80);

    const text = screenshot.text ? normalizeTextSettings(screenshot.text) : normalizeTextSettings(state.defaults.text);
    const headline = plan.text?.headlines?.[sourceLang] || plan.text?.headline || '';
    const subheadline = plan.text?.subheadlines?.[sourceLang] || plan.text?.subheadline || '';

    if (!text.headlines) text.headlines = {};
    if (!text.subheadlines) text.subheadlines = {};
    if (!text.headlineLanguages) text.headlineLanguages = [sourceLang];
    if (!text.subheadlineLanguages) text.subheadlineLanguages = [sourceLang];
    if (!text.languageSettings) text.languageSettings = {};

    if (headline) {
        text.headlines[sourceLang] = headline;
        text.headlineEnabled = true;
    }
    if (subheadline) {
        text.subheadlines[sourceLang] = subheadline;
        text.subheadlineEnabled = true;
    }

    text.headlineFont = text.headlineFont || "-apple-system, BlinkMacSystemFont, 'SF Pro Display'";
    text.subheadlineFont = text.subheadlineFont || text.headlineFont;
    text.headlineSize = Math.max(Number(text.headlineSize || 136), 124);
    text.subheadlineSize = Math.max(Number(text.subheadlineSize || 64), 58);
    text.headlineWeight = text.headlineWeight || '700';
    text.subheadlineWeight = text.subheadlineWeight || '500';
    text.position = text.position || 'top';
    text.offsetY = typeof text.offsetY === 'number' ? Math.min(text.offsetY, 14) : 10;
    text.lineHeight = Math.min(Number(text.lineHeight || 96), 108);
    text.headlineColor = text.headlineColor || '#ffffff';
    text.subheadlineColor = text.subheadlineColor || '#ffffff';

    const textPlan = plan.text || {};
    ['headlineFont', 'headlineSize', 'headlineWeight', 'headlineItalic', 'headlineUnderline', 'headlineStrikethrough', 'headlineColor', 'position', 'offsetY', 'lineHeight', 'subheadlineFont', 'subheadlineSize', 'subheadlineWeight', 'subheadlineItalic', 'subheadlineUnderline', 'subheadlineStrikethrough', 'subheadlineColor', 'subheadlineOpacity', 'perLanguageLayout'].forEach((key) => {
        if (textPlan[key] !== undefined) {
            text[key] = textPlan[key];
        }
    });

    if (textPlan.languageSettings?.[sourceLang]) {
        text.languageSettings[sourceLang] = mergeDeep(text.languageSettings[sourceLang] || {}, textPlan.languageSettings[sourceLang]);
    }

    text.languageSettings[sourceLang] = text.languageSettings[sourceLang] || {};
    text.languageSettings[sourceLang].headlineFont = text.headlineFont;
    text.languageSettings[sourceLang].headlineSize = Math.max(Number(text.languageSettings[sourceLang].headlineSize || text.headlineSize || 136), 124);
    text.languageSettings[sourceLang].subheadlineSize = Math.max(Number(text.languageSettings[sourceLang].subheadlineSize || text.subheadlineSize || 64), 58);
    text.languageSettings[sourceLang].position = text.languageSettings[sourceLang].position || text.position || 'top';
    text.languageSettings[sourceLang].offsetY = typeof text.languageSettings[sourceLang].offsetY === 'number' ? Math.min(text.languageSettings[sourceLang].offsetY, 14) : 10;
    text.languageSettings[sourceLang].lineHeight = Math.min(Number(text.languageSettings[sourceLang].lineHeight || text.lineHeight || 96), 108);

    text.currentHeadlineLang = sourceLang;
    text.currentSubheadlineLang = sourceLang;
    text.currentLayoutLang = sourceLang;
    if (!text.headlineLanguages.includes(sourceLang)) text.headlineLanguages.push(sourceLang);
    if (!text.subheadlineLanguages.includes(sourceLang)) text.subheadlineLanguages.push(sourceLang);

    screenshot.text = text;

    if (Array.isArray(plan.elements)) {
        screenshot.elements = plan.elements.map((element, index) => ({
            id: element.id || crypto.randomUUID(),
            ...element,
            name: element.name || `AI Element ${index + 1}`
        }));
    }
}

async function generateAiLayout() {
    hideAiGenerateDialog();

    const provider = getSelectedProvider();
    const providerConfig = llmProviders[provider];
    const apiKey = localStorage.getItem(providerConfig.storageKey);

    if (!apiKey) {
        showAppAlert('Please configure your AI API key in Settings first.', 'error');
        return;
    }

    const sourceLang = state.currentLanguage || state.projectLanguages[0] || 'en';
    const sourceLangName = languageNames[sourceLang] || sourceLang;

    const screenshots = state.screenshots.map((screenshot, index) => ({ screenshot, index })).filter(item => getScreenshotDataUrl(item.screenshot, sourceLang));

    if (screenshots.length === 0) {
        showAppAlert('No screenshot images found. Please upload screenshots first.', 'error');
        return;
    }

    const progressOverlay = document.createElement('div');
    progressOverlay.id = 'ai-generate-progress';
    progressOverlay.innerHTML = `
        <div class="modal-overlay visible">
            <div class="modal">
                <div class="modal-icon" style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #667eea; animation: spin 2s linear infinite;">
                        <path d="M4 4h7v7H4z"/>
                        <path d="M13 4h7v7h-7z"/>
                        <path d="M4 13h7v7H4z"/>
                        <path d="M15 15h5v5h-5z"/>
                    </svg>
                </div>
                <h3 class="modal-title">Generating AI Layout...</h3>
                <p id="ai-generate-status" class="modal-message" style="margin-top: 8px; color: var(--text-secondary);">Analyzing screenshot colors and structure...</p>
                <p id="ai-generate-detail" class="modal-message" style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">Using ${providerConfig.name}</p>
            </div>
        </div>
    `;
    document.body.appendChild(progressOverlay);

    const updateStatus = (status, detail = '') => {
        const statusEl = document.getElementById('ai-generate-status');
        const detailEl = document.getElementById('ai-generate-detail');
        if (statusEl) statusEl.textContent = status;
        if (detailEl) detailEl.textContent = detail;
    };

    try {
        const analyzedScreens = [];

        for (let i = 0; i < screenshots.length; i++) {
            const { screenshot, index } = screenshots[i];
            updateStatus(`Analyzing screenshot ${i + 1} of ${screenshots.length}...`, 'Extracting dominant colors');

            const dataUrl = getScreenshotDataUrl(screenshot, sourceLang);
            const image = await loadImageFromDataUrl(dataUrl);
            const palette = await extractDominantColorsFromDataUrl(dataUrl, 4);

            analyzedScreens.push({
                index,
                palette,
                ratio: image.width && image.height ? (image.width / image.height) : null
            });
        }

        const images = [];
        for (const { screenshot } of screenshots) {
            const dataUrl = getScreenshotDataUrl(screenshot, sourceLang);
            const parsed = parseDataUrl(dataUrl);
            if (parsed) images.push(parsed);
        }

        const prompt = buildAiLayoutPrompt(analyzedScreens, sourceLang, sourceLangName);
        updateStatus('Sending screenshots to AI...', `${images.length} images to analyze`);

        let responseText;
        if (provider === 'anthropic') {
            responseText = await generateTitlesWithAnthropic(apiKey, images, prompt);
        } else if (provider === 'openai') {
            responseText = await generateTitlesWithOpenAI(apiKey, images, prompt);
        } else if (provider === 'google') {
            responseText = await generateTitlesWithGoogle(apiKey, images, prompt);
        } else {
            throw new Error(`Unknown provider: ${provider}`);
        }

        updateStatus('Parsing AI response...', 'Building layout plan');

        responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const parsedResponse = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
        const screens = Array.isArray(parsedResponse) ? parsedResponse : (parsedResponse.screens || []);

        if (!screens.length) {
            throw new Error('AI response did not include any screen layouts.');
        }

        if (!state.projectLanguages.includes(sourceLang)) {
            state.projectLanguages.push(sourceLang);
        }

        updateStatus('Applying AI layout...', 'Updating screenshots');

        state.screenshots.forEach((screenshot, index) => {
            const plan = screens.find(item => Number(item.index) === index) || screens[index];
            if (plan) {
                applyGeneratedLayoutToScreenshot(screenshot, plan, sourceLang);
            }
        });

        syncUIWithState();
        updateCanvas();
        saveState();

        progressOverlay.remove();
        await showAppAlert(`Generated AI layouts for ${Math.min(screens.length, state.screenshots.length)} screenshots!`, 'success');
    } catch (error) {
        console.error('AI layout generation error:', error);
        progressOverlay.remove();

        if (error.message === 'AI_UNAVAILABLE') {
            await showAppAlert('AI service unavailable. Please check your API key in Settings.', 'error');
        } else if (error instanceof SyntaxError) {
            await showAppAlert('Failed to parse AI response. Please try again.', 'error');
        } else {
            await showAppAlert(`Error generating AI layout: ${error.message}`, 'error');
        }
    }
}
