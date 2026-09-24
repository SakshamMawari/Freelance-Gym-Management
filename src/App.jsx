import { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, firebaseConfigured, functions } from './firebase';
import { useAttendance, useMembers, useMemberships, usePayments } from './hooks';
import { asDate, dateInput, dateText, friendlyError, initials, plans, statusFor, statusLabel, today, toTimestamp } from './utils';

function AuthPage({ mode }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isSignup = mode === 'signup';
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const credential = isSignup ? await createUserWithEmailAndPassword(auth, form.email, form.password) : await signInWithEmailAndPassword(auth, form.email, form.password);
      if (isSignup) await setDoc(doc(db, 'users', credential.user.uid), { uid: credential.user.uid, name: form.name.trim(), phone: form.phone.trim(), role: 'member', joinDate: toTimestamp(today()) });
      navigate('/');
    } catch (err) { setError(friendlyError(err)); } finally { setBusy(false); }
  };
  const resetPassword = async () => { if (!form.email) return setError('Enter your email first.'); try { await sendPasswordResetEmail(auth, form.email); setError('Password reset email sent.'); } catch (err) { setError(friendlyError(err)); } };
  return <main className="auth-page"><section className="auth-card"><div className="brand">Roxy <span>GYM</span></div><div className="brand-sub">Member management</div><h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1><p>{isSignup ? 'Create a member account to view your membership and check in.' : 'Sign in to manage your membership.'}</p>{!firebaseConfigured && <div className="notice">Add your Firebase values to `.env.local` before signing in.</div>}<form className="auth-form" onSubmit={submit}>{isSignup && <><div className="field"><label htmlFor="name">Full name</label><input id="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="field"><label htmlFor="phone">Phone number</label><input id="phone" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></>}<div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div><div className="field"><label htmlFor="password">Password</label><input id="password" type="password" minLength="6" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>{error && <div className="error-text">{error}</div>}<button className="primary-btn" disabled={busy}>{busy ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}</button></form><div className="auth-links"><button className="text-btn" onClick={() => navigate(isSignup ? '/login' : '/signup')}>{isSignup ? 'I already have an account' : 'Create an account'}</button>{!isSignup && <button className="text-btn" onClick={resetPassword}>Forgot password?</button>}</div></section></main>;
}

function Layout({ user, profile, children }) {
  const navigate = useNavigate();
  return <div className="roxy-app"><div className="app-shell"><header className="topbar"><div><div className="brand">Roxy <span>GYM</span></div><div className="brand-sub">Member management</div></div><div className="topbar-actions"><span className="brand-sub">{profile?.name || user.email}</span><button className="signout-btn" onClick={() => signOut(auth)}>Sign out</button></div></header><div className="dashboard-nav"><NavLink className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} to="/">Dashboard</NavLink>{profile?.role === 'admin' && <NavLink className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} to="/members">Members</NavLink>}</div>{children}</div></div>;
}

function StatusBadge({ expiryDate }) { return <span className={`status-badge ${statusFor(expiryDate)}`}><i />{statusLabel(expiryDate)}</span>; }

