// DOM elements
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');
const canvasLeft = document.getElementById('preview-canvas-left');
const ctxLeft = canvasLeft.getContext('2d');
const canvasRight = document.getElementById('preview-canvas-right');
const ctxRight = canvasRight.getContext('2d');
const canvasFarLeft = document.getElementById('preview-canvas-far-left');
const ctxFarLeft = canvasFarLeft.getContext('2d');
const canvasFarRight = document.getElementById('preview-canvas-far-right');
const ctxFarRight = canvasFarRight.getContext('2d');
const sidePreviewLeft = document.getElementById('side-preview-left');
const sidePreviewRight = document.getElementById('side-preview-right');
const sidePreviewFarLeft = document.getElementById('side-preview-far-left');
const sidePreviewFarRight = document.getElementById('side-preview-far-right');
const previewStrip = document.querySelector('.preview-strip');
const canvasWrapper = document.getElementById('canvas-wrapper');
const canvasLoading = document.getElementById('canvas-loading');

function setCanvasLoading(loading) {
    if (!canvasLoading) return;
    canvasLoading.classList.toggle('visible', !!loading);
    canvasLoading.setAttribute('aria-hidden', loading ? 'false' : 'true');

    const noScreenshotEl = document.getElementById('no-screenshot');
    if (noScreenshotEl) {
        noScreenshotEl.style.visibility = loading ? 'hidden' : '';
    }
}

let isSliding = false;
let skipSidePreviewRender = false;  // Flag to skip re-rendering side previews after pre-render
let isInitialLoadInProgress = false;
let renderFrameScheduled = false;  // Throttle renders to 60fps
let isDragging = false;  // Track if currently dragging for optimization

// Two-finger horizontal swipe to navigate between screenshots
let swipeAccumulator = 0;
const SWIPE_THRESHOLD = 50; // Minimum accumulated delta to trigger navigation

// Prevent browser back/forward gesture on the entire canvas area
canvasWrapper.addEventListener('wheel', (e) => {
    // Prevent horizontal scroll from triggering browser back/forward
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
    }
}, { passive: false });

previewStrip.addEventListener('wheel', (e) => {
    // Only handle horizontal scrolling (two-finger swipe on trackpad)
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;

    e.preventDefault();
    e.stopPropagation();

    if (isSliding) return;
    if (state.screenshots.length <= 1) return;

    swipeAccumulator += e.deltaX;

    if (swipeAccumulator > SWIPE_THRESHOLD) {
        // Swipe left = go to next screenshot
        const nextIndex = state.selectedIndex + 1;
        if (nextIndex < state.screenshots.length) {
            slideToScreenshot(nextIndex, 'right');
        }
        swipeAccumulator = 0;
    } else if (swipeAccumulator < -SWIPE_THRESHOLD) {
        // Swipe right = go to previous screenshot
        const prevIndex = state.selectedIndex - 1;
        if (prevIndex >= 0) {
            slideToScreenshot(prevIndex, 'left');
        }
        swipeAccumulator = 0;
    }
}, { passive: false });
let suppressSwitchModelUpdate = false;  // Flag to suppress updateCanvas from switchPhoneModel
const fileInput = document.getElementById('file-input');
const screenshotList = document.getElementById('screenshot-list');
const filesList = document.getElementById('files-list');
const mediaUploadInput = document.getElementById('media-upload-input');
const noScreenshot = document.getElementById('no-screenshot');
const canvasContextMenu = document.getElementById('canvas-context-menu');
const canvasSelectionToolbar = document.getElementById('canvas-selection-toolbar');

// Keep context menu at document root so fixed positioning is stable
if (canvasContextMenu && canvasContextMenu.parentElement !== document.body) {
    document.body.appendChild(canvasContextMenu);
}

// IndexedDB for larger storage (can store hundreds of MB vs localStorage's 5-10MB)
let db = null;
const DB_NAME = 'AppStoreScreenshotGenerator';
const DB_VERSION = 2;
const PROJECTS_STORE = 'projects';
const META_STORE = 'meta';

let currentProjectId = null;
let projects = [];
const pendingSaveTimers = new Map();
let hasUnsavedChanges = false;
let lastSavedSnapshotSignature = '';
const requestedProjectId = (() => {
    const match = window.location.pathname.match(/^\/editor\/([0-9a-fA-F-]{36})\/?$/);
    return match ? match[1] : null;
})();

function getSnapshotSignature(snapshot = buildSerializableStateSnapshot()) {
    return JSON.stringify(snapshot);
}

function updateSaveButtonState() {
    const saveBtn = document.getElementById('save-project-btn');
    if (!saveBtn) return;

    saveBtn.classList.toggle('has-unsaved', hasUnsavedChanges);
}

function syncUnsavedChanges(snapshot = buildSerializableStateSnapshot()) {
    if (isInitialLoadInProgress || editorHistory.applying) return;

    const isDirty = getSnapshotSignature(snapshot) !== lastSavedSnapshotSignature;
    if (hasUnsavedChanges === isDirty) return;

    hasUnsavedChanges = isDirty;
    updateSaveButtonState();
}

function commitSavedSnapshot(snapshot = buildSerializableStateSnapshot()) {
    lastSavedSnapshotSignature = getSnapshotSignature(snapshot);
    hasUnsavedChanges = false;
    updateSaveButtonState();
}

