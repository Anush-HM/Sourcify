import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppPage } from './pages/AppPage';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const data = await api.checkAuth();
        if (data?.user) {
          setUser(data.user);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkSession();
  }, []);

  if (checkingAuth) {
    return (
      <div className="h-screen bg-[#0C0B0A] text-[#F3EFE7] flex items-center justify-center font-mono-ibm text-xs text-[#E3A63C]">
        Initializing Sourcify…
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage user={user} />} />
        <Route
          path="/login"
          element={user ? <Navigate to="/app" replace /> : <LoginPage onLoginSuccess={setUser} />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/app" replace /> : <SignupPage onSignupSuccess={setUser} />}
        />
        <Route
          path="/app"
          element={<AppPage user={user} onLogout={() => setUser(null)} />}
        />
        <Route
          path="/settings"
          element={<SettingsPage user={user} onLogout={() => setUser(null)} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
