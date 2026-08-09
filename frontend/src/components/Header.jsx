import React from 'react';
import { Link } from 'react-router-dom';

export function Header({ user, showAuthButtons = true }) {
  return (
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

        {showAuthButtons && (
          <div className="flex items-center gap-4 text-sm font-medium">
            {user ? (
              <Link
                to="/app"
                className="bg-gradient-to-br from-[#E3A63C] to-[#C1443A] text-[#16110C] px-4 py-2 rounded-md hover:-translate-y-0.5 transition-all shadow-[0_4px_16px_rgba(227,166,60,0.15)] font-semibold"
              >
                Go to app →
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-[#A89C8C] hover:text-[#F3EFE7] transition-colors">
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="bg-gradient-to-br from-[#E3A63C] to-[#C1443A] text-[#16110C] px-4 py-2 rounded-md hover:-translate-y-0.5 transition-all shadow-[0_4px_16px_rgba(227,166,60,0.15)] font-semibold"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