async function apiRequest(path, options = {}) {
    const isFormData = options.body instanceof FormData;
    const headers = isFormData
        ? { ...(options.headers || {}) }
        : {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

    const response = await fetch(path, {
        credentials: 'include',
        headers,
        ...options
    });

    if (!response.ok) {
        if (response.status === 401) {
            window.location.href = '/';
        }
        throw new Error(`Request failed: ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
}

function scheduleServerSave(snapshot, projectId, options = {}) {
    const targetProjectId = projectId ?? currentProjectId;
    if (!targetProjectId) return;
    const delayMs = typeof options.delayMs === 'number' ? options.delayMs : 500;

    if (pendingSaveTimers.has(targetProjectId)) {
        clearTimeout(pendingSaveTimers.get(targetProjectId));
    }

    const timerId = setTimeout(async () => {
        try {
            await apiRequest(`/api/projects/${targetProjectId}/`, {
                method: 'POST',
                body: JSON.stringify({
                    payload: snapshot
                })
            });
        } catch (e) {
            console.error('Failed to save project to server:', e);
        } finally {
            pendingSaveTimers.delete(targetProjectId);
        }
    }, delayMs);

    pendingSaveTimers.set(targetProjectId, timerId);
}

async function uploadMediaFile(file) {
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);

    const uploaded = await apiRequest('/api/media-files/', {
        method: 'POST',
        body: formData
    });

    await refreshMediaLibrary();
    return uploaded;
}

function getImageFromUrl(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image failed to load'));
        img.src = url;
    });
}

function formatFileSize(bytes) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function applyMediaAsScreenshot(url, name) {
    try {
        const img = await getImageFromUrl(url);
        createNewScreenshot(img, url, name || 'Uploaded Image', detectLanguageFromFilename(name || 'image.png'), state.outputDevice);
        state.selectedIndex = state.screenshots.length - 1;
        updateScreenshotList();
        syncUIWithState();
        updateCanvas();
        saveState();
    } catch (e) {
        console.error('Unable to use media as screenshot:', e);
    }
}

async function replaceScreenshotWithMedia(index, url, name) {
    const screenshot = state.screenshots[index];
    if (!screenshot) return;

    try {
        const img = await getImageFromUrl(url);
        const lang = state.currentLanguage;

        if (!screenshot.localizedImages) {
            screenshot.localizedImages = {};
        }

        screenshot.localizedImages[lang] = {
            image: img,
            src: url,
            name: name || 'Uploaded Image'
        };
        screenshot.image = img;

        state.selectedIndex = index;
        updateScreenshotList();
        syncUIWithState();
        updateCanvas();
        saveState();
    } catch (e) {
        console.error('Unable to replace screenshot with media:', e);
    }
}

function screenshotUsesMediaUrl(screenshot, mediaUrl) {
    if (!screenshot || !mediaUrl) return false;

    if (screenshot.src === mediaUrl || screenshot.image?.src === mediaUrl) {
        return true;
    }

    const localizedImages = screenshot.localizedImages || {};
    return Object.values(localizedImages).some((langData) => {
        return langData?.src === mediaUrl || langData?.image?.src === mediaUrl;
    });
}

function deleteScreenshotsLinkedToMediaUrl(mediaUrl) {
    if (!mediaUrl || !Array.isArray(state.screenshots) || state.screenshots.length === 0) return 0;

    const indicesToDelete = [];
    state.screenshots.forEach((screenshot, index) => {
        if (screenshotUsesMediaUrl(screenshot, mediaUrl)) {
            indicesToDelete.push(index);
        }
    });

    if (!indicesToDelete.length) return 0;

    const wasSelectedScreenshotDeleted = indicesToDelete.includes(state.selectedIndex);

    for (let i = indicesToDelete.length - 1; i >= 0; i--) {
        state.screenshots.splice(indicesToDelete[i], 1);
    }

    if (!state.screenshots.length) {
        state.selectedIndex = 0;
        selectedCanvasTarget = null;
        return indicesToDelete.length;
    }

    const deletedBeforeSelection = indicesToDelete.filter(index => index < state.selectedIndex).length;
    state.selectedIndex = Math.max(0, state.selectedIndex - deletedBeforeSelection);

    if (wasSelectedScreenshotDeleted) {
        state.selectedIndex = Math.min(indicesToDelete[0], state.screenshots.length - 1);
    }

    state.selectedIndex = Math.min(state.selectedIndex, state.screenshots.length - 1);
    return indicesToDelete.length;
}

async function deleteMediaFile(fileId, fileUrl = '') {
    try {
        await apiRequest(`/api/media-files/${fileId}/`, {
            method: 'DELETE'
        });
        if (fileUrl) {
            const deletedCount = deleteScreenshotsLinkedToMediaUrl(fileUrl);
            if (deletedCount > 0) {
                if (state.screenshots.length > 0) {
                    setSelectedCanvasTarget({ type: 'screenshot' }, { skipCanvasRefresh: true });
                } else {
                    setSelectedCanvasTarget(null, { skipCanvasRefresh: true });
                }
                updateScreenshotList();
                syncUIWithState();
                updateGradientStopsUI();
                updateCanvas();
                saveState();
            }
        }
        await refreshMediaLibrary();
    } catch (e) {
        console.error('Failed to delete media file:', e);
    }
}

async function applyMediaAsBackground(url) {
    try {
        const img = await getImageFromUrl(url);
        setBackground('type', 'image');
        setBackground('image', img);
        const preview = document.getElementById('bg-image-preview');
        if (preview) {
            preview.src = url;
            preview.style.display = 'block';
        }
        updateCanvas();
        saveState();
    } catch (e) {
        console.error('Unable to use media as background:', e);
    }
}

async function refreshMediaLibrary() {
    if (!filesList) return;

    try {
        const files = await apiRequest('/api/media-files/');
        if (!Array.isArray(files) || files.length === 0) {
            filesList.innerHTML = '<div class="files-empty">No uploaded files yet</div>';
            return;
        }

        filesList.innerHTML = files.map((file) => `
            <div class="file-item" draggable="true" data-file-id="${file.id}" data-file-url="${file.url.replace(/'/g, "\\'")}" data-file-name="${(file.name || '').replace(/'/g, "\\'")}">
                <img class="file-thumb" src="${file.url}" alt="${file.name}">
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-meta">${formatFileSize(file.size)}</div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn file-delete-btn" type="button" title="Delete file" aria-label="Delete file" data-file-id="${file.id}" data-file-url="${file.url.replace(/'/g, "\\'")}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path>
                            <path d="M10 11v6"></path>
                            <path d="M14 11v6"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        filesList.querySelectorAll('.file-item').forEach((item) => {
            item.addEventListener('dragstart', (e) => {
                const payload = {
                    id: item.dataset.fileId,
                    url: item.dataset.fileUrl,
                    name: item.dataset.fileName || ''
                };
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/x-media-file', JSON.stringify(payload));
                e.dataTransfer.setData('text/plain', payload.url || '');
            });
        });

        filesList.querySelectorAll('.file-delete-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = btn.dataset.fileId;
                const fileUrl = btn.dataset.fileUrl || '';
                if (fileId) {
                    deleteMediaFile(fileId, fileUrl);
                }
            });
        });
    } catch (e) {
        console.error('Failed to load media library:', e);
    }
}

window.useMediaAsScreenshot = applyMediaAsScreenshot;
window.useMediaAsBackground = applyMediaAsBackground;

function getDraggedMediaFileData(event) {
    const dataTransfer = event?.dataTransfer;
    if (!dataTransfer) return null;

    const rawData = dataTransfer.getData('application/x-media-file') || dataTransfer.getData('text/plain');
    if (!rawData) return null;

    try {
        return JSON.parse(rawData);
    } catch (_error) {
        const url = rawData.trim();
        return url ? { url, name: '' } : null;
    }
}

function isMediaFileDrag(event) {
    const types = event?.dataTransfer?.types;
    if (!types) return false;

    if (typeof types.includes === 'function') {
        return types.includes('application/x-media-file') || types.includes('Files');
    }

    return Array.from(types).includes('application/x-media-file') || Array.from(types).includes('Files');
}

async function handleMediaDropOnScreenshot(index, event) {
    const mediaFile = getDraggedMediaFileData(event);
    if (!mediaFile) return false;

    event.preventDefault();
    event.stopPropagation();

    await replaceScreenshotWithMedia(index, mediaFile.url, mediaFile.name);
    return true;
}

