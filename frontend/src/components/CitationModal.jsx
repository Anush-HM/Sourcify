import React from 'react';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';

export function CitationModal({ citation, index, onClose }) {
  if (!citation) return null;

  const typeLabels = {
    article: 'Article paragraph',
    discussion: 'Discussion comment',
    video: 'Video transcript segment',
  };

  const getDetailLabel = (c) => {
    if (c.type === 'video' && c.metadata?.startTime !== undefined) {
      const min = Math.floor(c.metadata.startTime / 60);
      const sec = c.metadata.startTime % 60;
      return `Timestamp ${min}:${sec.toString().padStart(2, '0')}`;
    }
    if (c.type === 'discussion' && c.metadata?.commentId) {
      return `Comment #${c.metadata.commentId}`;
    }
    if (c.type === 'article' && c.metadata?.paragraphIndex !== undefined) {
      return `Paragraph ${c.metadata.paragraphIndex + 1}`;
    }
    return '';
  };

  const detailLabel = getDetailLabel(citation);
  const decodedText = decodeHtmlEntities(citation.text);
  const decodedUrl = decodeHtmlEntities(citation.url);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1B1817] border border-[#2A2622] rounded-[18px] w-full max-w-[560px] p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#A89C8C] hover:text-[#F3EFE7] p-1.5 rounded-lg hover:bg-[#2A2622] transition-colors"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono-ibm text-xs font-semibold px-2 py-0.5 rounded bg-[#E3A63C]/20 text-[#E3A63C] border border-[#E3A63C]/30">
            [{index}]
          </span>
          <span className="text-xs uppercase tracking-wider text-[#A89C8C] font-mono-ibm">
            {typeLabels[citation.type] || citation.type}
          </span>
          {detailLabel && (
            <span className="text-xs text-[#E3A63C] font-mono-ibm bg-[#E3A63C]/10 px-2 py-0.5 rounded">
              {detailLabel}
            </span>
          )}
        </div>

        <h3 className="font-display text-[20px] font-semibold text-[#F3EFE7] mb-4">Source evidence</h3>

        <div className="bg-[#16110C] border border-[#332E28] rounded-xl p-4 text-sm text-[#F3EFE7]/90 leading-relaxed max-h-[300px] overflow-y-auto mb-5 font-body">
          {decodedText}
        </div>

        {decodedUrl && (
          <div className="flex items-center justify-between pt-2 border-t border-[#2A2622]">
            <span className="text-xs text-[#A89C8C]">Original source:</span>
            <a
              href={decodedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#E3A63C] hover:underline font-medium truncate max-w-[360px] inline-flex items-center gap-1"
            >
              <span className="truncate">{decodedUrl}</span>
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
