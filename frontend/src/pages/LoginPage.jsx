import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { api } from '../services/api';

export function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(email, password);
      if (onLoginSuccess) onLoginSuccess(data.user);
      navigate('/app');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0C0B0A] text-[#F3EFE7] font-body antialiased min-h-screen flex flex-col">
      <Header showAuthButtons={false} />

      <main className="flex-1 flex items-start justify-center px-6 pt-20 pb-16">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <div className="font-mono-ibm text-xs tracking-[0.14em] uppercase text-[#E3A63C] mb-3">Welcome back</div>
            <h1 className="font-display text-[28px] font-semibold mb-2">Log in to Sourcify</h1>
            <p className="text-sm text-[#A89C8C]">Your sources and chat history pick up right where you left off.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-[#1B1817] border border-[#2A2622] rounded-[18px] p-7 flex flex-col gap-4 shadow-xl">
            {error && (
              <div className="text-sm text-[#C1443A] bg-[#C1443A]/[0.1] border border-[#C1443A]/30 rounded-md px-3.5 py-2.5">
                {error}
              </div>
            )}

            <label className="block">
              <span className="text-xs font-medium text-[#A89C8C] mb-1.5 block">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#16110C] border border-[#332E28] rounded-md px-3.5 py-3 text-sm placeholder:text-[#4E463D] focus:outline-none focus:border-[#E3A63C] transition-colors text-[#F3EFE7]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#A89C8C] mb-1.5 block">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full bg-[#16110C] border border-[#332E28] rounded-md px-3.5 py-3 text-sm placeholder:text-[#4E463D] focus:outline-none focus:border-[#E3A63C] transition-colors text-[#F3EFE7]"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full text-[15px] font-semibold bg-gradient-to-br from-[#E3A63C] to-[#C1443A] text-[#16110C] px-6 py-3.5 rounded-md hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(227,166,60,0.18)] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="text-center text-sm text-[#A89C8C] mt-6">
            Don't have an account? <Link to="/signup" className="text-[#E3A63C] hover:underline font-medium">Sign up</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