function bindMediaDropTarget(wrapper, getTargetIndex) {
    if (!wrapper || wrapper.dataset.mediaDropBound === 'true') return;

    wrapper.dataset.mediaDropBound = 'true';

    wrapper.addEventListener('dragover', (e) => {
        if (!isMediaFileDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        wrapper.classList.add('drop-active');
    });

    wrapper.addEventListener('dragleave', (e) => {
        if (!wrapper.contains(e.relatedTarget)) {
            wrapper.classList.remove('drop-active');
        }
    });

    wrapper.addEventListener('drop', async (e) => {
        wrapper.classList.remove('drop-active');
        const targetIndex = getTargetIndex();
        await handleMediaDropOnScreenshot(targetIndex, e);
    });
}

function openDatabase() {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                // Continue without database
                resolve(null);
            };

            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Delete old store if exists (from version 1)
                if (database.objectStoreNames.contains('state')) {
                    database.deleteObjectStore('state');
                }

                // Create projects store
                if (!database.objectStoreNames.contains(PROJECTS_STORE)) {
                    database.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
                }

                // Create meta store for project list and current project
                if (!database.objectStoreNames.contains(META_STORE)) {
                    database.createObjectStore(META_STORE, { keyPath: 'key' });
                }
            };

            request.onblocked = () => {
                console.warn('Database upgrade blocked. Please close other tabs.');
                resolve(null);
            };
        } catch (e) {
            console.error('Failed to open IndexedDB:', e);
            resolve(null);
        }
    });
}

// Load project list and current project
async function loadProjectsMeta() {
    try {
        const serverProjects = await apiRequest('/api/projects/');
        projects = (serverProjects || []).map((project) => ({
            id: project.id,
            name: project.name,
            screenshotCount: Array.isArray(project.payload?.screenshots) ? project.payload.screenshots.length : 0
        }));

        if (!projects.length) {
            const created = await apiRequest('/api/projects/', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'Untitled Project',
                    payload: { screenshots: [] }
                })
            });

            projects = [{
                id: created.id,
                name: created.name,
                screenshotCount: Array.isArray(created.payload?.screenshots) ? created.payload.screenshots.length : 0
            }];
            currentProjectId = created.id;
        } else {
            currentProjectId = requestedProjectId && projects.some(p => p.id === requestedProjectId)
                ? requestedProjectId
                : projects[0].id;
        }

        updateProjectSelector();
    } catch (e) {
        console.error('Error loading projects from server:', e);

        if (!db) return;

        await new Promise((resolve) => {
            try {
                const transaction = db.transaction([META_STORE], 'readonly');
                const store = transaction.objectStore(META_STORE);

                const projectsReq = store.get('projects');
                const currentReq = store.get('currentProject');

                transaction.oncomplete = () => {
                    if (projectsReq.result) {
                        projects = projectsReq.result.value;
                    }
                    if (currentReq.result) {
                        currentProjectId = currentReq.result.value;
                    }
                    if (!currentProjectId && projects.length) {
                        currentProjectId = projects[0].id;
                    }
                    updateProjectSelector();
                    resolve();
                };

                transaction.onerror = () => resolve();
            } catch (err) {
                resolve();
            }
        });
    }
}

// Save project list and current project
function saveProjectsMeta() {
    updateProjectSelector();
}

// Update project selector dropdown
function updateProjectSelector() {
    const menu = document.getElementById('project-menu');
    menu.innerHTML = '';

    if (!projects.length) {
        document.getElementById('project-trigger-name').textContent = 'No Projects';
        document.getElementById('project-trigger-meta').textContent = '0 screenshots';
        return;
    }

    // Find current project
    const currentProject = projects.find(p => p.id === currentProjectId) || projects[0];

    // Update trigger display - always use actual state for current project
    document.getElementById('project-trigger-name').textContent = currentProject.name;
    const count = state.screenshots.length;
    document.getElementById('project-trigger-meta').textContent = `${count} screenshot${count !== 1 ? 's' : ''}`;

    // Build menu options
    projects.forEach(project => {
        const option = document.createElement('div');
        option.className = 'project-option' + (project.id === currentProjectId ? ' selected' : '');
        option.dataset.projectId = project.id;

        const screenshotCount = project.id === currentProjectId ? state.screenshots.length : (project.screenshotCount || 0);

        option.innerHTML = `
            <span class="project-option-name">${project.name}</span>
            <span class="project-option-meta">${screenshotCount} screenshot${screenshotCount !== 1 ? 's' : ''}</span>
        `;

        option.addEventListener('click', (e) => {
            e.stopPropagation();
            if (project.id !== currentProjectId) {
                switchProject(project.id);
            }
            document.getElementById('project-dropdown').classList.remove('open');
        });

        menu.appendChild(option);
    });
}

// Initialize
async function init() {
    isInitialLoadInProgress = true;
    updateCanvas();
    try {
        await openDatabase();
        await loadProjectsMeta();
        await loadState();
        await refreshMediaLibrary();
        syncUIWithState();
        updateCanvas();
        resetHistoryFromCurrentState();
    } catch (e) {
        console.error('Initialization error:', e);
        // Continue with defaults
        syncUIWithState();
        updateCanvas();
        resetHistoryFromCurrentState();
    } finally {
        isInitialLoadInProgress = false;
        updateCanvas();
    }
}

// Set up event listeners immediately (don't wait for async init)
function initSync() {
    setupEventListeners();
    setupKeyboardShortcuts();
    setupElementEventListeners();
    setupPopoutEventListeners();
    setupCustomTooltips();
    setupSliderResetButtons();
    initFontPicker();
    updateGradientStopsUI();
    updateCanvas();
    // Then load saved data asynchronously
    init();
}

function buildSerializableStateSnapshot() {
    const screenshotsToSave = state.screenshots.map(s => {
        const localizedImages = {};
        if (s.localizedImages) {
            Object.keys(s.localizedImages).forEach(lang => {
                const langData = s.localizedImages[lang];
                if (langData?.src) {
                    localizedImages[lang] = {
                        src: langData.src,
                        name: langData.name
                    };
                }
            });
        }

        return {
            src: s.image?.src || '',
            name: s.name,
            deviceType: s.deviceType,
            localizedImages: localizedImages,
            background: s.background,
            screenshot: s.screenshot,
            text: s.text,
            elements: (s.elements || []).map(el => ({
                ...el,
                image: undefined
            })),
            popouts: s.popouts || [],
            overrides: s.overrides
        };
    });

    return {
        id: currentProjectId,
        formatVersion: 2,
        screenshots: screenshotsToSave,
        selectedIndex: state.selectedIndex,
        outputDevice: state.outputDevice,
        customWidth: state.customWidth,
        customHeight: state.customHeight,
        currentLanguage: state.currentLanguage,
        projectLanguages: state.projectLanguages,
        aiAnalysisCache: state.aiAnalysisCache,
        defaults: state.defaults
    };
}

function pushHistorySnapshot(snapshot) {
    if (editorHistory.applying) return;

    const serialized = JSON.stringify(snapshot);
    const lastSerialized = editorHistory.undoStack[editorHistory.undoStack.length - 1];
    if (lastSerialized === serialized) return;

    editorHistory.undoStack.push(serialized);
    if (editorHistory.undoStack.length > editorHistory.maxEntries) {
        editorHistory.undoStack.shift();
    }
    editorHistory.redoStack = [];
}

