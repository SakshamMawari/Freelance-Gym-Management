import { useState } from 'react';
import { initials } from '../utils';
import CameraCapture from '../components/CameraCapture';

const initialMembers = [
  { name: 'Arjun Mehta', plan: '3 Month Strength', expiry: 'Oct 18, 2026', status: 'active' },
  { name: 'Neha Sharma', plan: '1 Month Fitness', expiry: 'Oct 03, 2026', status: 'expiring' },
  { name: 'Kabir Singh', plan: '6 Month Performance', expiry: 'Sep 12, 2026', status: 'expired' }
];

function RegisterDemo({ onRegistered }) {
  const [photo, setPhoto] = useState('');
  const [form, setForm] = useState({ name: '', address: '', phone: '', plan: '1 Month', payment: 'UPI', amount: '' });
  const update = event => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = event => {
    event.preventDefault();
    onRegistered({ name: form.name, plan: form.plan, expiry: 'Date to be calculated', status: 'active', phone: form.phone, address: form.address, photo });
    setForm({ name: '', address: '', phone: '', plan: '1 Month', payment: 'UPI', amount: '' });
    setPhoto('');
  };
  return <form className="form-card" onSubmit={submit}><div className="form-section"><h3>Member photo</h3><CameraCapture onPhotoChange={(_, url) => setPhoto(url)} /></div><div className="field"><label>Full name</label><input name="name" required value={form.name} onChange={update} placeholder="Member name" /></div><div className="field"><label>Address</label><textarea name="address" required value={form.address} onChange={update} placeholder="Home address" /></div><div className="field"><label>Phone number</label><input name="phone" required value={form.phone} onChange={update} placeholder="Phone number" /></div><div className="form-section"><div className="field-row"><div className="field"><label>Plan</label><select name="plan" value={form.plan} onChange={update}><option>1 Month</option><option>3 Months</option><option>6 Months</option><option>1 Year</option></select></div><div className="field"><label>Amount paid</label><input name="amount" type="number" min="0" value={form.amount} onChange={update} placeholder="Amount" /></div></div><div className="field"><label>Payment method</label><select name="payment" value={form.payment} onChange={update}><option>UPI</option><option>Cash</option><option>Card</option><option>Pending</option></select></div></div><button className="primary-btn">Register member</button></form>;
}

export default function GuestPreview() {
  const [page, setPage] = useState('members');
  const [members, setMembers] = useState(initialMembers);
  const [filter, setFilter] = useState('all');
  const visibleMembers = filter === 'all' ? members : members.filter(member => member.status === filter);
  return <div className="roxy-app"><div className="app-shell"><header className="topbar"><div><div className="brand">Roxy <span>GYM</span></div><div className="brand-sub">Member management</div></div><button className="signout-btn" onClick={() => setPage('members')}>Member overview</button></header><nav className="dashboard-nav guest-nav"><button className={`tab ${page === 'members' ? 'active' : ''}`} onClick={() => setPage('members')}>Members</button><button className={`tab ${page === 'performance' ? 'active' : ''}`} onClick={() => setPage('performance')}>Gym performance</button><button className={`tab ${page === 'register' ? 'active' : ''}`} onClick={() => setPage('register')}>Register</button></nav><main>{page === 'members' && <><div className="eyebrow">Today at Roxy</div><h1 className="page-title">Member overview</h1><section className="stats"><div className="stat"><div className="stat-value">{members.length}</div><div className="stat-label">Total members</div></div><div className="stat orange"><div className="stat-value">4</div><div className="stat-label">Expiring soon</div></div><div className="stat red"><div className="stat-value">2</div><div className="stat-label">Expired</div></div></section><div className="filter-tabs"><button className="tab active">All</button><button className="tab">Live</button><button className="tab">Expiring soon</button><button className="tab">Expired</button></div><div className="member-grid">{members.map(member => <article className="member-card member-card-grid" key={`${member.name}-${member.phone || ''}`}><div className="member-card-head">{member.photo ? <img className="avatar member-photo" src={member.photo} alt={member.name} /> : <div className="avatar member-photo">{initials(member.name)}</div>}<div className="member-copy"><h2>{member.name}</h2><p>{member.plan}</p></div><span className={`status-badge ${member.status}`}><i />{member.status === 'active' ? 'Active' : member.status === 'expiring' ? 'Expiring soon' : 'Expired'}</span></div><div className="member-card-details"><div><small>Expiry</small><strong>{member.expiry}</strong></div><div><small>Phone</small><strong>{member.phone || 'Preview'}</strong></div></div></article>)}</div></>}{page === 'performance' && <><div className="eyebrow">Gym performance</div><h1 className="page-title">Performance overview</h1><div className="metric-grid"><div className="metric-card"><small>Active members</small><strong>22</strong></div><div className="metric-card"><small>Check-ins today</small><strong>18</strong></div><div className="metric-card"><small>Payments this month</small><strong>₹48,500</strong></div><div className="metric-card"><small>Total visits</small><strong>184</strong></div></div></>}{page === 'register' && <><div className="eyebrow">New member</div><h1 className="page-title">Register member</h1><RegisterDemo onRegistered={member => { setMembers([...members, member]); setPage('members'); }} /></>}</main></div></div>;
}
