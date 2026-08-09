import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ReportModal } from '../components/ReportModal';
import { ContradictionsModal } from '../components/ContradictionsModal';
import { CitationModal } from '../components/CitationModal';

const typeMeta = {
  article: { label: 'Article / Wiki', badge: 'A', color: '#E3A63C' },
  discussion: { label: 'Discussion Thread', badge: 'T', color: '#C1443A' },
  video: { label: 'Video Transcript', badge: 'V', color: '#A89C8C' },
};

export function AppPage({ user, onLogout }) {
  const [sources, setSources] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [stage, setStage] = useState('sources'); // 'sources' | 'chat'
  
  // Ingestion inputs
  const [inputUrls, setInputUrls] = useState({ article: '', discussion: '', video: '' });
  const [sourceStatuses, setSourceStatuses] = useState({
    article: { status: 'idle', label: 'Idle' },
    discussion: { status: 'idle', label: 'Idle' },
    video: { status: 'idle', label: 'Idle' },
  });

  // Chat
  const [prompt, setPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState(null);
  
  // Modals
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [reportModalData, setReportModalData] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [contradictionsModalData, setContradictionsModalData] = useState(null);
  const [showContradictionsModal, setShowContradictionsModal] = useState(false);
  const [activeCitation, setActiveCitation] = useState(null);

  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  // Load sessions and sources on boot
  useEffect(() => {
    async function init() {
      try {
        const me = await api.checkAuth();
        if (!me?.user) {
          navigate('/login');
          return;
        }
        await loadSessionsAndSources();
      } catch (err) {
        navigate('/login');
      }
    }
    init();
  }, [navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMsg]);

  async function loadSessionsAndSources() {
    try {
      const sessData = await api.getSessions();
      setSessions(sessData.sessions || []);
      setActiveSessionId(sessData.activeSessionId);

      const srcData = await api.getSources();
      const fetchedSources = srcData.sources || [];
      setSources(fetchedSources);

      // Populate input URLs and statuses from existing sources
      const newStatuses = {
        article: { status: 'idle', label: 'Idle' },
        discussion: { status: 'idle', label: 'Idle' },
        video: { status: 'idle', label: 'Idle' },
      };
      const newUrls = { article: '', discussion: '', video: '' };

      fetchedSources.forEach((s) => {
        newUrls[s.type] = s.url || '';
        if (s.status === 'ready') {
          newStatuses[s.type] = {
            status: 'ready',
            label: `Ready (${s.chunkCount || 0} chunks)`,
          };
        } else if (s.status === 'error') {
          newStatuses[s.type] = {
            status: 'error',
            label: s.errorMessage || 'Failed',
          };
        } else if (s.status === 'ingesting') {
          newStatuses[s.type] = { status: 'loading', label: 'Ingesting…' };
        }
      });

      setInputUrls(newUrls);
      setSourceStatuses(newStatuses);

      // Auto-enter stage 2 if at least 1 source is ready
      const readyCount = fetchedSources.filter((s) => s.status === 'ready').length;
      if (readyCount > 0) {
        setStage('chat');
      }
    } catch (err) {
      console.error('Error loading sessions/sources:', err);
    }
  }

  const readySourcesCount = sources.filter((s) => s.status === 'ready').length;

  const handleIngestSingle = async (type) => {
    const url = inputUrls[type]?.trim();
    if (!url) return;

    setSourceStatuses((prev) => ({
      ...prev,
      [type]: { status: 'loading', label: 'Ingesting…' },
    }));

    try {
      await api.ingestSource(type, url);
      await loadSessionsAndSources();
    } catch (err) {
      setSourceStatuses((prev) => ({
        ...prev,
        [type]: { status: 'error', label: err.message || 'Ingestion failed' },
      }));
    }
  };

  const handleIngestAll = async () => {
    const typesToIngest = ['article', 'discussion', 'video'].filter(
      (type) => inputUrls[type]?.trim().length > 0
    );
    if (typesToIngest.length === 0) return;

    typesToIngest.forEach((type) => {
      setSourceStatuses((prev) => ({
        ...prev,
        [type]: { status: 'loading', label: 'Ingesting…' },
      }));
    });

    for (const type of typesToIngest) {
      try {
        await api.ingestSource(type, inputUrls[type].trim());
      } catch (err) {
        setSourceStatuses((prev) => ({
          ...prev,
          [type]: { status: 'error', label: err.message || 'Ingestion failed' },
        }));
      }
    }

    await loadSessionsAndSources();
  };

  const handleSendChat = async (e) => {
    e?.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isStreaming) return;

    const userMessage = { role: 'user', content: cleanPrompt, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setIsStreaming(true);

    let streamState = { text: '', citations: [], confidence: null, healingLog: [] };
    setStreamingMsg({ role: 'assistant', text: '', isStreaming: true });

    await api.streamChat(cleanPrompt, {
      onMeta: (meta) => {
        streamState.citations = meta.citations || [];
        streamState.confidence = meta.confidence;
        streamState.healingLog = meta.healingLog || [];
      },
      onToken: (token) => {
        streamState.text += token;
        setStreamingMsg({ ...streamState, role: 'assistant', isStreaming: true });
      },
      onDone: (doneData) => {
        const finalMsg = {
          role: 'assistant',
          text: doneData.text || streamState.text,
          citations: doneData.citations || streamState.citations,
          confidence: doneData.confidence || streamState.confidence,
          healingLog: doneData.healingLog || streamState.healingLog,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, finalMsg]);
        setStreamingMsg(null);
        setIsStreaming(false);
      },
      onError: (err) => {
        const errorMsg = {
          role: 'assistant',
          text: `⚠️ Error generating answer: ${err.message}`,
          isError: true,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setStreamingMsg(null);
        setIsStreaming(false);
      },
    });
  };

  const handleGenerateReport = async () => {
    try {
      const data = await api.generateReport();
      setReportModalData(data);
      setShowReportModal(true);
    } catch (err) {
      alert(`Report failed: ${err.message}`);
    }
  };

  const handleCheckContradictions = async () => {
    try {
      const data = await api.checkContradictions();
      setContradictionsModalData(data);
      setShowContradictionsModal(true);
    } catch (err) {
      alert(`Contradiction check failed: ${err.message}`);
    }
  };

  const handleNewTopic = async () => {
    try {
      await api.createSession('New Topic');
      setStage('sources');
      setMessages([]);
      setInputUrls({ article: '', discussion: '', video: '' });
      await loadSessionsAndSources();
      setShowHistoryModal(false);
    } catch (err) {
      console.error('Failed creating topic:', err);
    }
  };

  const handleSelectSession = async (id) => {
    try {
      await api.selectSession(id);
      await loadSessionsAndSources();
      setShowHistoryModal(false);
    } catch (err) {
      console.error('Failed selecting session:', err);
    }
  };

  const renderFormattedAnswer = (text, citations = []) => {
    if (!text) return null;
    const parts = text.split(/(\[\d+(?:,\s*\d+)*\])/g);

    return parts.map((part, pIdx) => {
      const match = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
      if (match) {
        const indices = match[1].split(',').map((s) => parseInt(s.trim(), 10));
        return (
          <span key={pIdx} className="inline-flex gap-1 mx-0.5">
            {indices.map((cIdx) => {
              const cit = citations[cIdx];
              return (
                <button
                  key={cIdx}
                  onClick={() => cit && setActiveCitation({ citation: cit, index: cIdx })}
                  className="font-mono-ibm text-xs bg-[#E3A63C]/15 border border-[#E3A63C]/30 text-[#E3A63C] hover:bg-[#E3A63C]/30 px-1.5 py-0.2 rounded transition-colors cursor-pointer"
                >
                  [{cIdx}]
                </button>
              );
            })}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="bg-[#0C0B0A] text-[#F3EFE7] font-body antialiased h-screen overflow-hidden flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-[#221F1B]">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-8 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-[20px] font-semibold tracking-tight">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="8" r="4" fill="#E3A63C" />
              <circle cx="7" cy="24" r="4" fill="#C1443A" />
              <circle cx="24" cy="16" r="4.5" fill="#F3EFE7" />
              <path d="M10.5 9.5L20 15" stroke="#A89C8C" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M10.5 22.5L20 17" stroke="#A89C8C" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span>
              <span className="text-[#E3A63C]">Source</span>
              <span className="text-[#C1443A]">ify</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="font-mono-ibm text-xs text-[#A89C8C] border border-[#332E28] rounded-full px-3 py-1.5 hover:border-[#E3A63C] hover:text-[#E3A63C] transition-colors cursor-pointer"
            >
              🕘 History
            </button>
            <div className="font-mono-ibm text-xs text-[#6E645A] border border-[#332E28] rounded-full px-3 py-1.5">
              {readySourcesCount} / 3 sources ready
            </div>

            <div className="relative">
              <button
                onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                className="w-8 h-8 rounded-full bg-[#1B1817] border border-[#332E28] flex items-center justify-center font-mono-ibm text-xs text-[#A89C8C] hover:border-[#E3A63C] hover:text-[#E3A63C] transition-colors cursor-pointer"
              >
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </button>

              {showAvatarMenu && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-44 bg-[#1B1817] border border-[#2A2622] rounded-[12px] shadow-[0_12px_32px_rgba(0,0,0,0.4)] overflow-hidden z-50">
                  <Link
                    to="/settings"
                    className="block px-4 py-3 text-sm text-[#F3EFE7] hover:bg-[#221E1B] transition-colors"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={async () => {
                      await api.logout();
                      if (onLogout) onLogout();
                      navigate('/login');
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-[#C1443A] hover:bg-[#221E1B] transition-colors border-t border-[#2A2622] cursor-pointer"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* STAGE 1 — Sources setup */}
      {stage === 'sources' && (
        <main className="flex-1 min-h-0 overflow-y-auto flex items-start justify-center px-6 pt-16 pb-12">
          <div className="w-full max-w-[640px]">
            <div className="text-center mb-9">
              <h1 className="font-display text-[30px] font-semibold mb-3">Bring your sources.</h1>
              <p className="text-[15px] text-[#A89C8C] max-w-[46ch] mx-auto leading-relaxed">
                Add an article, a discussion thread, and a video — Sourcify reads all three, then you can start asking questions.
              </p>
            </div>

            <div className="flex flex-col gap-4 mb-7">
              {['article', 'discussion', 'video'].map((type) => {
                const meta = typeMeta[type];
                const statusObj = sourceStatuses[type];
                const placeholders = {
                  article: 'Paste an article or Wikipedia link…',
                  discussion: 'Paste a Hacker News or Stack Exchange link…',
                  video: 'Paste a YouTube link…',
                };

                return (
                  <div key={type} className="bg-[#1B1817] border border-[#2A2622] rounded-[16px] p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-9 h-9 shrink-0 rounded-md flex items-center justify-center font-mono-ibm text-xs font-semibold"
                        style={{ backgroundColor: `${meta.color}24`, color: meta.color }}
                      >
                        {meta.badge}
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono-ibm text-[11px] tracking-[0.1em] uppercase text-[#6E645A]">
                          {meta.label}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`w-[7px] h-[7px] rounded-full shrink-0 ${
                              statusObj.status === 'ready'
                                ? 'bg-[#5E9C6E]'
                                : statusObj.status === 'loading'
                                ? 'bg-[#E3A63C] animate-pulse'
                                : statusObj.status === 'error'
                                ? 'bg-[#C1443A]'
                                : 'bg-[#45403A]'
                            }`}
                          />
                          <span className="text-xs text-[#A89C8C]">{statusObj.label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={inputUrls[type]}
                        onChange={(e) => setInputUrls({ ...inputUrls, [type]: e.target.value })}
                        placeholder={placeholders[type]}
                        className="flex-1 bg-[#16110C] border border-[#332E28] rounded-md px-3.5 py-3 text-sm placeholder:text-[#4E463D] focus:outline-none focus:border-[#E3A63C] transition-colors text-[#F3EFE7]"
                      />
                      <button
                        onClick={() => handleIngestSingle(type)}
                        disabled={statusObj.status === 'loading' || !inputUrls[type]?.trim()}
                        className="text-xs font-semibold bg-[#2A2622] hover:bg-[#332E28] border border-[#3E3832] text-[#F3EFE7] px-4 py-3 rounded-md transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        Fetch
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleIngestAll}
              className="w-full text-[15px] font-semibold bg-gradient-to-br from-[#E3A63C] to-[#C1443A] text-[#16110C] px-6 py-3.5 rounded-md hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(227,166,60,0.18)] transition-all cursor-pointer"
            >
              Ingest Sources
            </button>

            <p className="font-mono-ibm text-[11px] text-[#6E645A] mt-4 text-center leading-relaxed">
              Sources are chunked and embedded locally — nothing leaves until you ask a question.
            </p>

            {readySourcesCount > 0 && (
              <button
                onClick={() => setStage('chat')}
                className="w-full text-[15px] font-semibold border border-[#E3A63C] text-[#E3A63C] px-6 py-3.5 rounded-md mt-4 hover:bg-[#E3A63C]/[0.14] transition-colors cursor-pointer"
              >
                Start chatting →
              </button>
            )}
          </div>
        </main>
      )}

      {/* STAGE 2 — Workspace Chat */}
      {stage === 'chat' && (
        <main className="flex-1 min-h-0 max-w-[1400px] w-full mx-auto grid grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="border-r border-[#221F1B] flex flex-col min-h-0 overflow-y-auto bg-[#0F0E0D]">
            <div className="p-6 pb-4">
              <h2 className="font-display text-[18px] font-semibold mb-1.5">Your sources</h2>
              <p className="font-mono-ibm text-xs text-[#5E9C6E]">{readySourcesCount} / 3 ready</p>
            </div>

            <div className="px-6 flex flex-col gap-3">
              {['article', 'discussion', 'video'].map((type) => {
                const s = sources.find((src) => src.type === type);
                const meta = typeMeta[type];
                return (
                  <div
                    key={type}
                    className="bg-[#16110C] border border-[#2A2622] rounded-[12px] p-3 flex items-center gap-3"
                  >
                    <div
                      className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center font-mono-ibm text-[11px] font-semibold"
                      style={{ backgroundColor: `${meta.color}24`, color: meta.color }}
                    >
                      {meta.badge}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-[#F3EFE7] truncate">{meta.label}</div>
                      <div className="text-[11px] text-[#6E645A] truncate">{s?.url || 'Not added'}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 mt-6 pt-6 border-t border-[#221F1B] flex flex-col gap-2">
              <div className="font-mono-ibm text-[11px] tracking-[0.1em] uppercase text-[#6E645A] mb-1">
                Actions
              </div>
              <button
                onClick={handleGenerateReport}
                className="w-full flex items-center gap-2.5 text-sm font-medium border border-[#332E28] rounded-md px-4 py-2.5 hover:border-[#E3A63C] hover:bg-[#E3A63C]/[0.1] transition-colors cursor-pointer text-[#F3EFE7]"
              >
                <span>📄</span>
                <span>Generate report</span>
              </button>
              <button
                onClick={handleCheckContradictions}
                className="w-full flex items-center gap-2.5 text-sm font-medium border border-[#332E28] rounded-md px-4 py-2.5 hover:border-[#C1443A] hover:bg-[#C1443A]/[0.1] transition-colors cursor-pointer text-[#F3EFE7]"
              >
                <span>⚠</span>
                <span>Check contradictions</span>
              </button>
            </div>

            <div className="p-6 mt-auto border-t border-[#221F1B]">
              <button
                onClick={handleNewTopic}
                className="w-full text-sm font-medium border border-[#332E28] rounded-md px-4 py-2.5 hover:border-[#E3A63C] hover:bg-[#E3A63C]/[0.14] transition-colors cursor-pointer text-[#F3EFE7]"
              >
                + New conversation
              </button>
            </div>
          </aside>

          {/* Chat Stream Area */}
          <section className="flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-6 pt-8">
              <div className="max-w-[760px] w-full mx-auto flex flex-col gap-8 flex-1">
                {messages.length === 0 && !streamingMsg && (
                  <div className="mx-auto text-center max-w-[42ch] pt-12">
                    <div className="font-mono-ibm text-xs tracking-[0.14em] uppercase text-[#E3A63C] mb-3">
                      Ready when you are
                    </div>
                    <h2 className="font-display text-[26px] font-semibold mb-3">
                      Ask anything about your sources.
                    </h2>
                    <p className="text-[15px] text-[#A89C8C] leading-relaxed">
                      Sourcify will retrieve, verify, and cite before it answers.
                    </p>
                  </div>
                )}

                {/* Message History */}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-2`}
                  >
                    <div className="font-mono-ibm text-[11px] text-[#6E645A] uppercase">
                      {msg.role === 'user' ? 'You' : 'Sourcify'}
                    </div>

                    <div
                      className={`max-w-[90%] rounded-2xl p-5 ${
                        msg.role === 'user'
                          ? 'bg-[#1B1817] border border-[#2A2622] text-[#F3EFE7]'
                          : msg.isError
                          ? 'bg-[#C1443A]/10 border border-[#C1443A]/30 text-[#C1443A]'
                          : 'bg-[#16110C] border border-[#2A2622] text-[#F3EFE7]'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      ) : (
                        <div>
                          {/* Confidence Badge */}
                          {msg.confidence && (
                            <div className="inline-flex items-center gap-1.5 font-mono-ibm text-[11px] font-semibold px-2.5 py-0.5 rounded border mb-3 bg-[#5E9C6E]/15 text-[#5E9C6E] border-[#5E9C6E]/30">
                              <span>✓ Grounded ({msg.confidence.label})</span>
                            </div>
                          )}

                          <div className="text-sm leading-relaxed whitespace-pre-wrap font-body">
                            {renderFormattedAnswer(msg.text, msg.citations)}
                          </div>

                          {/* Healing Log Expander */}
                          {msg.healingLog && msg.healingLog.length > 0 && (
                            <details className="mt-4 pt-3 border-t border-[#2A2622] text-xs text-[#A89C8C]">
                              <summary className="font-mono-ibm text-xs text-[#E3A63C] select-none hover:underline">
                                ↺ View Self-Healing Log ({msg.healingLog.length} retries)
                              </summary>
                              <div className="mt-2 space-y-2 font-mono-ibm text-[11px] bg-[#0C0B0A] p-3 rounded-lg border border-[#2A2622]">
                                {msg.healingLog.map((log, lIdx) => (
                                  <div key={lIdx} className="border-b border-[#2A2622] last:border-0 pb-1.5 last:pb-0">
                                    <span className="text-[#E3A63C]">Pass {log.attempt}:</span> {log.reason}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Active SSE Streaming Message */}
                {streamingMsg && (
                  <div className="flex flex-col items-start gap-2">
                    <div className="font-mono-ibm text-[11px] text-[#E3A63C] uppercase animate-pulse">
                      Sourcify is answering…
                    </div>
                    <div className="max-w-[90%] bg-[#16110C] border border-[#2A2622] text-[#F3EFE7] rounded-2xl p-5">
                      <div className="text-sm leading-relaxed whitespace-pre-wrap font-body">
                        {renderFormattedAnswer(streamingMsg.text, streamingMsg.citations)}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="sticky bottom-0 mt-8 bg-[#0C0B0A] shrink-0 border-t border-[#221F1B] py-4">
                <form
                  onSubmit={handleSendChat}
                  className="max-w-[760px] mx-auto flex items-center gap-3 bg-[#1B1817] border border-[#2A2622] rounded-[14px] px-4 py-3 focus-within:border-[#E3A63C] transition-colors"
                >
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask something about your sources…"
                    className="flex-1 bg-transparent text-sm placeholder:text-[#6E645A] focus:outline-none py-1 text-[#F3EFE7]"
                  />
                  <button
                    type="submit"
                    disabled={isStreaming || !prompt.trim()}
                    className="shrink-0 w-9 h-9 rounded-md bg-gradient-to-br from-[#E3A63C] to-[#C1443A] text-[#16110C] flex items-center justify-center hover:-translate-y-0.5 transition-transform disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </form>
                <p className="font-mono-ibm text-[11px] text-[#6E645A] mt-2.5 text-center">
                  Answers are grounded only in what you've ingested — with citations for every claim.
                </p>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="bg-[#1B1817] border border-[#2A2622] rounded-[20px] w-full max-w-[480px] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-[20px] font-semibold text-[#F3EFE7]">Your topics</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-[#A89C8C] hover:text-[#F3EFE7] p-1.5 rounded-lg hover:bg-[#2A2622]"
              >
                ✕
              </button>
            </div>
            <button
              onClick={handleNewTopic}
              className="w-full text-sm font-semibold bg-gradient-to-br from-[#E3A63C] to-[#C1443A] text-[#16110C] px-4 py-2.5 rounded-md mb-5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              + Start new topic
            </button>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  onClick={() => handleSelectSession(sess.id)}
                  className={`p-3 rounded-xl border text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                    sess.id === activeSessionId
                      ? 'bg-[#E3A63C]/10 border-[#E3A63C]/40 text-[#E3A63C]'
                      : 'bg-[#16110C] border-[#2A2622] text-[#F3EFE7] hover:border-[#332E28]'
                  }`}
                >
                  <span className="truncate">{sess.title || 'Untitled Session'}</span>
                  <span className="text-xs text-[#6E645A] font-mono-ibm shrink-0">
                    {new Date(sess.updatedAt || sess.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        reportData={reportModalData}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onCitationClick={(cit, idx) => setActiveCitation({ citation: cit, index: idx })}
      />

      {/* Contradictions Modal */}
      <ContradictionsModal
        data={contradictionsModalData}
        isOpen={showContradictionsModal}
        onClose={() => setShowContradictionsModal(false)}
        onCitationClick={(cit) => setActiveCitation({ citation: cit, index: 0 })}
      />

      {/* Citation Modal */}
      <CitationModal
        citation={activeCitation?.citation}
        index={activeCitation?.index ?? 0}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
}