function MemberDashboard({ profile, memberships, payments, attendance }) {
  const navigate = useNavigate();
  const membership = memberships.find(item => item.userId === profile.uid);
  const ownPayments = payments.filter(item => item.userId === profile.uid);
  const ownAttendance = attendance.filter(item => item.userId === profile.uid);
  const checkIn = async () => { await addDoc(collection(db, 'attendance'), { userId: profile.uid, checkInTime: serverTimestamp() }); };
  if (!membership) return <main><div className="eyebrow">Your membership</div><h1 className="page-title">Welcome to Roxy GYM</h1><div className="empty">Your membership has not been set up yet. Ask the gym team to add your plan.</div></main>;
  return <main><div className="eyebrow">Member dashboard</div><h1 className="page-title">Hi, {profile.name.split(' ')[0]}</h1><div className="profile-summary"><div className="avatar">{initials(profile.name)}</div><div><h2>{profile.name}</h2><StatusBadge expiryDate={membership.expiryDate} /></div></div><section className="stats"><div className="stat"><div className="stat-value">{membership.plan}</div><div className="stat-label">Current plan</div></div><div className="stat"><div className="stat-value">{dateText(membership.expiryDate)}</div><div className="stat-label">Expiry date</div></div><div className="stat"><div className="stat-value">{ownAttendance.length}</div><div className="stat-label">Check-ins</div></div></section><div className="form-actions"><button className="primary-btn" onClick={checkIn}>Check in today</button>{statusFor(membership.expiryDate) !== 'active' && <button className="outline-btn" onClick={() => navigate('/payments')}>View payments</button>}</div><h2 className="section-title">Payment history</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th></tr></thead><tbody>{ownPayments.map(payment => <tr key={payment.id}><td>{dateText(payment.date)}</td><td>₹{payment.amount}</td><td>{payment.method}</td></tr>)}</tbody></table></div></main>;
}

function MemberForm({ existing, onDone }) {
  const [form, setForm] = useState({ name: existing?.name || '', phone: existing?.phone || '', email: '', password: '', plan: existing?.plan || '1 Month', startDate: dateInput(existing?.startDate), amount: '', method: 'UPI' });
  const [error, setError] = useState('');
  const save = async event => { event.preventDefault(); setError(''); try { if (!existing) { await httpsCallable(functions, 'createMember')({ ...form, name: form.name.trim(), phone: form.phone.trim() }); } else { const userRef = doc(db, 'users', existing.uid); await updateDoc(userRef, { name: form.name.trim(), phone: form.phone.trim() }); const expiry = new Date(`${form.startDate}T00:00:00`); expiry.setDate(expiry.getDate() + plans[form.plan]); await setDoc(doc(db, 'memberships', existing.uid), { userId: existing.uid, plan: form.plan, startDate: toTimestamp(form.startDate), expiryDate: toTimestamp(expiry.toISOString().slice(0, 10)), status: 'active' }); if (form.amount) await addDoc(collection(db, 'payments'), { userId: existing.uid, amount: Number(form.amount), date: serverTimestamp(), method: form.method }); } onDone(); } catch (err) { setError(friendlyError(err)); } };
  return <form className="form-card" onSubmit={save}>{!existing && <><div className="field"><label>Email</label><input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div><div className="field"><label>Temporary password</label><input type="password" minLength="6" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div></>}<div className="field"><label>Name</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="field"><label>Phone</label><input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div><div className="form-section"><div className="field-row"><div className="field"><label>Plan</label><select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>{Object.keys(plans).map(plan => <option key={plan}>{plan}</option>)}</select></div><div className="field"><label>Start date</label><input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div></div><div className="field-row"><div className="field"><label>Payment amount</label><input type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div><div className="field"><label>Method</label><select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}><option>UPI</option><option>Cash</option><option>Card</option></select></div></div></div>{error && <div className="error-text">{error}</div>}<button className="primary-btn">{existing ? 'Save member' : 'Create member'}</button></form>;
}

