import React from 'react';

export function ContradictionsModal({ data, isOpen, onClose, onCitationClick }) {
  if (!isOpen || !data) return null;

  const { hasContradictions, contradictions = [], insufficientSources, message, error } = data;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1B1817] border border-[#2A2622] rounded-[20px] w-full max-w-[760px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#2A2622]">
          <div>
            <div className="font-mono-ibm text-xs tracking-widest text-[#C1443A] uppercase mb-1">
              Cross-Source Audit
            </div>
            <h3 className="font-display text-[22px] font-semibold text-[#F3EFE7]">
              Contradictions & Discrepancies
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#A89C8C] hover:text-[#F3EFE7] p-2 rounded-lg hover:bg-[#2A2622] transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-7 overflow-y-auto flex-1">
          {error && (
            <div className="bg-[#C1443A]/10 border border-[#C1443A]/30 text-[#C1443A] p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {insufficientSources && (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-[#E3A63C]/10 border border-[#E3A63C]/30 flex items-center justify-center mx-auto mb-4 text-[#E3A63C]">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h4 className="font-display text-[18px] font-semibold mb-2">Insufficient Source Diversity</h4>
              <p className="text-sm text-[#A89C8C] max-w-[420px] mx-auto">{message}</p>
            </div>
          )}

          {!insufficientSources && !error && !hasContradictions && (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-[#5E9C6E]/10 border border-[#5E9C6E]/30 flex items-center justify-center mx-auto mb-4 text-[#5E9C6E]">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h4 className="font-display text-[18px] font-semibold text-[#5E9C6E] mb-2">
                No Factual Contradictions Found
              </h4>
              <p className="text-sm text-[#A89C8C] max-w-[440px] mx-auto">
                All ingested sources align on key facts, timelines, and claims without major discrepancies.
              </p>
            </div>
          )}

          {!insufficientSources && !error && hasContradictions && (
            <div className="space-y-6">
              {contradictions.map((c, i) => (
                <div key={i} className="bg-[#16110C] border border-[#C1443A]/30 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono-ibm text-xs font-semibold bg-[#C1443A]/20 text-[#C1443A] px-2.5 py-0.5 rounded border border-[#C1443A]/40">
                      Conflict #{i + 1}
                    </span>
                    <h4 className="font-display text-[17px] font-semibold text-[#F3EFE7]">{c.topic}</h4>
                  </div>

                  <p className="text-sm text-[#F3EFE7]/90 mb-4 bg-[#1B1817] p-3.5 rounded-xl border border-[#2A2622] leading-relaxed font-body">
                    {c.explanation}
                  </p>

                  {/* Side-by-side Evidence Chunks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {c.citationA && (
                      <div
                        onClick={() => onCitationClick && onCitationClick(c.citationA)}
                        className="bg-[#1B1817] border border-[#2A2622] hover:border-[#E3A63C]/50 p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono-ibm text-xs uppercase text-[#E3A63C] font-semibold">
                            Source A ({c.citationA.type})
                          </span>
                        </div>
                        <p className="text-xs text-[#F3EFE7]/80 line-clamp-4 leading-relaxed font-body">
                          {c.citationA.text}
                        </p>
                      </div>
                    )}

                    {c.citationB && (
                      <div
                        onClick={() => onCitationClick && onCitationClick(c.citationB)}
                        className="bg-[#1B1817] border border-[#2A2622] hover:border-[#C1443A]/50 p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono-ibm text-xs uppercase text-[#C1443A] font-semibold">
                            Source B ({c.citationB.type})
                          </span>
                        </div>
                        <p className="text-xs text-[#F3EFE7]/80 line-clamp-4 leading-relaxed font-body">
                          {c.citationB.text}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
