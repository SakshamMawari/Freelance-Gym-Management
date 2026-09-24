import { Timestamp } from 'firebase/firestore';

export const plans = { '1 Month': 30, '3 Months': 90, '6 Months': 180, '1 Year': 365 };
export const today = () => new Date().toISOString().slice(0, 10);
export const asDate = value => value?.toDate ? value.toDate() : new Date(value);
export const dateText = value => value ? asDate(value).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Not set';
export const dateInput = value => value ? asDate(value).toISOString().slice(0, 10) : today();
export const statusFor = expiryDate => {
  const days = Math.ceil((asDate(expiryDate) - new Date()) / 86400000);
  return days < 0 ? 'expired' : days <= 7 ? 'expiring' : 'active';
};
export const statusLabel = expiryDate => {
  const status = statusFor(expiryDate);
  if (status === 'expired') return 'Expired';
  if (status === 'expiring') return `Expires in ${Math.max(0, Math.ceil((asDate(expiryDate) - new Date()) / 86400000))} days`;
  return 'Active';
};
export const toTimestamp = value => Timestamp.fromDate(new Date(`${value}T00:00:00`));
export const initials = name => String(name || '?').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
export const friendlyError = error => error?.message?.replace('Firebase: ', '') || 'Something went wrong.';
export const planDuration = plan => Number(plan?.durationDays ?? plan?.duration ?? 0);
