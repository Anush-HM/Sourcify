import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { api } from '../services/api';

export function SignupPage({ onSignupSuccess }) {
  const [name, setName] = useState('');
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
      const data = await api.signup(name, email, password);
      if (onSignupSuccess) onSignupSuccess(data.user);
      navigate('/app');
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
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
            <div className="font-mono-ibm text-xs tracking-[0.14em] uppercase text-[#E3A63C] mb-3">Get started</div>
            <h1 className="font-display text-[28px] font-semibold mb-2">Create your account</h1>
            <p className="text-sm text-[#A89C8C]">Bring three sources, get one grounded answer.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-[#1B1817] border border-[#2A2622] rounded-[18px] p-7 flex flex-col gap-4 shadow-xl">
            {error && (
              <div className="text-sm text-[#C1443A] bg-[#C1443A]/[0.1] border border-[#C1443A]/30 rounded-md px-3.5 py-2.5">
                {error}
              </div>
            )}

            <label className="block">
              <span className="text-xs font-medium text-[#A89C8C] mb-1.5 block">Full name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full bg-[#16110C] border border-[#332E28] rounded-md px-3.5 py-3 text-sm placeholder:text-[#4E463D] focus:outline-none focus:border-[#E3A63C] transition-colors text-[#F3EFE7]"
              />
            </label>

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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-[#16110C] border border-[#332E28] rounded-md px-3.5 py-3 text-sm placeholder:text-[#4E463D] focus:outline-none focus:border-[#E3A63C] transition-colors text-[#F3EFE7]"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full text-[15px] font-semibold bg-gradient-to-br from-[#E3A63C] to-[#C1443A] text-[#16110C] px-6 py-3.5 rounded-md hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(227,166,60,0.18)] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            <p className="text-[11px] text-[#6E645A] text-center leading-relaxed mt-1">
              By creating an account you agree to Sourcify's Terms and Privacy Policy.
            </p>
          </form>

          <p className="text-center text-sm text-[#A89C8C] mt-6">
            Already have an account? <Link to="/login" className="text-[#E3A63C] hover:underline font-medium">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
