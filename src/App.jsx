import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigured } from './lib/supabaseClient';
import { friendlyError } from './utils';
import AppShell from './components/AppShell';
import GuestPreview from './pages/GuestPreview';
import LoadingPage from './pages/LoadingPage';
import ErrorPage from './pages/ErrorPage';

function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate();
  const isSignup = mode === 'signup';
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isSignup) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              name: form.name.trim(),
              phone: form.phone.trim()
            }
          }
        });
        if (signUpErr) throw signUpErr;

        if (data?.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              name: form.name.trim(),
              phone: form.phone.trim(),
              role: 'member'
            });
          } catch (pe) {
            console.warn('Profile creation notice:', pe);
          }
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password
        });
        if (signInErr) throw signInErr;
      }
      navigate('/');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!form.email) return setError('Enter your email first.');
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(form.email.trim());
      if (resetErr) throw resetErr;
      setError('Password reset link sent to your inbox.');
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          Roxy <span>GYM</span>
        </div>
        <div className="brand-sub">Member management</div>
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p>
          {isSignup
            ? 'Create a member account to view your membership and check in.'
            : 'Sign in to manage your gym members, payments, and plans.'}
        </p>
        {!supabaseConfigured && (
          <div className="notice">Add your Supabase values to `.env.local` before signing in.</div>
        )}
        <form className="auth-form" onSubmit={submit}>
          {isSignup && (
            <>
              <div className="field">
                <label>Full name</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Phone number</label>
                <input
                  required
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </>
          )}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              minLength="6"
              required
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="primary-btn" disabled={busy}>
            {busy ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <div className="auth-links">
          <button
            type="button"
            className="text-btn"
            onClick={() => navigate(isSignup ? '/login' : '/signup')}
          >
            {isSignup ? 'I already have an account' : 'Create an account'}
          </button>
          {!isSignup && (
            <button type="button" className="text-btn" onClick={resetPassword}>
              Forgot password?
            </button>
          )}
        </div>
        <button type="button" className="guest-btn" onClick={() => navigate('/guest')}>
          Continue as guest preview
        </button>
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setUser(null);
      return undefined;
    }

    const syncProfile = async currentUser => {
      if (!currentUser) {
        setProfile(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (data) {
          setProfile({
            id: data.id,
            uid: data.id,
            email: currentUser.email,
            name: data.name,
            phone: data.phone,
            address: data.address,
            role: data.role || 'member'
          });
        } else {
          // Default profile for gym owner or administrator
          setProfile({
            id: currentUser.id,
            uid: currentUser.id,
            email: currentUser.email,
            name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Gym Owner',
            role: currentUser.user_metadata?.role || 'admin'
          });
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setProfile({
          id: currentUser.id,
          uid: currentUser.id,
          email: currentUser.email,
          name: currentUser.email?.split('@')[0] || 'User',
          role: 'member'
        });
      }
    };

    // 1. Initial session check
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        syncProfile(currentUser);
      })
      .catch(() => {
        setUser(null);
      });

    // 2. Auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      syncProfile(currentUser);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (user === undefined) {
    return <LoadingPage message="Loading Roxy GYM..." subtext="Checking account session..." />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <AuthPage mode="login" />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/" replace /> : <AuthPage mode="signup" />}
      />
      <Route path="/guest" element={<GuestPreview />} />
      <Route
        path="/*"
        element={
          user ? (
            <AppShell user={user} profile={profile} />
          ) : (
            <GuestPreview />
          )
        }
      />
    </Routes>
  );
}