function AdminDashboard({ members, memberships, payments, attendance }) {
  const [search, setSearch] = useState(''); const [editing, setEditing] = useState(null); const [showForm, setShowForm] = useState(false);
  const membershipFor = uid => memberships.find(item => item.userId === uid);
  const visible = members.filter(member => member.name?.toLowerCase().includes(search.toLowerCase()) || member.phone?.includes(search));
  const month = new Date().getMonth(); const year = new Date().getFullYear(); const monthly = payments.filter(payment => { const date = payment.date && asDate(payment.date); return date && date.getMonth() === month && date.getFullYear() === year; });
  const deactivate = async member => { const membership = membershipFor(member.uid); if (membership) await updateDoc(doc(db, 'memberships', membership.id), { status: 'expired' }); };
  return <main><div className="eyebrow">Today at Roxy</div><h1 className="page-title">Member overview</h1><section className="stats"><div className="stat"><div className="stat-value">{members.length}</div><div className="stat-label">Total members</div></div><div className="stat orange"><div className="stat-value">{members.filter(m => membershipFor(m.uid) && statusFor(membershipFor(m.uid).expiryDate) === 'expiring').length}</div><div className="stat-label">Expiring soon</div></div><div className="stat red"><div className="stat-value">{members.filter(m => membershipFor(m.uid) && statusFor(membershipFor(m.uid).expiryDate) === 'expired').length}</div><div className="stat-label">Expired</div></div></section><div className="metric-grid"><div className="metric-card"><small>Payments this month</small><strong>₹{monthly.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)}</strong></div><div className="metric-card"><small>Check-ins today</small><strong>{attendance.filter(item => item.checkInTime && asDate(item.checkInTime).toDateString() === new Date().toDateString()).length}</strong></div></div><div className="toolbar"><input type="search" placeholder="Search name or phone" value={search} onChange={e => setSearch(e.target.value)} /><button className="primary-btn" onClick={() => { setEditing(null); setShowForm(true); }}>Add member</button></div>{showForm && <section className="form-card"><h2>{editing ? 'Edit member' : 'Add member'}</h2><MemberForm existing={editing} onDone={() => { setShowForm(false); setEditing(null); }} /></section>}<div className="table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Plan</th><th>Status</th><th>Last check-in</th><th>Actions</th></tr></thead><tbody>{visible.map(member => { const membership = membershipFor(member.uid); const last = attendance.find(item => item.userId === member.uid); return <tr key={member.id}><td><strong>{member.name}</strong><br /><small>{member.phone}</small></td><td>{membership?.plan || 'Not set'}</td><td>{membership ? <StatusBadge expiryDate={membership.expiryDate} /> : 'Not set'}</td><td>{last ? dateText(last.checkInTime) : 'Never'}</td><td><button className="text-btn" onClick={() => { setEditing(member); setShowForm(true); }}>Edit</button><button className="text-btn" onClick={() => deactivate(member)}>Deactivate</button></td></tr>; })}</tbody></table>{!visible.length && <div className="empty">No members found.</div>}</div></main>;
}

function AppShell({ user, profile }) {
  const admin = profile.role === 'admin';
  const membersResult = useMembers(admin, profile.uid); const membershipsResult = useMemberships(admin, profile.uid); const paymentsResult = usePayments(admin, profile.uid); const attendanceResult = useAttendance(admin, profile.uid);
  const data = { members: membersResult.data, memberships: membershipsResult.data, payments: paymentsResult.data, attendance: attendanceResult.data };
  return <Layout user={user} profile={profile}><Routes><Route path="/" element={profile.role === 'admin' ? <AdminDashboard {...data} /> : <MemberDashboard profile={profile} {...data} />} />{profile.role === 'admin' && <Route path="/members" element={<AdminDashboard {...data} />} />}<Route path="*" element={<Navigate to="/" replace />} /></Routes></Layout>;
}

export default function App() {
  const [user, setUser] = useState(undefined); const [profile, setProfile] = useState(null);
  useEffect(() => onAuthStateChanged(auth, async current => { setUser(current); if (current) { const snapshot = await getDoc(doc(db, 'users', current.uid)); setProfile(snapshot.exists() ? snapshot.data() : null); } else setProfile(null); }), []);
  if (user === undefined) return <div className="auth-page">Loading Roxy GYM...</div>;
  if (!user) return <Routes><Route path="/signup" element={<AuthPage mode="signup" />} /><Route path="*" element={<AuthPage mode="login" />} /></Routes>;
  if (!profile) return <div className="auth-page"><div className="auth-card"><h1>Profile unavailable</h1><p>Your account exists, but its Firestore user profile is missing.</p><button className="primary-btn" onClick={() => signOut(auth)}>Sign out</button></div></div>;
  return <AppShell user={user} profile={profile} />;
}
