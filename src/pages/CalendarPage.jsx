import { useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { asDate, dateText } from '../utils';

export default function CalendarPage({ memberships, members, attendance }) {
  const [selected, setSelected] = useState(new Date());
  const expiries = useMemo(() => memberships.filter(item => item.expiryDate), [memberships]);
  const key = selected.toISOString().slice(0, 10);
  const expiring = expiries.filter(item => asDate(item.expiryDate).toISOString().slice(0, 10) === key).map(item => members.find(member => member.uid === item.userId)).filter(Boolean);
  const tileClassName = ({ date, view }) => { if (view !== 'month') return ''; const expiry = expiries.some(item => asDate(item.expiryDate).toDateString() === date.toDateString()); const attended = attendance.some(item => item.checkInTime && asDate(item.checkInTime).toDateString() === date.toDateString()); return `${expiry ? 'expiry-day' : ''} ${attended ? 'attendance-day' : ''}`; };
  return <main><div className="eyebrow">Membership schedule</div><h1 className="page-title">Expiry calendar</h1><div className="calendar-wrap"><Calendar value={selected} onChange={setSelected} tileClassName={tileClassName} /></div><section className="calendar-results"><h2>{selected.toLocaleDateString(undefined, { dateStyle: 'long' })}</h2>{expiring.length ? expiring.map(member => <div className="calendar-member" key={member.uid}><strong>{member.name}</strong><span>Expires {dateText(expiries.find(item => item.userId === member.uid)?.expiryDate)}</span></div>) : <div className="empty">No members expire on this date.</div>}</section></main>;
}
