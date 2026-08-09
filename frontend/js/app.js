// Everything below talks to the Omnivex backend (server.js). Sources
  // and chat history live server-side, keyed to your account — nothing
  // is kept in localStorage, so the session follows you across
  // refreshes, tabs, and devices as long as you're logged in.

  const sourceCards = document.querySelectorAll('[data-source]');
  const defaultPlaceholders = {};
  sourceCards.forEach(card => {
    defaultPlaceholders[card.getAttribute('data-source')] = card.querySelector('input').placeholder;
  });
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
  const historyBtn = document.getElementById('history-btn');
  const historyModal = document.getElementById('history-modal');
  const sessionListEl = document.getElementById('session-list');
  const newTopicBtn = document.getElementById('new-topic-btn');

  const typeMeta = {
    article: { label: 'Article / Wiki', badge: 'A', color: '#E3A63C', icon: '▤' },
    discussion: { label: 'Discussion Thread', badge: 'T', color: '#C1443A', icon: '✦' },
    video: { label: 'Video Transcript', badge: 'V', color: '#A89C8C', icon: '▶' },
  };

  let currentSources = []; // mirrors what's actually saved on the server
  const avatarBtn = document.getElementById('avatar-btn');
  const avatarMenu = document.getElementById('avatar-menu');
  const citationModal = document.getElementById('citation-modal');
  const reportBtn = document.getElementById('report-btn');
  const reportModal = document.getElementById('report-modal');
  const contradictionsBtn = document.getElementById('contradictions-btn');
  const contradictionsModal = document.getElementById('contradictions-modal');
  const reportDownloadBtn = document.getElementById('report-download-btn');
  let lastReportData = null;

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

  // Marks a card as already having a saved source, without pre-filling
  // the old URL into the input — it's already added, not something to
  // resubmit. markIdle() restores the card's normal empty-slot state.
  function markCardReady(card) {
    const input = card.querySelector('input');
    input.value = '';
    input.placeholder = 'Already added — paste a new link to replace it';
    setStatus(card, 'ready', 'Ready');
  }

  function markCardIdle(card) {
    const input = card.querySelector('input');
    const type = card.getAttribute('data-source');
    input.value = '';
    input.placeholder = defaultPlaceholders[type];
    setStatus(card, 'idle', 'Idle');
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
    historyBtn.classList.remove('hidden');

    const { sources } = await api('/api/sources');
    currentSources = sources;

    // Mark any already-ingested sources as Ready, but leave the input
    // itself empty — the old URL isn't something to re-type or re-submit,
    // it's just already there. The placeholder makes that clear.
    sources.forEach(s => {
      const card = cardFor(s.type);
      if (card) markCardReady(card);
    });

    // Always land on the upload page after login — if sources already
    // exist they're shown as "Ready" and the "Start chatting" button
    // appears, but the user chooses when to actually enter chat.
    enterChatBtn.classList.toggle('hidden', sources.length === 0);
  }

  logoutBtn.addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = 'login.html';
  });

  // ---------- topics / history ----------

  historyBtn.addEventListener('click', openHistoryModal);
  document.getElementById('history-modal-close').addEventListener('click', closeHistoryModal);
  historyModal.addEventListener('click', (e) => { if (e.target === historyModal) closeHistoryModal(); });

  function closeHistoryModal() {
    historyModal.classList.add('hidden');
    historyModal.classList.remove('flex');
  }

  async function openHistoryModal() {
    historyModal.classList.remove('hidden');
    historyModal.classList.add('flex');
    sessionListEl.innerHTML = '<p class="text-xs text-[#6E645A]">Loading…</p>';
    try {
      const { sessions } = await api('/api/sessions');
      if (sessions.length === 0) {
        sessionListEl.innerHTML = '<p class="text-xs text-[#6E645A]">No previous topics yet.</p>';
        return;
      }
      sessionListEl.innerHTML = '';
      sessions.forEach(s => {
        const row = document.createElement('button');
        row.className = 'w-full text-left flex items-center justify-between gap-3 bg-[#16110C] border rounded-[12px] px-4 py-3 hover:border-[#E3A63C] transition-colors ' +
          (s.isCurrent ? 'border-[#E3A63C]' : 'border-[#2A2622]');
        row.innerHTML = `
          <div class="min-w-0">
            <div class="text-sm font-medium text-[#F3EFE7] truncate">${s.title}${s.isCurrent ? ' (current)' : ''}</div>
            <div class="text-[11px] text-[#6E645A]">${s.sourceCount} source${s.sourceCount === 1 ? '' : 's'} · ${new Date(s.updatedAt).toLocaleDateString()}</div>
          </div>
        `;
        row.addEventListener('click', () => switchSession(s.id));
        sessionListEl.appendChild(row);
      });
    } catch (err) {
      sessionListEl.innerHTML = '<p class="text-xs text-[#C1443A]">Could not load topics.</p>';
    }
  }

  async function switchSession(id) {
    await api(`/api/sessions/${id}/activate`, { method: 'POST' });
    closeHistoryModal();
    await reloadCurrentSession();
  }

  const newConversationBtn = document.getElementById('new-conversation-btn');

  async function startNewConversation() {
    await api('/api/sessions', { method: 'POST' });
    startFreshIntake();
  }

  newTopicBtn.addEventListener('click', async () => {
    await startNewConversation();
    closeHistoryModal();
  });

  newConversationBtn.addEventListener('click', startNewConversation);

  async function reloadCurrentSession() {
    const { sources } = await api('/api/sources');
    currentSources = sources;
    sourceCards.forEach(card => {
      const type = card.getAttribute('data-source');
      const match = sources.find(s => s.type === type);
      match ? markCardReady(card) : markCardIdle(card);
    });
    if (sources.length > 0) {
      await enterChat();
    } else {
      stageChat.classList.add('hidden');
      stageSources.classList.remove('hidden');
      enterChatBtn.classList.add('hidden');
    }
  }

  function startFreshIntake() {
    currentSources = [];
    sourceCards.forEach(card => markCardIdle(card));
    stageChat.classList.add('hidden');
    stageSources.classList.remove('hidden');
    stageSources.classList.add('fade-in');
    enterChatBtn.classList.add('hidden');
    messageList.innerHTML = '';
  }

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

  // Adding sources now happens only via History → "Start new topic",
  // which routes through startFreshIntake(). No in-chat add-source
  // shortcut anymore.

  // ---------- chat ----------

  function renderUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'flex justify-end fade-in';
    el.innerHTML = `<div class="max-w-[85%] bg-[#1B1817] border border-[#2A2622] rounded-[14px] rounded-tr-sm px-5 py-3.5 text-[15px]"></div>`;
    el.querySelector('div').textContent = text;
    messageList.appendChild(el);
  }

  // Turns a raw backend citation ({type, url, metadata, score, text}) into
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

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Turns "[0]" / "[2, 4]" style markers the LLM writes into clickable
  // buttons that open the matching citation, without ever trusting raw
  // model output as HTML (text is escaped first).
  function linkifyCitations(text, citations) {
    const escaped = escapeHtml(text);
    return escaped.replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, nums) => {
      const indices = nums.split(',').map(n => n.trim());
      const valid = indices.filter(i => citations && citations[Number(i)]);
      if (valid.length === 0) return match;
      return valid.map(i =>
        `<button class="citation-inline-btn text-[#E3A63C] hover:underline font-medium" data-citation-index="${i}">[${i}]</button>`
      ).join('');
    });
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
    el.querySelector('p').innerHTML = linkifyCitations(msg.text, msg.citations);
    el.querySelectorAll('.citation-inline-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-citation-index'));
        if (msg.citations && msg.citations[idx]) openCitationModal(msg.citations[idx]);
      });
    });
    messageList.appendChild(el);

    el.querySelectorAll('.citation-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => openCitationModal(msg.citations[i]));
    });
  }

  // ---------- error message bubble ----------
  // Distinct from a normal assistant answer: no confidence bar (a system
  // failure isn't a grounding failure), red-tinted border, and a retry
  // button that re-sends the same question without duplicating the
  // user's message bubble.

  function renderErrorMessage(errorText, originalUserText) {
    const el = document.createElement('div');
    el.className = 'fade-in';
    el.innerHTML = `
      <div class="bg-[#1B1817] border border-[#C1443A]/40 rounded-[16px] rounded-tl-sm px-7 py-6">
        <div class="flex items-start gap-3 mb-4">
          <span class="shrink-0 text-[#C1443A] text-lg leading-none mt-0.5">⚠</span>
          <p class="text-[15px] leading-[1.75] text-[#F3EFE7]"></p>
        </div>
        <button class="retry-message-btn text-xs font-medium text-[#C1443A] border border-[#C1443A]/40 rounded-md px-3 py-1.5 hover:bg-[#C1443A]/[0.12] transition-colors">↻ Try again</button>
      </div>
    `;
    el.querySelector('p').textContent = errorText || 'Something went wrong generating a response.';
    el.querySelector('.retry-message-btn').addEventListener('click', () => {
      el.remove();
      performChatRequest(originalUserText);
    });
    messageList.appendChild(el);
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }

  function openCitationModal(citation) {
    const { icon, label } = citationDisplay(citation);
    const typeLabel = { article: 'Article / Wiki', discussion: 'Discussion Thread', video: 'Video Transcript' }[citation.type] || 'Source';
    document.getElementById('citation-modal-type').textContent = typeLabel;
    document.getElementById('citation-modal-title').textContent = `${icon} ${label}`;
    document.getElementById('citation-modal-quote').textContent = citation.text || 'No excerpt available for this citation.';
    const link = document.getElementById('citation-modal-body');
    link.textContent = citation.url || 'Source URL not available.';
    link.href = citation.url || '#';
    citationModal.classList.remove('hidden');
    citationModal.classList.add('flex');
  }

  document.getElementById('citation-modal-close').addEventListener('click', closeCitationModal);
  citationModal.addEventListener('click', (e) => { if (e.target === citationModal) closeCitationModal(); });
  function closeCitationModal() {
    citationModal.classList.add('hidden');
    citationModal.classList.remove('flex');
  }

  // ---------- generate report ----------
  // Reuses linkifyCitations()/openCitationModal() from the chat pipeline —
  // the backend numbers report citations the same way chat answers do,
  // so "[0]" markers in the report text become the same clickable pills.

  function loadingDots() {
    return `
      <div class="flex items-center gap-1.5 py-8 justify-center">
        <span class="typing-dot w-1.5 h-1.5 rounded-full bg-[#A89C8C]"></span>
        <span class="typing-dot w-1.5 h-1.5 rounded-full bg-[#A89C8C]"></span>
        <span class="typing-dot w-1.5 h-1.5 rounded-full bg-[#A89C8C]"></span>
      </div>`;
  }

  function renderReportBody(reportText, citations) {
    const lines = reportText.split('\n').filter(l => l.trim().length > 0);
    return lines.map(line => {
      if (line.startsWith('## ')) {
        return `<h4 class="font-display text-[16px] font-semibold text-[#E3A63C] mt-5 mb-2 first:mt-0">${escapeHtml(line.slice(3).trim())}</h4>`;
      }
      return `<p class="text-sm leading-relaxed text-[#F3EFE7] mb-2">${linkifyCitations(line, citations)}</p>`;
    }).join('');
  }

  async function openReportModal() {
    reportModal.classList.remove('hidden');
    reportModal.classList.add('flex');
    reportDownloadBtn.classList.add('hidden');
    lastReportData = null;
    const body = document.getElementById('report-modal-body');
    body.innerHTML = loadingDots();
    try {
      const data = await api('/api/report', { method: 'POST' });
      lastReportData = data;
      body.innerHTML = renderReportBody(data.reportText, data.citations || []);
      body.querySelectorAll('.citation-inline-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-citation-index'));
          if (data.citations && data.citations[idx]) openCitationModal(data.citations[idx]);
        });
      });
      reportDownloadBtn.classList.remove('hidden');
    } catch (err) {
      body.innerHTML = `<p class="text-sm text-[#C1443A]">${escapeHtml(err.message || 'Could not generate report.')}</p>`;
    }
  }

  function closeReportModal() {
    reportModal.classList.add('hidden');
    reportModal.classList.remove('flex');
  }

  // Builds a formatted PDF from the last generated report — headings,
  // body text (word-wrapped, paginated), and a "Sources cited" appendix
  // with each citation's label, excerpt, and URL. Runs entirely in the
  // browser via jsPDF; no backend call needed since we already have the
  // report data from openReportModal().
  function downloadReportPdf() {
    if (!lastReportData) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    function ensureSpace(lineHeight) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }

    function cleanPDFText(text) {
      if (!text) return '';
      return text
        .replace(/[\u0000-\u001F\u007F-\u009F\uFEFF\uFFFD\u00FE\u00FF]/g, '')
        .replace(/[^\x20-\x7E\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text('Sourcify Report', margin, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(110, 100, 90);
    const generated = lastReportData.generatedAt ? new Date(lastReportData.generatedAt).toLocaleString() : '';
    doc.text(`Generated ${generated}`, margin, y);
    y += 14;
    const counts = lastReportData.sourceCounts || {};
    doc.text(`Sources — article: ${counts.article || 0}, discussion: ${counts.discussion || 0}, video: ${counts.video || 0}`, margin, y);
    y += 26;

    doc.setTextColor(20, 20, 20);
    const lines = (lastReportData.reportText || '').split('\n').filter(l => l.trim().length > 0);
    lines.forEach(line => {
      const cleanLine = cleanPDFText(line);
      if (line.startsWith('## ')) {
        y += 8;
        ensureSpace(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(cleanLine, margin, y);
        y += 18;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
      } else if (cleanLine) {
        const wrapped = doc.splitTextToSize(cleanLine, maxWidth);
        wrapped.forEach(w => {
          ensureSpace(15);
          doc.text(w, margin, y);
          y += 15;
        });
        y += 4;
      }
    });

    const citations = lastReportData.citations || [];
    if (citations.length) {
      y += 12;
      ensureSpace(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(20, 20, 20);
      doc.text('Sources cited', margin, y);
      y += 18;

      citations.forEach((c, i) => {
        const { label } = citationDisplay(c);
        ensureSpace(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(180, 90, 30);
        doc.text(`[${i}] ${cleanPDFText(label)}`, margin, y);
        y += 12;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const excerpt = cleanPDFText((c.text || '').slice(0, 220));
        doc.splitTextToSize(excerpt, maxWidth).forEach(w => {
          ensureSpace(11);
          doc.text(w, margin, y);
          y += 11;
        });

        if (c.url) {
          doc.setTextColor(120, 120, 120);
          doc.splitTextToSize(c.url, maxWidth).forEach(w => {
            ensureSpace(11);
            doc.text(w, margin, y);
            y += 11;
          });
        }
        y += 8;
        doc.setTextColor(20, 20, 20);
      });
    }

    doc.save(`sourcify-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  reportBtn.addEventListener('click', openReportModal);
  document.getElementById('report-modal-close').addEventListener('click', closeReportModal);
  reportModal.addEventListener('click', (e) => { if (e.target === reportModal) closeReportModal(); });
  reportDownloadBtn.addEventListener('click', downloadReportPdf);

  // ---------- check contradictions ----------

  function truncate(text, n) {
    if (!text) return '';
    return text.length > n ? text.slice(0, n) + '…' : text;
  }

  function renderContradictionCard(c, i) {
    const a = citationDisplay(c.citationA);
    const b = citationDisplay(c.citationB);
    return `
      <div class="bg-[#16110C] border border-[#2A2622] rounded-[14px] p-5 ${i > 0 ? 'mt-4' : ''}">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-[#C1443A]">⚠</span>
          <h4 class="text-sm font-semibold text-[#F3EFE7]">${escapeHtml(c.topic)}</h4>
        </div>
        <p class="text-xs text-[#A89C8C] leading-relaxed mb-4">${escapeHtml(c.explanation)}</p>
        <div class="grid grid-cols-2 gap-3">
          <button class="contradiction-citation-btn text-left bg-[#1B1817] border border-[#2A2622] hover:border-[#E3A63C] rounded-md p-3 transition-colors" data-cindex="${i}" data-side="a">
            <div class="font-mono-ibm text-[10px] uppercase tracking-[0.08em] text-[#6E645A] mb-1">${a.icon} ${a.label}</div>
            <div class="text-xs text-[#F3EFE7]">${escapeHtml(truncate(c.citationA.text, 140))}</div>
          </button>
          <button class="contradiction-citation-btn text-left bg-[#1B1817] border border-[#2A2622] hover:border-[#E3A63C] rounded-md p-3 transition-colors" data-cindex="${i}" data-side="b">
            <div class="font-mono-ibm text-[10px] uppercase tracking-[0.08em] text-[#6E645A] mb-1">${b.icon} ${b.label}</div>
            <div class="text-xs text-[#F3EFE7]">${escapeHtml(truncate(c.citationB.text, 140))}</div>
          </button>
        </div>
      </div>
    `;
  }

  async function openContradictionsModal() {
    contradictionsModal.classList.remove('hidden');
    contradictionsModal.classList.add('flex');
    const body = document.getElementById('contradictions-modal-body');
    body.innerHTML = loadingDots();
    try {
      const data = await api('/api/contradictions', { method: 'POST' });
      if (data.insufficientSources) {
        body.innerHTML = `<p class="text-sm text-[#A89C8C]">${escapeHtml(data.message)}</p>`;
        return;
      }
      if (!data.hasContradictions) {
        body.innerHTML = `<p class="text-sm text-[#5E9C6E]">✓ No contradictions found across your sources.</p>`;
        return;
      }
      body.innerHTML = data.contradictions.map((c, i) => renderContradictionCard(c, i)).join('');
      body.querySelectorAll('.contradiction-citation-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const ci = Number(btn.getAttribute('data-cindex'));
          const side = btn.getAttribute('data-side');
          openCitationModal(data.contradictions[ci][side === 'a' ? 'citationA' : 'citationB']);
        });
      });
    } catch (err) {
      body.innerHTML = `<p class="text-sm text-[#C1443A]">${escapeHtml(err.message || 'Could not check for contradictions.')}</p>`;
    }
  }

  function closeContradictionsModal() {
    contradictionsModal.classList.add('hidden');
    contradictionsModal.classList.remove('flex');
  }

  contradictionsBtn.addEventListener('click', openContradictionsModal);
  document.getElementById('contradictions-modal-close').addEventListener('click', closeContradictionsModal);
  contradictionsModal.addEventListener('click', (e) => { if (e.target === contradictionsModal) closeContradictionsModal(); });

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
  // stream ends, it's swapped for either the full rich bubble (citations,
  // confidence bar, healing log) or an error bubble, depending on whether
  // an 'error' event came through the stream.

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

    renderUserMessage(text);
    chatScroll.scrollTop = chatScroll.scrollHeight;

    await performChatRequest(text);
  }

  async function performChatRequest(text) {
    sendBtn.disabled = true;
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
      let streamError = null;

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
            streamError = payload.error;
          }
        }
      }

      stream.wrapper.remove();
      if (streamError) {
        renderErrorMessage(streamError, text);
      } else {
        renderAssistantMessage({
          text: stream.textNode.textContent,
          citations: finalPayload?.citations || [],
          confidence: finalPayload?.confidence || 0,
          healingLog: finalPayload?.healingLog || [],
        });
      }
    } catch (err) {
      hideTypingIndicator();
      renderErrorMessage("Couldn't reach the server — check your connection and try again.", text);
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