window.addEventListener('scroll', () => {
  const s = document.documentElement;
  const pct = (s.scrollTop||document.body.scrollTop) / ((s.scrollHeight||document.body.scrollHeight) - s.clientHeight) * 100;
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = Math.min(pct,100) + '%';
  }
});

// LOGIN MODAL
function openLoginModal() {
  document.getElementById('loginModal').classList.add('open');
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.remove('open');
}

document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
  const notice = document.getElementById('authNotice');
  notice.textContent = 'Redirecting to Google login...';
  notice.className = 'auth-notice muted';
  
  // TODO: Implement Google OAuth flow
  // For now, this shows the UI is ready for Google auth
  try {
    const response = await fetch('/api/auth/google/', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } else {
      // If auth succeeds, redirect to profile
      const meResponse = await fetch('/api/auth/me/', {
        credentials: 'include'
      });
      if (meResponse.ok) {
        window.location.href = '/profile/';
      }
    }
  } catch {
    notice.textContent = 'Google login will be implemented soon.';
    notice.className = 'auth-notice muted';
  }
});

const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el => obs.observe(el));

let uploadedBase64 = [];
document.getElementById('fileInput')?.addEventListener('change', e => handleFiles(e.target.files));

function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      uploadedBase64.push({ data: e.target.result.split(',')[1], type: file.type });
      const img = document.createElement('img');
      img.src = e.target.result; img.className = 'preview-thumb';
      document.getElementById('preview-grid').appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

function setPrompt(text) {
  document.getElementById('promptInput').value = text;
  document.getElementById('promptInput').focus();
}

document.getElementById('sendBtn')?.addEventListener('click', generate);
document.getElementById('promptInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate();
});

async function generate() {
  const prompt = document.getElementById('promptInput').value.trim();
  if (!prompt && uploadedBase64.length === 0) return;
  const output = document.getElementById('aiOutput');
  const btn = document.getElementById('sendBtn');
  output.textContent = '';
  output.className = 'ai-output visible loading';
  btn.disabled = true; btn.textContent = '···';

  try {
    const contentBlocks = [];
    uploadedBase64.forEach(f => contentBlocks.push({ type:'image', source:{ type:'base64', media_type:f.type, data:f.data } }));
    contentBlocks.push({ type:'text', text: prompt || 'Analyze these screenshots and suggest a compelling App Store and Google Play preview set.' });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are an expert app preview designer and ASO specialist. When given app screenshots and/or a prompt, provide concise, actionable design recommendations for App Store and Google Play previews. Focus on layout, typography, colors, and key messaging copy. Keep under 200 words, formatted as a short concrete plan with clear bullet points.',
        messages: [{ role:'user', content: contentBlocks }]
      })
    });

    const data = await res.json();
    output.classList.remove('loading');
    btn.disabled = false; btn.textContent = 'Generate →';
    output.textContent = data.content?.[0]?.text || (data.error ? 'Error: ' + data.error.message : 'No response.');
  } catch {
    output.classList.remove('loading');
    btn.disabled = false; btn.textContent = 'Generate →';
    output.textContent = 'Connection error. Please try again.';
  }
}

