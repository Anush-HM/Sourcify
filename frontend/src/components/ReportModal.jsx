import React from 'react';
import { jsPDF } from 'jspdf';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';

export function ReportModal({ reportData, isOpen, onClose, onCitationClick }) {
  if (!isOpen || !reportData) return null;

  const { reportText, citations = [], sourceCounts = {}, generatedAt } = reportData;

  const downloadPDF = () => {
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
      return decodeHtmlEntities(text)
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
    const generated = generatedAt ? new Date(generatedAt).toLocaleString() : '';
    doc.text(`Generated ${generated}`, margin, y);
    y += 14;
    doc.text(
      `Sources — article: ${sourceCounts.article || 0}, discussion: ${sourceCounts.discussion || 0}, video: ${sourceCounts.video || 0}`,
      margin,
      y
    );
    y += 26;

    doc.setTextColor(20, 20, 20);
    const lines = (reportText || '').split('\n').filter((l) => l.trim().length > 0);
    lines.forEach((line) => {
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
        wrapped.forEach((w) => {
          ensureSpace(15);
          doc.text(w, margin, y);
          y += 15;
        });
        y += 4;
      }
    });

    if (citations.length) {
      y += 12;
      ensureSpace(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(20, 20, 20);
      doc.text('Sources cited', margin, y);
      y += 18;

      citations.forEach((c, i) => {
        const label = `${c.type} — ${c.url || 'Source'}`;
        ensureSpace(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(180, 90, 30);
        doc.text(`[${i}] ${cleanPDFText(label)}`, margin, y);
        y += 12;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const excerpt = cleanPDFText((c.text || '').slice(0, 220));
        doc.splitTextToSize(excerpt, maxWidth).forEach((w) => {
          ensureSpace(11);
          doc.text(w, margin, y);
          y += 11;
        });

        if (c.url) {
          doc.setTextColor(120, 120, 120);
          doc.splitTextToSize(cleanPDFText(c.url), maxWidth).forEach((w) => {
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
  };

  const renderFormattedReport = () => {
    if (!reportText) return null;
    const lines = reportText.split('\n');

    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-3" />;

      if (trimmed.startsWith('## ')) {
        return (
          <h4 key={idx} className="font-display text-[18px] font-semibold text-[#E3A63C] mt-6 mb-3 border-b border-[#2A2622] pb-2">
            {decodeHtmlEntities(trimmed.slice(3).trim())}
          </h4>
        );
      }

      // Parse inline citations e.g. [0], [1, 2]
      const parts = trimmed.split(/(\[\d+(?:,\s*\d+)*\])/g);
      return (
        <p key={idx} className="text-sm text-[#F3EFE7]/90 leading-relaxed mb-3 font-body">
          {parts.map((part, pIdx) => {
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
                        onClick={() => onCitationClick && cit && onCitationClick(cit, cIdx)}
                        className="font-mono-ibm text-xs bg-[#E3A63C]/15 border border-[#E3A63C]/30 text-[#E3A63C] hover:bg-[#E3A63C]/30 px-1.5 py-0.2 rounded transition-colors"
                        title={cit ? `View source chunk ${cIdx}` : ''}
                      >
                        [{cIdx}]
                      </button>
                    );
                  })}
                </span>
              );
            }
            return decodeHtmlEntities(part);
          })}
        </p>
      );
    });
  };

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
            <div className="font-mono-ibm text-xs tracking-widest text-[#E3A63C] uppercase mb-1">
              Cross-Source Synthesis
            </div>
            <h3 className="font-display text-[22px] font-semibold text-[#F3EFE7]">Research Report</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadPDF}
              className="text-xs font-semibold bg-gradient-to-br from-[#E3A63C] to-[#C1443A] text-[#16110C] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="text-[#A89C8C] hover:text-[#F3EFE7] p-2 rounded-lg hover:bg-[#2A2622] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-7 overflow-y-auto flex-1">
          {renderFormattedReport()}

          {/* Sources Cited Section */}
          {citations.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[#2A2622]">
              <h4 className="font-display text-[17px] font-semibold text-[#F3EFE7] mb-4">
                Sources Cited ({citations.length})
              </h4>
              <div className="grid gap-3">
                {citations.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => onCitationClick && onCitationClick(c, i)}
                    className="bg-[#16110C] border border-[#2A2622] hover:border-[#E3A63C]/50 rounded-xl p-3.5 cursor-pointer transition-all hover:translate-x-1"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono-ibm text-xs text-[#E3A63C] bg-[#E3A63C]/10 px-2 py-0.5 rounded font-semibold">
                        [{i}]
                      </span>
                      <span className="text-xs uppercase font-mono-ibm text-[#A89C8C]">{c.type}</span>
                      {c.url && (
                        <span className="text-xs font-mono-ibm text-[#6E645A] truncate max-w-[400px]">
                          {decodeHtmlEntities(c.url)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#F3EFE7]/80 line-clamp-2 leading-relaxed">
                      {decodeHtmlEntities(c.text)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
