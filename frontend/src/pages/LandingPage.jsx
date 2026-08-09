import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';

export function LandingPage({ user }) {
  return (
    <div className="bg-[#0C0B0A] text-[#F3EFE7] font-body antialiased min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-[1120px] mx-auto pt-24 pb-20 px-8 md:px-5">
          <div className="inline-flex items-center gap-2 font-mono-ibm text-xs tracking-wider uppercase bg-[#1B1817] border border-[#2A2622] rounded-full px-3.5 py-1.5 text-[#E3A63C] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E3A63C] animate-pulse"></span>
            Multi-source RAG platform
          </div>

          <h1 className="font-display text-[44px] sm:text-[56px] md:text-[68px] font-semibold leading-[1.06] tracking-tight mb-7 max-w-[18ch]">
            Bring three sources. Get one grounded answer.
          </h1>

          <p className="text-[#A89C8C] text-[17px] sm:text-[19px] leading-relaxed max-w-[54ch] mb-10">
            Articles, discussion threads, and video transcripts — gathered in one place. Sourcify checks its own work and corrects weak retrieval before you ever see an answer.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/signup"
              className="bg-gradient-to-br from-[#E3A63C] to-[#C1443A] text-[#16110C] text-[16px] font-semibold px-7 py-4 rounded-xl hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(227,166,60,0.2)] transition-all"
            >
              Get started for free →
            </Link>
            <a
              href="#how-it-works"
              className="text-[15px] font-medium text-[#A89C8C] hover:text-[#F3EFE7] px-6 py-4 rounded-xl border border-[#2A2622] hover:border-[#3E3832] transition-colors"
            >
              See how it works
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-[1120px] mx-auto mb-32 px-8 md:px-5" id="features">
          <div className="max-w-[60ch] mb-12">
            <h2 className="font-display text-[34px] font-semibold tracking-tight mb-3">Built for factual research.</h2>
            <p className="text-[#A89C8C] text-[15.5px]">Designed to prevent the quiet failures that break standard RAG pipelines.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#2A2622] border border-[#2A2622] rounded-[22px] overflow-hidden">
            <div className="bg-[#1B1817] hover:bg-[#221E1B] transition-colors p-8">
              <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center mb-5 text-[15px] bg-[#E3A63C]/[0.14] text-[#E3A63C]">◈</div>
              <h3 className="font-display text-lg font-semibold mb-2.5">Multi-source pipeline</h3>
              <p className="text-sm text-[#A89C8C] leading-relaxed">Ingest articles, Hacker News or Stack Exchange threads, and YouTube transcripts with custom chunking for each format.</p>
            </div>

            <div className="bg-[#1B1817] hover:bg-[#221E1B] transition-colors p-8">
              <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center mb-5 text-[15px] bg-[#C1443A]/[0.14] text-[#C1443A]">↺</div>
              <h3 className="font-display text-lg font-semibold mb-2.5">Self-healing RAG</h3>
              <p className="text-sm text-[#A89C8C] leading-relaxed">When initial retrieval is weak, Sourcify rewrites the query and retries automatically before showing you a final response.</p>
            </div>

            <div className="bg-[#1B1817] hover:bg-[#221E1B] transition-colors p-8">
              <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center mb-5 text-[15px] bg-[#5E9C6E]/[0.14] text-[#5E9C6E]">✓</div>
              <h3 className="font-display text-lg font-semibold mb-2.5">Precise citations</h3>
              <p className="text-sm text-[#A89C8C] leading-relaxed">Every claim points back to its exact origin — paragraph index, comment ID, or timestamp link.</p>
            </div>

            <div className="bg-[#1B1817] hover:bg-[#221E1B] transition-colors p-8">
              <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center mb-5 text-[15px] bg-[#E3A63C]/[0.14] text-[#E3A63C]">≈</div>
              <h3 className="font-display text-lg font-semibold mb-2.5">Local vector search</h3>
              <p className="text-sm text-[#A89C8C] leading-relaxed">Embeddings are generated locally using transformer models and searched using cosine similarity in MongoDB.</p>
            </div>

            <div className="bg-[#1B1817] hover:bg-[#221E1B] transition-colors p-8">
              <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center mb-5 text-[15px] bg-[#C1443A]/[0.14] text-[#C1443A]">⇄</div>
              <h3 className="font-display text-lg font-semibold mb-2.5">Provider failover</h3>
              <p className="text-sm text-[#A89C8C] leading-relaxed">If the primary AI provider hits a limit or goes down mid-conversation, Sourcify switches without losing your session.</p>
            </div>

            <div className="bg-[#1B1817] hover:bg-[#221E1B] transition-colors p-8">
              <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center mb-5 text-[15px] bg-[#A89C8C]/[0.14] text-[#A89C8C]">●</div>
              <h3 className="font-display text-lg font-semibold mb-2.5">Session memory</h3>
              <p className="text-sm text-[#A89C8C] leading-relaxed">Come back later and pick up exactly where you left off — sources, history, and citations intact.</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-[1120px] mx-auto mb-32 px-8 md:px-5" id="how-it-works">
          <div className="max-w-[60ch] mb-12">
            <h2 className="font-display text-[34px] font-semibold tracking-tight mb-3">What happens between your question and its answer.</h2>
            <p className="text-[#A89C8C] text-[15.5px]">A fixed sequence, run every time — this is what makes the answer worth trusting.</p>
          </div>

          <div className="flex flex-col">
            <div className="grid grid-cols-[64px_1fr] md:grid-cols-[40px_1fr] gap-7 py-7 border-t border-[#2A2622]">
              <div className="font-mono-ibm text-[13px] text-[#E3A63C] pt-1">01</div>
              <div>
                <h3 className="font-display text-[19px] font-semibold mb-2">Add your sources</h3>
                <p className="text-[14.5px] text-[#A89C8C] max-w-[62ch]">Paste in a link to an article, a discussion thread, and a video. Sourcify fetches and chunks each one using a method suited to its structure.</p>
              </div>
            </div>

            <div className="grid grid-cols-[64px_1fr] md:grid-cols-[40px_1fr] gap-7 py-7 border-t border-[#2A2622]">
              <div className="font-mono-ibm text-[13px] text-[#E3A63C] pt-1">02</div>
              <div>
                <h3 className="font-display text-[19px] font-semibold mb-2">Retrieve what matters</h3>
                <p className="text-[14.5px] text-[#A89C8C] max-w-[62ch]">When you ask a question, Sourcify searches across every ingested source at once for the pieces most relevant to it — not just the first source it checks.</p>
              </div>
            </div>

            <div className="grid grid-cols-[64px_1fr] md:grid-cols-[40px_1fr] gap-7 py-7 border-t border-[#2A2622]">
              <div className="font-mono-ibm text-[13px] text-[#E3A63C] pt-1">03</div>
              <div>
                <h3 className="font-display text-[19px] font-semibold mb-2">Verify before answering</h3>
                <p className="text-[14.5px] text-[#A89C8C] max-w-[62ch]">A second pass checks the draft answer against the retrieved evidence. If it's not well-supported, the question gets reworked and retrieval runs again.</p>
              </div>
            </div>

            <div className="grid grid-cols-[64px_1fr] md:grid-cols-[40px_1fr] gap-7 py-7 border-t border-b border-[#2A2622]">
              <div className="font-mono-ibm text-[13px] text-[#E3A63C] pt-1">04</div>
              <div>
                <h3 className="font-display text-[19px] font-semibold mb-2">Read, with proof</h3>
                <p className="text-[14.5px] text-[#A89C8C] max-w-[62ch]">You get one answer, streamed in as it's generated, with every claim traceable back to the exact source it came from.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-[1120px] mx-auto mb-32 px-8 md:px-5" id="faq">
          <div className="max-w-[60ch] mb-12">
            <h2 className="font-display text-[34px] font-semibold tracking-tight mb-3">Questions, answered.</h2>
            <p className="text-[#A89C8C] text-[15.5px]">If something's missing here, reach out and we'll add it.</p>
          </div>

          <div className="max-w-[760px] flex flex-col gap-px bg-[#2A2622] border border-[#2A2622] rounded-[18px] overflow-hidden">
            <details className="group bg-[#1B1817] p-6 cursor-pointer">
              <summary className="flex items-center justify-between gap-4 select-none">
                <span className="font-display text-[17px] font-semibold">What sources can I actually add?</span>
                <span className="chev shrink-0 text-[#E3A63C] text-xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-sm text-[#A89C8C] leading-relaxed mt-3 max-w-[62ch]">Any article or Wikipedia page, a Hacker News or Stack Exchange thread, and a YouTube video with a transcript available. You can bring up to 3 in the free plan.</p>
            </details>

            <details className="group bg-[#1B1817] p-6 cursor-pointer">
              <summary className="flex items-center justify-between gap-4 select-none">
                <span className="font-display text-[17px] font-semibold">What does "self-healing" actually mean?</span>
                <span className="chev shrink-0 text-[#E3A63C] text-xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-sm text-[#A89C8C] leading-relaxed mt-3 max-w-[62ch]">Before you ever see an answer, a second pass checks whether it's genuinely backed by what was retrieved. If it isn't, Sourcify rewrites the question and tries again — up to twice — rather than showing you a weak guess.</p>
            </details>

            <details className="group bg-[#1B1817] p-6 cursor-pointer">
              <summary className="flex items-center justify-between gap-4 select-none">
                <span className="font-display text-[17px] font-semibold">Will it ever just make something up?</span>
                <span className="chev shrink-0 text-[#E3A63C] text-xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-sm text-[#A89C8C] leading-relaxed mt-3 max-w-[62ch]">Answers are generated only from what's retrieved from your sources, not general model knowledge. If nothing well-supported can be found after retrying, Sourcify tells you that honestly instead of guessing.</p>
            </details>

            <details className="group bg-[#1B1817] p-6 cursor-pointer">
              <summary className="flex items-center justify-between gap-4 select-none">
                <span className="font-display text-[17px] font-semibold">Can I pick up a session later?</span>
                <span className="chev shrink-0 text-[#E3A63C] text-xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-sm text-[#A89C8C] leading-relaxed mt-3 max-w-[62ch]">Yes — your sources and chat history are tied to your account, so refreshing or coming back later picks up exactly where you left off.</p>
            </details>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-8 md:px-5 pb-8 border-t border-[#2A2622]">
        <div className="max-w-[1120px] mx-auto pt-12">
          <div className="flex flex-row items-start justify-between gap-10 max-[520px]:flex-col mb-12">
            <div className="shrink-0">
              <div className="font-display text-[19px] font-semibold mb-3">
                <span className="text-[#E3A63C]">Source</span><span className="text-[#C1443A]">ify</span>
              </div>
              <p class="text-sm text-[#A89C8C] max-w-[34ch]">Multi-source RAG that checks its own answers before you see them.</p>
            </div>

            <div className="flex flex-row gap-16 max-[520px]:gap-10 shrink-0">
              <div>
                <div className="text-sm font-semibold text-[#F3EFE7] mb-4">Product</div>
                <div className="flex flex-col gap-3">
                  <a href="#features" className="text-sm text-[#A89C8C] hover:text-[#F3EFE7] transition-colors">Features</a>
                  <a href="#how-it-works" className="text-sm text-[#A89C8C] hover:text-[#F3EFE7] transition-colors">How it works</a>
                  <Link to="/signup" className="text-sm text-[#A89C8C] hover:text-[#F3EFE7] transition-colors">Get Started</Link>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#F3EFE7] mb-4">Company</div>
                <div className="flex flex-col gap-3">
                  <span className="text-sm text-[#A89C8C]">About</span>
                  <span className="text-sm text-[#A89C8C]">Privacy</span>
                  <span className="text-sm text-[#A89C8C]">Terms</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#2A2622] pt-6 pb-2 text-center">
            <p className="text-xs text-[#6E645A]">© 2026 Sourcify. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
