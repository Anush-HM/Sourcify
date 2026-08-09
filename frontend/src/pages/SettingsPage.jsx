import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const typeMeta = {
  article: { label: 'Article / Wiki', badge: 'A', color: '#E3A63C' },
  discussion: { label: 'Discussion Thread', badge: 'T', color: '#C1443A' },
  video: { label: 'Video Transcript', badge: 'V', color: '#A89C8C' },
};

export function SettingsPage({ user, onLogout }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const me = await api.checkAuth();
        if (me?.user) {
          setName(me.user.name);
          setEmail(me.user.email);
        }
        const data = await api.getSources();
        setSources(data.sources || []);
      } catch (err) {
        if (err.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoadingSources(false);
      }
    }
    loadData();
  }, [navigate]);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setProfileMsg("Saved locally — profile updates aren't connected to the backend yet.");
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordMsg("Looks good locally — password updates aren't connected to the backend yet.");
    setCurrentPassword('');
    setNewPassword('');
  };

  const handleRemoveSource = async (id) => {
    try {
      await api.deleteSource(id);
      const data = await api.getSources();
      setSources(data.sources || []);
    } catch (err) {
      console.error('Failed to remove source:', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Delete your account? This can't be undone.")) return;
    try {
      await api.logout();
      if (onLogout) onLogout();
      alert("Account deletion isn't connected to the backend yet — you've been logged out instead.");
      navigate('/login');
    } catch (err) {
      navigate('/login');
    }
  };

  return (
    <div className="bg-[#0C0B0A] text-[#F3EFE7] font-body antialiased min-h-screen flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-[#221F1B]">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-8 py-4">
          <Link to="/app" className="flex items-center gap-2 font-display text-[20px] font-semibold tracking-tight">
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
          <Link
            to="/app"
            className="text-sm text-[#A89C8C] hover:text-[#F3EFE7] transition-colors inline-flex items-center gap-1.5 font-medium"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to chat
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-14">
        <div className="max-w-[640px] mx-auto">
          <div className="mb-10">
            <div className="font-mono-ibm text-xs tracking-[0.14em] uppercase text-[#E3A63C] mb-3">Account</div>
            <h1 className="font-display text-[30px] font-semibold mb-2">Settings</h1>
            <p className="text-[15px] text-[#A89C8C]">Manage your profile, password, and data.</p>
          </div>

          {/* Profile */}
          <section className="bg-[#1B1817] border border-[#2A2622] rounded-[16px] p-7 mb-6">
            <h2 className="font-display text-[19px] font-semibold mb-5">Profile</h2>
            {profileMsg && (
              <div className="text-sm text-[#5E9C6E] bg-[#5E9C6E]/[0.1] border border-[#5E9C6E]/30 rounded-md px-3.5 py-2.5 mb-4">
                {profileMsg}
              </div>
            )}
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
              <label className="block">
                <span className="text-xs font-medium text-[#A89C8C] mb-1.5 block">Full name</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#16110C] border border-[#332E28] rounded-md px-3.5 py-3 text-sm focus:outline-none focus:border-[#E3A63C] transition-colors text-[#F3EFE7]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-[#A89C8C] mb-1.5 block">Email</span>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full bg-[#16110C] border border-[#332E28] rounded-md px-3.5 py-3 text-sm text-[#6E645A] cursor-not-allowed"
                />
              </label>
              <button
                type="submit"
                className="self-start text-sm font-semibold bg-gradient-to-br from-[#E3A63C] to-[#C1443A] text-[#16110C] px-5 py-2.5 rounded-md hover:-translate-y-0.5 transition-transform cursor-pointer"
              >
                Save changes
              </button>
            </form>
          </section>

          {/* Password */}
          <section className="bg-[#1B1817] border border-[#2A2622] rounded-[16px] p-7 mb-6">
            <h2 className="font-display text-[19px] font-semibold mb-5">Password</h2>
            {passwordMsg && (
              <div className="text-sm rounded-md px-3.5 py-2.5 mb-4 text-[#5E9C6E] bg-[#5E9C6E]/[0.1] border border-[#5E9C6E]/30">
                {passwordMsg}
              </div>
            )}
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <label className="block">
                <span className="text-xs font-medium text-[#A89C8C] mb-1.5 block">Current password</span>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#16110C] border border-[#332E28] rounded-md px-3.5 py-3 text-sm placeholder:text-[#4E463D] focus:outline-none focus:border-[#E3A63C] transition-colors text-[#F3EFE7]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-[#A89C8C] mb-1.5 block">New password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-[#16110C] border border-[#332E28] rounded-md px-3.5 py-3 text-sm placeholder:text-[#4E463D] focus:outline-none focus:border-[#E3A63C] transition-colors text-[#F3EFE7]"
                />
              </label>
              <button
                type="submit"
                className="self-start text-sm font-medium border border-[#332E28] rounded-md px-5 py-2.5 hover:border-[#E3A63C] hover:bg-[#E3A63C]/[0.14] transition-colors cursor-pointer text-[#F3EFE7]"
              >
                Update password
              </button>
            </form>
          </section>

          {/* Sources */}
          <section className="bg-[#1B1817] border border-[#2A2622] rounded-[16px] p-7 mb-6">
            <h2 className="font-display text-[19px] font-semibold mb-1.5">Ingested sources</h2>
            <p className="text-sm text-[#A89C8C] mb-5">Remove a source to stop it from being used in future answers.</p>

            <div className="flex flex-col gap-3">
              {loadingSources ? (
                <p className="text-sm text-[#6E645A]">Loading…</p>
              ) : sources.length === 0 ? (
                <p className="text-sm text-[#6E645A]">No sources ingested yet.</p>
              ) : (
                sources.map((s) => {
                  const meta = typeMeta[s.type] || { label: s.type, badge: 'S', color: '#A89C8C' };
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 bg-[#16110C] border border-[#2A2622] rounded-[12px] p-3.5"
                    >
                      <div
                        className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center font-mono-ibm text-[11px] font-semibold"
                        style={{ backgroundColor: `${meta.color}24`, color: meta.color }}
                      >
                        {meta.badge}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-[#F3EFE7] truncate">{meta.label}</div>
                        <div className="text-[11px] text-[#6E645A] truncate">{s.url}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveSource(s.id)}
                        className="shrink-0 text-xs font-medium text-[#C1443A] hover:bg-[#C1443A]/[0.14] rounded-md px-3 py-1.5 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Danger zone */}
          <section className="bg-[#1B1817] border border-[#C1443A]/30 rounded-[16px] p-7">
            <h2 className="font-display text-[19px] font-semibold mb-1.5 text-[#C1443A]">Danger zone</h2>
            <p className="text-sm text-[#A89C8C] mb-5">
              Deleting your account removes your profile, sources, and chat history permanently. This can't be undone.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="text-sm font-semibold border border-[#C1443A] text-[#C1443A] rounded-md px-5 py-2.5 hover:bg-[#C1443A]/[0.14] transition-colors cursor-pointer"
            >
              Delete account
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