// PROFILE PAGE
if (document.body.classList.contains('profile-page-view')) {
  let pendingDeleteProjectId = null;

  function showOverlay(id) {
    document.getElementById(id)?.classList.add('visible');
  }

  function hideOverlay(id) {
    document.getElementById(id)?.classList.remove('visible');
  }

  function showInfo(message, title = 'Notice') {
    const infoTitle = document.getElementById('infoTitle');
    const infoMessage = document.getElementById('infoMessage');
    if (infoTitle) infoTitle.textContent = title;
    if (infoMessage) infoMessage.textContent = message;
    showOverlay('infoModal');
  }

  async function createProject(name, description = '') {
    try {
      const response = await fetch('/api/projects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name || 'Untitled Project',
          description: description || '',
          payload: { screenshots: [] }
        })
      });

      if (!response.ok) {
        showInfo('Failed to create project.', 'Error');
        return;
      }

      const project = await response.json();
      window.location.href = `/editor/${project.id}/`;
    } catch (error) {
      console.error('Error creating project:', error);
      showInfo('Could not create project.', 'Error');
    }
  }

  async function loadProjects() {
    try {
      const response = await fetch('/api/projects/', { credentials: 'include' });
      if (!response.ok) return;

      const projects = await response.json();
      const projectsList = document.getElementById('projectsList');
      if (!projectsList) return;

      if (projects.length === 0) {
        projectsList.innerHTML = '<div class="muted-empty">No projects yet. Create your first project to get started.</div>';
        return;
      }

      projectsList.innerHTML = projects.map(project => `
        <div class="project-item">
          <div style="flex: 1; min-width:0;">
            <div class="project-name">${escapeHtml(project.name)}</div>
            <div class="project-meta">${escapeHtml(project.description) || 'No description'}</div>
            <div class="project-meta" style="margin-top: 0.4rem;">Updated ${formatDate(project.updated_at)}</div>
          </div>
          <div class="project-actions">
            <a href="/editor/${project.id}/" class="action-btn">Open</a>
            <button data-project-id="${project.id}" class="action-btn project-delete-btn">Delete</button>
          </div>
        </div>
      `).join('');

      projectsList.querySelectorAll('.project-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const projectId = btn.dataset.projectId;
          requestDeleteProject(projectId);
        });
      });
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }

  async function deleteProject(projectId) {
    try {
      const response = await fetch(`/api/projects/${projectId}/`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        showInfo('Failed to delete project.', 'Error');
        return;
      }

      loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      showInfo('Could not delete project.', 'Error');
    }
  }

  function requestDeleteProject(projectId) {
    pendingDeleteProjectId = projectId;
    const confirmMessage = document.getElementById('confirmMessage');
    if (confirmMessage) {
      confirmMessage.textContent = 'Are you sure you want to delete this project? This cannot be undone.';
    }
    showOverlay('confirmModal');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  async function loadProfile() {
    try {
      const response = await fetch('/api/auth/me/', { credentials: 'include' });

      if (!response.ok) {
        window.location.href = '/';
        return;
      }

      await response.json();
      loadProjects();
    } catch (error) {
      console.error('Error loading profile:', error);
      window.location.href = '/';
    }
  }

  async function logoutProfile() {
    try {
      await fetch('/api/auth/logout/', { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    window.location.href = '/';
  }

  function openCreateProjectModal() {
    const projectNameInput = document.getElementById('projectNameInput');
    const projectDescInput = document.getElementById('projectDescInput');
    if (projectNameInput) projectNameInput.value = 'Untitled Project';
    if (projectDescInput) projectDescInput.value = '';
    showOverlay('createProjectModal');
    projectNameInput?.focus();
    projectNameInput?.select();
  }

  function bindProfileEvents() {
    const createBtn = document.getElementById('createProjectBtn');
    const projectModalCancel = document.getElementById('projectModalCancel');
    const projectModalCreate = document.getElementById('projectModalCreate');
    const confirmCancel = document.getElementById('confirmCancel');
    const confirmOk = document.getElementById('confirmOk');
    const infoOk = document.getElementById('infoOk');

    createBtn?.addEventListener('click', openCreateProjectModal);

    projectModalCancel?.addEventListener('click', () => hideOverlay('createProjectModal'));

    projectModalCreate?.addEventListener('click', async () => {
      const name = document.getElementById('projectNameInput')?.value.trim();
      const description = document.getElementById('projectDescInput')?.value.trim();
      if (!name) {
        showInfo('Project name is required.', 'Validation');
        return;
      }
      hideOverlay('createProjectModal');
      await createProject(name, description || '');
    });

    confirmCancel?.addEventListener('click', () => {
      pendingDeleteProjectId = null;
      hideOverlay('confirmModal');
    });

    confirmOk?.addEventListener('click', async () => {
      const id = pendingDeleteProjectId;
      pendingDeleteProjectId = null;
      hideOverlay('confirmModal');
      if (id !== null) {
        await deleteProject(id);
      }
    });

    infoOk?.addEventListener('click', () => hideOverlay('infoModal'));

    ['createProjectModal', 'confirmModal', 'infoModal'].forEach((id) => {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target.id === id) {
          hideOverlay(id);
        }
      });
    });
  }

  window.openCreateProjectModal = openCreateProjectModal;
  window.logout = logoutProfile;

  document.addEventListener('DOMContentLoaded', () => {
    bindProfileEvents();
    loadProfile();
  });
}