function resetHistoryFromCurrentState() {
    editorHistory.undoStack = [];
    editorHistory.redoStack = [];
    pushHistorySnapshot(buildSerializableStateSnapshot());
}

function applySerializableStateSnapshot(snapshot) {
    if (!snapshot) return;

    editorHistory.applying = true;
    try {
        state.screenshots = [];
        state.outputDevice = snapshot.outputDevice || 'iphone-6.9';
        state.customWidth = snapshot.customWidth || 1320;
        state.customHeight = snapshot.customHeight || 2868;
        state.currentLanguage = snapshot.currentLanguage || 'en';
        state.projectLanguages = normalizeProjectLanguages(snapshot.projectLanguages);
        state.aiAnalysisCache = snapshot.aiAnalysisCache
            ? JSON.parse(JSON.stringify(snapshot.aiAnalysisCache))
            : (state.aiAnalysisCache || {});
        if (!state.projectLanguages.includes(state.currentLanguage)) {
            state.currentLanguage = state.projectLanguages[0];
        }

        if (snapshot.defaults) {
            state.defaults = JSON.parse(JSON.stringify(snapshot.defaults));
            if (!state.defaults.elements) state.defaults.elements = [];
            if (!state.defaults.popouts) state.defaults.popouts = [];
        }

        const serializedScreenshots = Array.isArray(snapshot.screenshots) ? snapshot.screenshots : [];
        serializedScreenshots.forEach(s => {
            const hydrated = {
                image: null,
                name: s.name,
                deviceType: s.deviceType,
                localizedImages: {},
                background: s.background || JSON.parse(JSON.stringify(state.defaults.background)),
                screenshot: s.screenshot || JSON.parse(JSON.stringify(state.defaults.screenshot)),
                text: s.text || JSON.parse(JSON.stringify(state.defaults.text)),
                elements: reconstructElementImages(s.elements),
                popouts: s.popouts || [],
                overrides: s.overrides || {}
            };

            if (s.localizedImages && Object.keys(s.localizedImages).length > 0) {
                Object.keys(s.localizedImages).forEach(lang => {
                    const langData = s.localizedImages[lang];
                    if (!langData?.src) return;

                    const img = new Image();
                    img.onload = () => updateCanvas();
                    img.src = langData.src;

                    hydrated.localizedImages[lang] = {
                        image: img,
                        src: langData.src,
                        name: langData.name || s.name
                    };
                });

                const firstLang = Object.keys(hydrated.localizedImages)[0];
                const activeLang = hydrated.localizedImages[state.currentLanguage] ? state.currentLanguage : firstLang;
                hydrated.image = hydrated.localizedImages[activeLang]?.image || null;
            } else if (s.src) {
                const img = new Image();
                img.onload = () => updateCanvas();
                img.src = s.src;
                hydrated.image = img;
            }

            state.screenshots.push(hydrated);
        });

        const maxIndex = Math.max(0, state.screenshots.length - 1);
        state.selectedIndex = Math.min(Math.max(snapshot.selectedIndex || 0, 0), maxIndex);

        selectedElementId = null;
        selectedPopoutId = null;
        selectedCanvasTarget = null;
        hoveredCanvasTarget = null;
    } finally {
        editorHistory.applying = false;
    }

    updateScreenshotList();
    syncUIWithState();
    updateGradientStopsUI();
    updateCanvas();
    commitSavedSnapshot(buildSerializableStateSnapshot());
}

function undoEditorState() {
    if (editorHistory.undoStack.length <= 1) return;

    const currentSnapshot = editorHistory.undoStack.pop();
    editorHistory.redoStack.push(currentSnapshot);

    const previousSerialized = editorHistory.undoStack[editorHistory.undoStack.length - 1];
    if (!previousSerialized) return;

    applySerializableStateSnapshot(JSON.parse(previousSerialized));
}

function redoEditorState() {
    if (editorHistory.redoStack.length === 0) return;

    const nextSerialized = editorHistory.redoStack.pop();
    editorHistory.undoStack.push(nextSerialized);
    applySerializableStateSnapshot(JSON.parse(nextSerialized));
}

function isEditableShortcutTarget(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;

    const tag = (target.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'select') return true;

    if (tag === 'input') {
        const type = (target.type || 'text').toLowerCase();
        return !['button', 'checkbox', 'color', 'file', 'radio', 'range', 'reset', 'submit'].includes(type);
    }

    return false;
}

function setupKeyboardShortcuts() {
    if (editorHistory.shortcutsBound) return;
    editorHistory.shortcutsBound = true;

    document.addEventListener('keydown', (e) => {
        const isModifierPressed = e.ctrlKey || e.metaKey;
        if (!isModifierPressed || e.altKey) return;
        if (isEditableShortcutTarget(e.target)) return;

        const key = (e.key || '').toLowerCase();

        if (key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undoEditorState();
            return;
        }

        if (key === 'y' || (key === 'z' && e.shiftKey)) {
            e.preventDefault();
            redoEditorState();
        }
    });
}

