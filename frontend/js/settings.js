// Note: profile/password/delete-account saving isn't wired to a real
  // backend endpoint yet (only login/signup/me/sources/chat exist right
  // now) — those forms show a local confirmation message so the page is
  // fully built out and ready to connect once those routes exist.

  async function api(path, options = {}) {
    const res = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
    if (res.status === 401) { window.location.href = 'login.html'; throw new Error('Not signed in'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  const typeMeta = {
    article: { label: 'Article / Wiki', badge: 'A', color: '#E3A63C' },
    discussion: { label: 'Discussion Thread', badge: 'T', color: '#C1443A' },
    video: { label: 'Video Transcript', badge: 'V', color: '#A89C8C' },
  };

  async function boot() {
    const me = await api('/api/auth/me').catch(() => null);
    if (!me) return;
    document.getElementById('profile-name').value = me.user.name;
    document.getElementById('profile-email').value = me.user.email;

    const { sources } = await api('/api/sources').catch(() => ({ sources: [] }));
    renderSources(sources);
  }

  function renderSources(sources) {
    const list = document.getElementById('settings-source-list');
    list.innerHTML = '';
    if (sources.length === 0) {
      list.innerHTML = `<p class="text-sm text-[#6E645A]">No sources ingested yet.</p>`;
      return;
    }
    sources.forEach(s => {
      const meta = typeMeta[s.type];
      const row = document.createElement('div');
      row.className = 'flex items-center gap-3 bg-[#16110C] border border-[#2A2622] rounded-[12px] p-3.5';
      row.innerHTML = `
        <div class="w-7 h-7 shrink-0 rounded-md flex items-center justify-center font-mono-ibm text-[11px] font-semibold" style="background:${meta.color}24;color:${meta.color}">${meta.badge}</div>
        <div class="min-w-0 flex-1">
          <div class="text-xs font-medium text-[#F3EFE7] truncate">${meta.label}</div>
          <div class="text-[11px] text-[#6E645A] truncate">${s.url}</div>
        </div>
        <button class="remove-source-btn shrink-0 text-xs font-medium text-[#C1443A] hover:bg-[#C1443A]/[0.14] rounded-md px-3 py-1.5 transition-colors" data-id="${s.id}">Remove</button>
      `;
      list.appendChild(row);
    });
    list.querySelectorAll('.remove-source-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = '…';
        await api(`/api/sources/${btn.dataset.id}`, { method: 'DELETE' }).catch(() => {});
        const { sources } = await api('/api/sources').catch(() => ({ sources: [] }));
        renderSources(sources);
      });
    });
  }

  document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = document.getElementById('profile-msg');
    msg.textContent = 'Saved locally — profile updates aren\'t connected to the backend yet.';
    msg.classList.remove('hidden');
  });

  document.getElementById('password-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = document.getElementById('password-msg');
    msg.className = 'text-sm rounded-md px-3.5 py-2.5 mb-4 text-[#5E9C6E] bg-[#5E9C6E]/[0.1] border border-[#5E9C6E]/30';
    msg.textContent = 'Looks good locally — password updates aren\'t connected to the backend yet.';
    msg.classList.remove('hidden');
    e.target.reset();
  });

  document.getElementById('delete-account-btn').addEventListener('click', async () => {
    if (!confirm('Delete your account? This can\'t be undone.')) return;
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    alert('Account deletion isn\'t connected to the backend yet — you\'ve been logged out instead.');
    window.location.href = 'login.html';
  });

  boot();