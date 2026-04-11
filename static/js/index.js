window.addEventListener('scroll', () => {
  const s = document.documentElement;
  const pct = (s.scrollTop||document.body.scrollTop) / ((s.scrollHeight||document.body.scrollHeight) - s.clientHeight) * 100;
  document.getElementById('progressBar').style.width = Math.min(pct,100) + '%';
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
  } catch (error) {
    notice.textContent = 'Google login will be implemented soon.';
    notice.className = 'auth-notice muted';
  }
});

const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el => obs.observe(el));

let uploadedBase64 = [];
document.getElementById('fileInput').addEventListener('change', e => handleFiles(e.target.files));

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

document.getElementById('sendBtn').addEventListener('click', generate);
document.getElementById('promptInput').addEventListener('keydown', e => {
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