// Save state to IndexedDB for current project
function saveState(options = {}) {
    const shouldPersist = !!options.persist;
    const stateToSave = buildSerializableStateSnapshot();
    if (!options.skipHistory) {
        pushHistorySnapshot(stateToSave);
    }

    if (!shouldPersist) {
        syncUnsavedChanges(stateToSave);
        return;
    }

    scheduleServerSave(stateToSave, currentProjectId, { delayMs: 0 });

    commitSavedSnapshot(stateToSave);

    if (!db) return;

    // Update screenshot count in project metadata
    const project = projects.find(p => p.id === currentProjectId);
    if (project) {
        project.screenshotCount = state.screenshots.length;
        saveProjectsMeta();
    }

    try {
        const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
        const store = transaction.objectStore(PROJECTS_STORE);
        store.put(stateToSave);
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

// Migrate 3D positions from old formula to new formula
// Old: xOffset = ((x-50)/50)*2, yOffset = -((y-50)/50)*3
// New: xOffset = ((x-50)/50)*(1-scale)*0.9, yOffset = -((y-50)/50)*(1-scale)*2
function migrate3DPosition(screenshotSettings) {
    if (!screenshotSettings?.use3D) return; // Only migrate 3D screenshots

    const scale = (screenshotSettings.scale || 70) / 100;
    const oldX = screenshotSettings.x ?? 50;
    const oldY = screenshotSettings.y ?? 50;

    // Convert old position to new position that produces same visual offset
    // newX = 50 + (oldX - 50) * oldFactor / newFactor
    const xFactor = 2 / ((1 - scale) * 0.9);
    const yFactor = 3 / ((1 - scale) * 2);

    screenshotSettings.x = Math.max(0, Math.min(100, 50 + (oldX - 50) * xFactor));
    screenshotSettings.y = Math.max(0, Math.min(100, 50 + (oldY - 50) * yFactor));
}

// Reconstruct Image objects for graphic/icon elements from saved data
function reconstructElementImages(elements) {
    if (!elements || !Array.isArray(elements)) return [];
    return elements.map(el => {
        const restored = { ...el };
        if ((el.type === 'graphic' || el.type === 'device') && el.src) {
            const img = new Image();
            img.src = el.src;
            restored.image = img;
        } else if (el.type === 'icon' && el.iconName) {
            // Async fetch; image will be null initially, then updateCanvas() when ready
            getLucideImage(el.iconName, el.iconColor || '#ffffff', el.iconStrokeWidth || 2)
                .then(img => {
                    restored.image = img;
                    updateCanvas();
                })
                .catch(e => console.error('Failed to reconstruct icon:', e));
        }
        return restored;
    });
}

// Load state from IndexedDB for current project
async function loadState() {
    if (currentProjectId) {
        try {
            const project = await apiRequest(`/api/projects/${currentProjectId}/`);
            if (project?.payload && typeof project.payload === 'object') {
                applySerializableStateSnapshot(project.payload);
                return;
            }
            resetStateToDefaults();
            updateScreenshotList();
            return;
        } catch (e) {
            console.error('Error loading state from server:', e);
        }
    }

    if (!db) return Promise.resolve();

    return new Promise((resolve) => {
        try {
            const transaction = db.transaction([PROJECTS_STORE], 'readonly');
            const store = transaction.objectStore(PROJECTS_STORE);
            const request = store.get(currentProjectId);

            request.onsuccess = () => {
                const parsed = request.result;
                if (parsed) {
                    // Check if this is an old-style project (no per-screenshot settings)
                    const isOldFormat = !parsed.defaults && (parsed.background || parsed.screenshot || parsed.text);
                    const hasScreenshotsWithoutSettings = parsed.screenshots?.some(s => !s.background && !s.screenshot && !s.text);
                    const needsMigration = isOldFormat || hasScreenshotsWithoutSettings;

                    // Check if we need to migrate 3D positions (formatVersion < 2)
                    const needs3DMigration = !parsed.formatVersion || parsed.formatVersion < 2;

                    // Load screenshots with their per-screenshot settings
                    state.screenshots = [];

                    // Build migrated settings from old format if needed
                    let migratedBackground = state.defaults.background;
                    let migratedScreenshot = state.defaults.screenshot;
                    let migratedText = state.defaults.text;

                    if (isOldFormat) {
                        if (parsed.background) {
                            migratedBackground = {
                                type: parsed.background.type || 'gradient',
                                gradient: parsed.background.gradient || state.defaults.background.gradient,
                                solid: parsed.background.solid || state.defaults.background.solid,
                                image: null,
                                imageFit: parsed.background.imageFit || 'cover',
                                imageBlur: parsed.background.imageBlur || 0,
                                overlayColor: parsed.background.overlayColor || '#000000',
                                overlayOpacity: parsed.background.overlayOpacity || 0,
                                noise: parsed.background.noise || false,
                                noiseIntensity: parsed.background.noiseIntensity || 10
                            };
                        }
                        if (parsed.screenshot) {
                            migratedScreenshot = { ...state.defaults.screenshot, ...parsed.screenshot };
                        }
                        if (parsed.text) {
                            migratedText = { ...state.defaults.text, ...parsed.text };
                        }
                    }

                    if (parsed.screenshots && parsed.screenshots.length > 0) {
                        let loadedCount = 0;
                        const totalToLoad = parsed.screenshots.length;

                        parsed.screenshots.forEach((s, index) => {
                            // Check if we have new localized format or old single-image format
                            const hasLocalizedImages = s.localizedImages && Object.keys(s.localizedImages).length > 0;

                            if (!hasLocalizedImages && !s.src) {
                                // Blank screen (no image)
                                const screenshotSettings = s.screenshot || JSON.parse(JSON.stringify(migratedScreenshot));
                                if (needs3DMigration) {
                                    migrate3DPosition(screenshotSettings);
                                }
                                state.screenshots[index] = {
                                    image: null,
                                    name: s.name || 'Blank Screen',
                                    deviceType: s.deviceType,
                                    localizedImages: {},
                                    background: s.background || JSON.parse(JSON.stringify(migratedBackground)),
                                    screenshot: screenshotSettings,
                                    text: s.text || JSON.parse(JSON.stringify(migratedText)),
                                    elements: reconstructElementImages(s.elements),
                                    popouts: s.popouts || [],
                                    overrides: s.overrides || {}
                                };
                                loadedCount++;
                                checkAllLoaded();
                            } else if (hasLocalizedImages) {
                                // New format: load all localized images
                                const langKeys = Object.keys(s.localizedImages);
                                let langLoadedCount = 0;
                                const localizedImages = {};

                                langKeys.forEach(lang => {
                                    const langData = s.localizedImages[lang];
                                    if (langData?.src) {
                                        const langImg = new Image();
                                        langImg.onload = () => {
                                            localizedImages[lang] = {
                                                image: langImg,
                                                src: langData.src,
                                                name: langData.name || s.name
                                            };
                                            langLoadedCount++;

                                            if (langLoadedCount === langKeys.length) {
                                                // All language versions loaded
                                                const firstLang = langKeys[0];
                                                const screenshotSettings = s.screenshot || JSON.parse(JSON.stringify(migratedScreenshot));
                                                if (needs3DMigration) {
                                                    migrate3DPosition(screenshotSettings);
                                                }
                                                state.screenshots[index] = {
                                                    image: localizedImages[firstLang]?.image, // Legacy compat
                                                    name: s.name,
                                                    deviceType: s.deviceType,
                                                    localizedImages: localizedImages,
                                                    background: s.background || JSON.parse(JSON.stringify(migratedBackground)),
                                                    screenshot: screenshotSettings,
                                                    text: s.text || JSON.parse(JSON.stringify(migratedText)),
                                                    elements: reconstructElementImages(s.elements),
                                                    popouts: s.popouts || [],
                                                    overrides: s.overrides || {}
                                                };
                                                loadedCount++;
                                                checkAllLoaded();
                                            }
                                        };
                                        langImg.src = langData.src;
                                    } else {
                                        langLoadedCount++;
                                        if (langLoadedCount === langKeys.length) {
                                            loadedCount++;
                                            checkAllLoaded();
                                        }
                                    }
                                });
                            } else {
                                // Old format: migrate to localized images
                                const img = new Image();
                                img.onload = () => {
                                    // Detect language from filename, default to 'en'
                                    const detectedLang = typeof detectLanguageFromFilename === 'function'
                                        ? detectLanguageFromFilename(s.name || '')
                                        : 'en';

                                    const localizedImages = {};
                                    localizedImages[detectedLang] = {
                                        image: img,
                                        src: s.src,
                                        name: s.name
                                    };

                                    const screenshotSettings = s.screenshot || JSON.parse(JSON.stringify(migratedScreenshot));
                                    if (needs3DMigration) {
                                        migrate3DPosition(screenshotSettings);
                                    }
                                    state.screenshots[index] = {
                                        image: img,
                                        name: s.name,
                                        deviceType: s.deviceType,
                                        localizedImages: localizedImages,
                                        background: s.background || JSON.parse(JSON.stringify(migratedBackground)),
                                        screenshot: screenshotSettings,
                                        text: s.text || JSON.parse(JSON.stringify(migratedText)),
                                        elements: reconstructElementImages(s.elements),
                                        popouts: s.popouts || [],
                                        overrides: s.overrides || {}
                                    };
                                    loadedCount++;
                                    checkAllLoaded();
                                };
                                img.src = s.src;
                            }
                        });

                        function checkAllLoaded() {
                            if (loadedCount === totalToLoad) {
                                updateScreenshotList();
                                syncUIWithState();
                                updateGradientStopsUI();
                                updateCanvas();

                                if (needsMigration && parsed.screenshots.length > 0) {
                                    showMigrationPrompt();
                                }
                            }
                        }
                    } else {
                        // No screenshots - still need to update UI
                        updateScreenshotList();
                        syncUIWithState();
                        updateGradientStopsUI();
                        updateCanvas();
                    }

                    state.selectedIndex = parsed.selectedIndex || 0;
                    state.outputDevice = parsed.outputDevice || 'iphone-6.9';
                    state.customWidth = parsed.customWidth || 1320;
                    state.customHeight = parsed.customHeight || 2868;

                    // Load global language settings
                    state.currentLanguage = parsed.currentLanguage || 'en';
                    state.projectLanguages = normalizeProjectLanguages(parsed.projectLanguages);
                    if (!state.projectLanguages.includes(state.currentLanguage)) {
                        state.currentLanguage = state.projectLanguages[0];
                    }

                    // Load defaults (new format) or use migrated settings
                    if (parsed.defaults) {
                        state.defaults = parsed.defaults;
                        // Ensure elements array exists (may be missing from older saves)
                        if (!state.defaults.elements) state.defaults.elements = [];
                    } else {
                        state.defaults.background = migratedBackground;
                        state.defaults.screenshot = migratedScreenshot;
                        state.defaults.text = migratedText;
                    }
                } else {
                    // New project, reset to defaults
                    resetStateToDefaults();
                    updateScreenshotList();
                }

                commitSavedSnapshot(buildSerializableStateSnapshot());
                resolve();
            };

            request.onerror = () => {
                console.error('Error loading state:', request.error);
                resolve();
            };
        } catch (e) {
            console.error('Error loading state:', e);
            resolve();
        }
    });
}

// Show migration prompt for old-style projects
function showMigrationPrompt() {
    const modal = document.getElementById('migration-modal');
    if (modal) {
        modal.classList.add('visible');
    }
}

function hideMigrationPrompt() {
    const modal = document.getElementById('migration-modal');
    if (modal) {
        modal.classList.remove('visible');
    }
}

function convertProject() {
    // Project is already converted in memory, just save it
    saveState();
    hideMigrationPrompt();
}

// Reset state to defaults (without clearing storage)
function resetStateToDefaults() {
    state.screenshots = [];
    state.selectedIndex = 0;
    state.outputDevice = 'iphone-6.9';
    state.customWidth = 1320;
    state.customHeight = 2868;
    state.currentLanguage = 'en';
    state.projectLanguages = ['en'];
    state.aiAnalysisCache = {};
    state.defaults = {
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
        }
    };
}

// Switch to a different project
async function switchProject(projectId) {
    // Save current project first
    saveState({ persist: true, skipHistory: true, suppressDirty: true });

    currentProjectId = projectId;
    window.history.replaceState({}, '', `/editor/${projectId}/`);
    saveProjectsMeta();

    // Reset and load new project
    resetStateToDefaults();
    await loadState();

    syncUIWithState();
    updateScreenshotList();
    updateGradientStopsUI();
    updateProjectSelector();
    updateCanvas();
    resetHistoryFromCurrentState();
    commitSavedSnapshot(buildSerializableStateSnapshot());
}

// Create a new project
async function createProject(name) {
    try {
        const created = await apiRequest('/api/projects/', {
            method: 'POST',
            body: JSON.stringify({
                name,
                payload: {
                    screenshots: []
                }
            })
        });

        projects.push({
            id: created.id,
            name: created.name,
            screenshotCount: 0
        });
        saveProjectsMeta();
        await switchProject(created.id);
        updateProjectSelector();
    } catch (e) {
        console.error('Failed to create project:', e);
        await showAppAlert('Could not create project', 'error');
    }
}

// Rename current project
function renameProject(newName) {
    const project = projects.find(p => p.id === currentProjectId);
    if (project) {
        project.name = newName;
        saveProjectsMeta();
        updateProjectSelector();

        apiRequest(`/api/projects/${currentProjectId}/`, {
            method: 'POST',
            body: JSON.stringify({ name: newName })
        }).catch((e) => {
            console.error('Failed to rename project:', e);
        });
    }
}

// Delete current project
async function deleteProject() {
    if (projects.length <= 1) {
        await showAppAlert('Cannot delete the only project', 'info');
        return;
    }

    // Remove from projects list
    const index = projects.findIndex(p => p.id === currentProjectId);
    if (index > -1) {
        projects.splice(index, 1);
    }

    try {
        await apiRequest(`/api/projects/${currentProjectId}/`, {
            method: 'DELETE'
        });
    } catch (e) {
        console.error('Failed to delete project:', e);
        await showAppAlert('Could not delete project', 'error');
        return;
    }

    // Switch to first available project
    saveProjectsMeta();
    await switchProject(projects[0].id);
    updateProjectSelector();
}

async function duplicateProject(sourceProjectId, customName) {
    try {
        const source = await apiRequest(`/api/projects/${sourceProjectId}/`);
        if (!source) {
            await showAppAlert('Could not read project data', 'error');
            return;
        }

        const sourceProject = projects.find(p => p.id === sourceProjectId);
        const newName = customName || (sourceProject ? sourceProject.name : 'Project') + ' (Copy)';
        const clonedPayload = JSON.parse(JSON.stringify(source.payload || { screenshots: [] }));

        const created = await apiRequest('/api/projects/', {
            method: 'POST',
            body: JSON.stringify({
                name: newName,
                payload: clonedPayload
            })
        });

        projects.push({
            id: created.id,
            name: created.name,
            screenshotCount: Array.isArray(created.payload?.screenshots) ? created.payload.screenshots.length : 0
        });
        saveProjectsMeta();

        await switchProject(created.id);
        updateProjectSelector();
    } catch (e) {
        console.error('Failed to duplicate project:', e);
        await showAppAlert('Could not duplicate project', 'error');
    }
}

function duplicateScreenshot(index) {
    const original = state.screenshots[index];
    if (!original) return;

    const clone = JSON.parse(JSON.stringify({
        name: original.name,
        deviceType: original.deviceType,
        background: original.background,
        screenshot: original.screenshot,
        text: original.text,
        overrides: original.overrides
    }));

    const nameParts = clone.name.split('.');
    if (nameParts.length > 1) {
        const ext = nameParts.pop();
        clone.name = nameParts.join('.') + ' (Copy).' + ext;
    } else {
        clone.name = clone.name + ' (Copy)';
    }

    clone.localizedImages = {};
    if (original.localizedImages) {
        Object.keys(original.localizedImages).forEach(lang => {
            const langData = original.localizedImages[lang];
            if (langData?.src) {
                const img = new Image();
                img.src = langData.src;
                clone.localizedImages[lang] = {
                    image: img,
                    src: langData.src,
                    name: langData.name
                };
            }
        });
    }

    if (original.image?.src) {
        const img = new Image();
        img.src = original.image.src;
        clone.image = img;
    }

    state.screenshots.splice(index + 1, 0, clone);
    state.selectedIndex = index + 1;

    updateScreenshotList();
    syncUIWithState();
    updateGradientStopsUI();
    updateCanvas();
}

// Populate frame color swatches for the given device and highlight the active one
function updateFrameColorSwatches(deviceType, activeColorId) {
    const container = document.getElementById('frame-color-swatches');
    if (!container) return;

    const presets = typeof frameColorPresets !== 'undefined' ? frameColorPresets[deviceType] : null;
    if (!presets) {
        container.innerHTML = '';
        return;
    }

    // Default to first preset if none specified
    if (!activeColorId) activeColorId = presets[0].id;

    container.innerHTML = presets.map(p =>
        `<div class="frame-color-swatch${p.id === activeColorId ? ' active' : ''}" ` +
        `data-color-id="${p.id}" title="${p.label}" ` +
        `style="background: ${p.swatch}"></div>`
    ).join('');

    // Attach click handlers
    container.querySelectorAll('.frame-color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            const colorId = swatch.dataset.colorId;
            container.querySelectorAll('.frame-color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');

            setScreenshotSetting('frameColor', colorId);

            if (typeof setPhoneFrameColor === 'function') {
                setPhoneFrameColor(colorId, deviceType);
            }

            updateCanvas();
        });
    });
}

