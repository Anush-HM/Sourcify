// Everything below talks to the Omnivex backend (server.js). Sources
  // and chat history live server-side, keyed to your account — nothing
  // is kept in localStorage, so the session follows you across
  // refreshes, tabs, and devices as long as you're logged in.

  const sourceCards = document.querySelectorAll('[data-source]');
  const ingestBtn = document.getElementById('ingest-btn');
  const enterChatBtn = document.getElementById('enter-chat-btn');
  const stageSources = document.getElementById('stage-sources');
  const stageChat = document.getElementById('stage-chat');
  const sessionChip = document.getElementById('session-chip');
  const sourceList = document.getElementById('source-list');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const emptyState = document.getElementById('empty-state');
  const chatScroll = document.getElementById('chat-scroll');
  const messageList = document.getElementById('message-list');
  const logoutBtn = document.getElementById('logout-btn');

  const typeMeta = {
    article: { label: 'Article / Wiki', badge: 'A', color: '#E3A63C', icon: '▤' },
    discussion: { label: 'Discussion Thread', badge: 'T', color: '#C1443A', icon: '✦' },
    video: { label: 'Video Transcript', badge: 'V', color: '#A89C8C', icon: '▶' },
  };

  let currentSources = []; // mirrors what's actually saved on the server
  const avatarBtn = document.getElementById('avatar-btn');
  const avatarMenu = document.getElementById('avatar-menu');
  const citationModal = document.getElementById('citation-modal');

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (res.status === 401) {
      window.location.href = 'login.html';
      throw new Error('Not signed in');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function setStatus(card, state, label) {
    const dot = card.querySelector('.status-dot');
    const text = card.querySelector('.status-label');
    const retryBtn = card.querySelector('.retry-btn');
    dot.className = 'status-dot w-[7px] h-[7px] rounded-full shrink-0 status-' + state + (state === 'loading' ? ' status-pulsing' : '');
    text.textContent = label;
    if (retryBtn) retryBtn.classList.toggle('hidden', state !== 'error');
  }

  function cardFor(type) {
    return document.querySelector(`#stage-sources [data-source="${type}"]`);
  }

  // ---------- avatar dropdown ----------

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarMenu.classList.toggle('hidden');
  });
  document.addEventListener('click', () => avatarMenu.classList.add('hidden'));

  // ---------- boot: figure out who's logged in and what they already have ----------

  async function boot() {
    const me = await api('/api/auth/me').catch(() => null);
    if (!me) return; // api() already redirected to login
    avatarBtn.textContent = (me.user.name || 'A').trim().charAt(0).toUpperCase();

    const { sources } = await api('/api/sources');
    currentSources = sources;

    // Reflect any already-ingested sources on the intake cards too,
    // so re-visiting "add another source" shows accurate state.
    sources.forEach(s => {
      const card = cardFor(s.type);
      if (card) {
        card.querySelector('input').value = s.url;
        setStatus(card, 'ready', 'Ready');
      }
    });

    if (sources.length > 0) {
      await enterChat();
    } else {
      enterChatBtn.classList.toggle('hidden', sources.length === 0);
    }
  }

  logoutBtn.addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = 'login.html';
  });

  // ---------- ingestion ----------

  async function ingestOne(card) {
    const type = card.getAttribute('data-source');
    const url = card.querySelector('input').value.trim();
    if (!url) return;
    setStatus(card, 'loading', 'Ingesting…');
    try {
      const { source } = await api('/api/sources', {
        method: 'POST',
        body: JSON.stringify({ type, url }),
      });
      currentSources = currentSources.filter(s => s.type !== type).concat(source);
      setStatus(card, 'ready', 'Ready');
    } catch (err) {
      setStatus(card, 'error', 'Failed — try again');
    }
    if (currentSources.length > 0) enterChatBtn.classList.remove('hidden');
  }

  document.querySelectorAll('.retry-btn').forEach(btn => {
    btn.addEventListener('click', () => ingestOne(btn.closest('[data-source]')));
  });

  ingestBtn.addEventListener('click', async () => {
    const filled = Array.from(sourceCards).filter(c => c.querySelector('input').value.trim().length > 0);
    if (filled.length === 0) return;

    ingestBtn.disabled = true;
    ingestBtn.textContent = 'Ingesting…';

    for (const card of filled) {
      await ingestOne(card);
    }

    ingestBtn.disabled = false;
    ingestBtn.textContent = 'Ingest Sources';
  });

  enterChatBtn.addEventListener('click', enterChat);

  async function enterChat() {
    sourceList.innerHTML = '';
    currentSources.forEach(s => {
      const meta = typeMeta[s.type];
      const row = document.createElement('div');
      row.className = 'flex items-center gap-3 bg-[#1B1817] border border-[#2A2622] rounded-[12px] p-3.5';
      row.innerHTML = `
        <div class="w-7 h-7 shrink-0 rounded-md flex items-center justify-center font-mono-ibm text-[11px] font-semibold" style="background:${meta.color}24;color:${meta.color}">${meta.badge}</div>
        <div class="min-w-0">
          <div class="text-xs font-medium text-[#F3EFE7] truncate">${meta.label}</div>
          <div class="text-[11px] text-[#6E645A] truncate">${s.url}</div>
        </div>
        <span class="ml-auto w-[7px] h-[7px] rounded-full status-ready shrink-0"></span>
      `;
      sourceList.appendChild(row);
    });

    document.getElementById('chat-session-chip').textContent = currentSources.length + ' / 3 ready';
    stageSources.classList.add('hidden');
    stageChat.classList.remove('hidden');
    stageChat.classList.add('fade-in');
    sessionChip.classList.remove('hidden');
    sessionChip.textContent = currentSources.length + ' / 3 sources ready';

    await loadChatHistory();
  }

  document.getElementById('add-source-btn').addEventListener('click', () => {
    stageChat.classList.add('hidden');
    stageSources.classList.remove('hidden');
    stageSources.classList.add('fade-in');
  });

  // ---------- chat ----------

  function renderUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'flex justify-end fade-in';
    el.innerHTML = `<div class="max-w-[85%] bg-[#1B1817] border border-[#2A2622] rounded-[14px] rounded-tr-sm px-5 py-3.5 text-[15px]"></div>`;
    el.querySelector('div').textContent = text;
    messageList.appendChild(el);
  }

  // Turns a raw backend citation ({type, url, metadata, score}) into
  // the icon + short label the UI shows as a pill.
  function citationDisplay(c) {
    const meta = typeMeta[c.type] || { icon: '●', label: 'Source' };
    let label = meta.label;
    if (c.type === 'video' && c.metadata?.startTime != null) {
      const m = Math.floor(c.metadata.startTime / 60);
      const s = String(c.metadata.startTime % 60).padStart(2, '0');
      label = `${m}:${s}`;
    } else if (c.type === 'discussion' && c.metadata?.commentId) {
      label = `#${c.metadata.commentId}`;
    } else if (c.type === 'article' && c.metadata?.paragraphIndex != null) {
      label = `¶${c.metadata.paragraphIndex + 1}`;
    }
    return { icon: meta.icon, label };
  }

  function renderAssistantMessage(msg) {
    const el = document.createElement('div');
    el.className = 'fade-in';

    const citationsHtml = (msg.citations || []).map((c, i) => {
      const { icon, label } = citationDisplay(c);
      return `<button class="citation-btn font-mono-ibm text-xs text-[#A89C8C] border border-[#332E28] hover:border-[#E3A63C] hover:text-[#E3A63C] px-3 py-1.5 rounded-full transition-colors" data-citation-index="${i}">${icon} ${label}</button>`;
    }).join('');

    const pct = Math.round((msg.confidence || 0) * 100);

    const retries = Math.max((msg.healingLog || []).length - 1, 0);
    const healingSummaryLabel = msg.healingLog && msg.healingLog.length
      ? `↻ Healing log — ${retries === 0 ? 'no retries needed' : `${retries} ${retries === 1 ? 'retry' : 'retries'}`}`
      : '↻ Healing log';

    const healingRowsHtml = (msg.healingLog || []).map(h => {
      const color = h.verdict === 'SUPPORTED' ? '#5E9C6E' : h.verdict === 'WEAK' || h.verdict === 'UNSUPPORTED' ? '#C1443A' : '#E3A63C';
      return `<div class="text-xs text-[#A89C8C] leading-relaxed"><span class="font-semibold" style="color:${color}">Attempt ${h.attempt}: ${h.verdict}.</span> ${h.reason || ''}</div>`;
    }).join('');

    el.innerHTML = `
      <div class="bg-[#1B1817] border border-[#2A2622] rounded-[16px] rounded-tl-sm px-7 py-6">
        <p class="text-[15px] leading-[1.75] text-[#F3EFE7] mb-5"></p>
        ${citationsHtml ? `<div class="flex gap-2 flex-wrap mb-5">${citationsHtml}</div>` : ''}
        <div class="mb-5">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono-ibm text-[11px] tracking-[0.08em] uppercase text-[#6E645A]">Grounding confidence</span>
            <span class="font-mono-ibm text-[11px] text-[#E3A63C]">${pct}%</span>
          </div>
          <div class="h-1.5 rounded-full bg-[#2A2622] overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-[#E3A63C] to-[#C1443A]" style="width: ${pct}%"></div>
          </div>
        </div>
        ${healingRowsHtml ? `
        <details class="border-t border-[#2A2622] pt-4">
          <summary class="flex items-center gap-2 text-xs text-[#A89C8C] hover:text-[#F3EFE7] transition-colors">
            <svg class="chev w-3 h-3 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
            <span>${healingSummaryLabel}</span>
          </summary>
          <div class="mt-4 flex flex-col gap-3 pl-5 border-l border-[#2A2622]">${healingRowsHtml}</div>
        </details>` : ''}
      </div>
    `;
    el.querySelector('p').textContent = msg.text;
    messageList.appendChild(el);

    el.querySelectorAll('.citation-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => openCitationModal(msg.citations[i]));
    });
  }

  function openCitationModal(citation) {
    const { icon, label } = citationDisplay(citation);
    const typeLabel = { article: 'Article / Wiki', discussion: 'Discussion Thread', video: 'Video Transcript' }[citation.type] || 'Source';
    document.getElementById('citation-modal-type').textContent = typeLabel;
    document.getElementById('citation-modal-title').textContent = `${icon} ${label}`;
    document.getElementById('citation-modal-body').textContent = citation.url || 'Source URL not available.';
    citationModal.classList.remove('hidden');
    citationModal.classList.add('flex');
  }

  document.getElementById('citation-modal-close').addEventListener('click', closeCitationModal);
  citationModal.addEventListener('click', (e) => { if (e.target === citationModal) closeCitationModal(); });
  function closeCitationModal() {
    citationModal.classList.add('hidden');
    citationModal.classList.remove('flex');
  }

  // ---------- typing indicator ----------

  function showTypingIndicator() {
    const el = document.createElement('div');
    el.id = 'typing-indicator';
    el.className = 'fade-in';
    el.innerHTML = `
      <div class="inline-flex bg-[#1B1817] border border-[#2A2622] rounded-[16px] rounded-tl-sm px-5 py-4 gap-1.5 items-center">
        <span class="typing-dot w-1.5 h-1.5 rounded-full bg-[#A89C8C]"></span>
        <span class="typing-dot w-1.5 h-1.5 rounded-full bg-[#A89C8C]"></span>
        <span class="typing-dot w-1.5 h-1.5 rounded-full bg-[#A89C8C]"></span>
      </div>
    `;
    messageList.appendChild(el);
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }

  function hideTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
  }

  // ---------- streaming assistant bubble ----------
  // A lightweight bubble that just grows text as tokens arrive. Once the
  // stream's "done" event lands, it's swapped for the full rich bubble
  // (citations, confidence bar, healing log) via renderAssistantMessage.

  function beginStreamingMessage() {
    const el = document.createElement('div');
    el.className = 'fade-in';
    el.innerHTML = `
      <div class="bg-[#1B1817] border border-[#2A2622] rounded-[16px] rounded-tl-sm px-7 py-6">
        <p class="text-[15px] leading-[1.75] text-[#F3EFE7]"></p>
      </div>
    `;
    messageList.appendChild(el);
    chatScroll.scrollTop = chatScroll.scrollHeight;
    return { wrapper: el, textNode: el.querySelector('p') };
  }

  function finalizeStreamingMessage(stream, finalPayload) {
    const text = stream.textNode.textContent;
    stream.wrapper.remove();
    renderAssistantMessage({
      text,
      citations: finalPayload?.citations || [],
      confidence: finalPayload?.confidence || 0,
      healingLog: finalPayload?.healingLog || [],
    });
  }

  async function loadChatHistory() {
    const { messages } = await api('/api/chat');
    messageList.innerHTML = '';
    if (messages.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      messages.forEach(m => m.role === 'user' ? renderUserMessage(m.text) : renderAssistantMessage(m));
    }
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    emptyState.classList.add('hidden');
    chatInput.value = '';
    sendBtn.disabled = true;

    renderUserMessage(text);
    chatScroll.scrollTop = chatScroll.scrollHeight;
    showTypingIndicator();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (res.status === 401) { window.location.href = 'login.html'; return; }
      if (!res.ok || !res.body) throw new Error('Request failed');

      hideTypingIndicator();
      const stream = beginStreamingMessage();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalPayload = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop(); // keep incomplete trailing chunk for next read
        for (const evt of events) {
          const eventMatch = evt.match(/^event: (\w+)/m);
          const dataMatch = evt.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          const payload = JSON.parse(dataMatch[1]);

          if (eventMatch[1] === 'token') {
            stream.textNode.textContent += payload.token;
            chatScroll.scrollTop = chatScroll.scrollHeight;
          } else if (eventMatch[1] === 'done') {
            finalPayload = payload;
          } else if (eventMatch[1] === 'error') {
            stream.textNode.textContent = payload.error;
          }
        }
      }

      finalizeStreamingMessage(stream, finalPayload);
    } catch (err) {
      hideTypingIndicator();
      renderAssistantMessage({ text: `Something went wrong: ${err.message}`, citations: [], confidence: 0, healingLog: [] });
    }
    sendBtn.disabled = false;
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }

  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  boot();