// Sync UI controls with current state
function syncUIWithState() {
    // Update language button
    updateLanguageButton();

    // Device selector dropdown
    document.querySelectorAll('.output-size-menu .device-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.device === state.outputDevice);
    });

    // Update dropdown trigger text
    const selectedOption = document.querySelector(`.output-size-menu .device-option[data-device="${state.outputDevice}"]`);
    if (selectedOption) {
        document.getElementById('output-size-name').textContent = selectedOption.querySelector('.device-option-name').textContent;
        if (state.outputDevice === 'custom') {
            document.getElementById('output-size-dims').textContent = `${state.customWidth} × ${state.customHeight}`;
        } else {
            document.getElementById('output-size-dims').textContent = selectedOption.querySelector('.device-option-size').textContent;
        }
    }

    // Show/hide custom inputs
    const customInputs = document.getElementById('custom-size-inputs');
    customInputs.classList.toggle('visible', state.outputDevice === 'custom');
    document.getElementById('custom-width').value = state.customWidth;
    document.getElementById('custom-height').value = state.customHeight;

    // Get current screenshot's settings
    const bg = getBackground();
    const ss = getScreenshotSettings();
    const txt = getText();

    // Background type
    document.querySelectorAll('#bg-type-selector button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === bg.type);
    });
    document.getElementById('gradient-options').style.display = bg.type === 'gradient' ? 'block' : 'none';
    document.getElementById('solid-options').style.display = bg.type === 'solid' ? 'block' : 'none';
    document.getElementById('image-options').style.display = bg.type === 'image' ? 'block' : 'none';

    // Gradient
    document.getElementById('gradient-angle').value = bg.gradient.angle;
    document.getElementById('gradient-angle-value').textContent = formatValue(bg.gradient.angle) + '°';
    updateUsedGradientPresets();
    updateGradientStopsUI();

    // Solid color
    document.getElementById('solid-color').value = bg.solid;
    document.getElementById('solid-color-hex').value = bg.solid;

    // Image background
    document.getElementById('bg-image-fit').value = bg.imageFit;
    document.getElementById('bg-blur').value = bg.imageBlur;
    document.getElementById('bg-blur-value').textContent = formatValue(bg.imageBlur) + 'px';
    document.getElementById('bg-overlay-color').value = bg.overlayColor;
    document.getElementById('bg-overlay-hex').value = bg.overlayColor;
    document.getElementById('bg-overlay-opacity').value = bg.overlayOpacity;
    document.getElementById('bg-overlay-opacity-value').textContent = formatValue(bg.overlayOpacity) + '%';

    // Noise
    document.getElementById('noise-toggle').classList.toggle('active', bg.noise);
    document.getElementById('noise-intensity').value = bg.noiseIntensity;
    document.getElementById('noise-intensity-value').textContent = formatValue(bg.noiseIntensity) + '%';

    // Screenshot settings
    document.getElementById('screenshot-scale').value = ss.scale;
    document.getElementById('screenshot-scale-value').textContent = formatValue(ss.scale) + '%';
    document.getElementById('screenshot-y').value = ss.y;
    document.getElementById('screenshot-y-value').textContent = formatValue(ss.y) + '%';
    document.getElementById('screenshot-x').value = ss.x;
    document.getElementById('screenshot-x-value').textContent = formatValue(ss.x) + '%';
    document.getElementById('corner-radius').value = ss.cornerRadius;
    document.getElementById('corner-radius-value').textContent = formatValue(ss.cornerRadius) + 'px';
    document.getElementById('screenshot-rotation').value = ss.rotation;
    document.getElementById('screenshot-rotation-value').textContent = formatValue(ss.rotation) + '°';
    syncPositionPresetSelection();

    // Shadow
    document.getElementById('shadow-toggle').classList.toggle('active', ss.shadow.enabled);
    document.getElementById('shadow-color').value = ss.shadow.color;
    document.getElementById('shadow-color-hex').value = ss.shadow.color;
    document.getElementById('shadow-blur').value = ss.shadow.blur;
    document.getElementById('shadow-blur-value').textContent = formatValue(ss.shadow.blur) + 'px';
    document.getElementById('shadow-opacity').value = ss.shadow.opacity;
    document.getElementById('shadow-opacity-value').textContent = formatValue(ss.shadow.opacity) + '%';
    document.getElementById('shadow-x').value = ss.shadow.x;
    document.getElementById('shadow-x-value').textContent = formatValue(ss.shadow.x) + 'px';
    document.getElementById('shadow-y').value = ss.shadow.y;
    document.getElementById('shadow-y-value').textContent = formatValue(ss.shadow.y) + 'px';

    // Frame/Border
    document.getElementById('frame-toggle').classList.toggle('active', ss.frame.enabled);
    document.getElementById('frame-color').value = ss.frame.color;
    document.getElementById('frame-color-hex').value = ss.frame.color;
    document.getElementById('frame-width').value = ss.frame.width;
    document.getElementById('frame-width-value').textContent = formatValue(ss.frame.width) + 'px';
    document.getElementById('frame-opacity').value = ss.frame.opacity;
    document.getElementById('frame-opacity-value').textContent = formatValue(ss.frame.opacity) + '%';

    // Text
    const headlineLang = txt.currentHeadlineLang || 'en';
    const subheadlineLang = txt.currentSubheadlineLang || 'en';
    const layoutLang = getTextLayoutLanguage(txt);
    const headlineLayout = getEffectiveLayout(txt, headlineLang);
    const subheadlineLayout = getEffectiveLayout(txt, subheadlineLang);
    const layoutSettings = getEffectiveLayout(txt, layoutLang);
    const currentHeadline = txt.headlines ? (txt.headlines[headlineLang] || '') : (txt.headline || '');
    document.getElementById('headline-text').value = currentHeadline;
    document.getElementById('headline-font').value = txt.headlineFont;
    updateFontPickerPreview();
    document.getElementById('headline-size').value = headlineLayout.headlineSize;
    document.getElementById('headline-color').value = txt.headlineColor;
    document.getElementById('headline-weight').value = txt.headlineWeight;
    // Sync text style buttons
    document.querySelectorAll('#headline-style button').forEach(btn => {
        const style = btn.dataset.style;
        const key = 'headline' + style.charAt(0).toUpperCase() + style.slice(1);
        btn.classList.toggle('active', txt[key] || false);
    });
    document.querySelectorAll('#text-position button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.position === layoutSettings.position);
    });
    document.getElementById('text-offset-y').value = layoutSettings.offsetY;
    document.getElementById('text-offset-y-value').textContent = formatValue(layoutSettings.offsetY) + '%';
    document.getElementById('line-height').value = layoutSettings.lineHeight;
    document.getElementById('line-height-value').textContent = formatValue(layoutSettings.lineHeight) + '%';
    const currentSubheadline = txt.subheadlines ? (txt.subheadlines[subheadlineLang] || '') : (txt.subheadline || '');
    document.getElementById('subheadline-text').value = currentSubheadline;
    document.getElementById('subheadline-font').value = txt.subheadlineFont || txt.headlineFont;
    document.getElementById('subheadline-size').value = subheadlineLayout.subheadlineSize;
    document.getElementById('subheadline-color').value = txt.subheadlineColor;
    document.getElementById('subheadline-opacity').value = txt.subheadlineOpacity;
    document.getElementById('subheadline-opacity-value').textContent = formatValue(txt.subheadlineOpacity) + '%';
    document.getElementById('subheadline-weight').value = txt.subheadlineWeight || '400';
    // Sync subheadline style buttons
    document.querySelectorAll('#subheadline-style button').forEach(btn => {
        const style = btn.dataset.style;
        const key = 'subheadline' + style.charAt(0).toUpperCase() + style.slice(1);
        btn.classList.toggle('active', txt[key] || false);
    });

    // Per-language layout toggle
    document.getElementById('per-language-layout-toggle').classList.toggle('active', txt.perLanguageLayout || false);

    // Headline/Subheadline toggles
    const headlineEnabled = txt.headlineEnabled !== false; // default true for backwards compatibility
    const subheadlineEnabled = txt.subheadlineEnabled || false;
    document.getElementById('headline-toggle').classList.toggle('active', headlineEnabled);
    document.getElementById('subheadline-toggle').classList.toggle('active', subheadlineEnabled);

    // Language UIs
    updateHeadlineLanguageUI();
    updateSubheadlineLanguageUI();

    // 3D mode
    const use3D = ss.use3D || false;
    const device3D = ss.device3D || 'iphone';
    const device2D = get2DDeviceModelId(ss);
    const rotation3D = ss.rotation3D || { x: 0, y: 0, z: 0 };
    document.querySelectorAll('#device-type-selector button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === (use3D ? '3d' : '2d'));
    });
    document.querySelectorAll('#device-3d-selector button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.model === device3D);
    });
    const isIOS2DModel = typeof device2D === 'string' && device2D.startsWith('apple-');
    const device2DIOSSelect = document.getElementById('device-2d-model-ios');
    if (device2DIOSSelect) {
        device2DIOSSelect.value = isIOS2DModel ? device2D : '';
        if (typeof refreshCustomSelect === 'function') {
            refreshCustomSelect(device2DIOSSelect);
        }
    }
    const device2DAndroidSelect = document.getElementById('device-2d-model-android');
    if (device2DAndroidSelect) {
        device2DAndroidSelect.value = isIOS2DModel ? '' : device2D;
        if (typeof refreshCustomSelect === 'function') {
            refreshCustomSelect(device2DAndroidSelect);
        }
    }
    updateFrameColorSwatches(device3D, ss.frameColor);
    document.getElementById('rotation-3d-options').style.display = use3D ? 'block' : 'none';
    document.getElementById('rotation-3d-x').value = rotation3D.x;
    document.getElementById('rotation-3d-x-value').textContent = formatValue(rotation3D.x) + '°';
    document.getElementById('rotation-3d-y').value = rotation3D.y;
    document.getElementById('rotation-3d-y-value').textContent = formatValue(rotation3D.y) + '°';
    document.getElementById('rotation-3d-z').value = rotation3D.z;
    document.getElementById('rotation-3d-z-value').textContent = formatValue(rotation3D.z) + '°';

    // Hide 2D-only settings in 3D mode, show 3D tip
    const device2DModelGroup = document.getElementById('device-2d-model-group');
    if (device2DModelGroup) {
        device2DModelGroup.style.display = use3D ? 'none' : 'block';
    }
    document.getElementById('2d-only-settings').style.display = use3D ? 'none' : 'block';
    document.getElementById('position-presets-section').style.display = use3D ? 'none' : 'block';
    document.getElementById('frame-color-section').style.display = use3D ? 'block' : 'none';
    document.getElementById('3d-tip').style.display = use3D ? 'flex' : 'none';

    // Show/hide 3D renderer and switch model if needed
    if (typeof showThreeJS === 'function') {
        showThreeJS(use3D);
    }
    if (use3D && typeof switchPhoneModel === 'function') {
        switchPhoneModel(device3D);
    }

    // Elements
    selectedElementId = null;
    updateElementsList();
    updateElementProperties();

    // Popouts
    selectedPopoutId = null;
    selectedCanvasTarget = null;
    updatePopoutsList();
    updatePopoutProperties();
}

function syncPositionPresetSelection() {
    const ss = getScreenshotSettings();
    if (!ss) return;

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

    const epsilon = 0.01;
    let matchedPreset = null;

    for (const [presetName, preset] of Object.entries(presets)) {
        const matches =
            Math.abs((ss.scale || 0) - preset.scale) < epsilon &&
            Math.abs((ss.x || 0) - preset.x) < epsilon &&
            Math.abs((ss.y || 0) - preset.y) < epsilon &&
            Math.abs((ss.rotation || 0) - preset.rotation) < epsilon &&
            Math.abs((ss.perspective || 0) - preset.perspective) < epsilon;

        if (matches) {
            matchedPreset = presetName;
            break;
        }
    }

    document.querySelectorAll('.position-preset').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === matchedPreset);
    });
}

