import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';

export function useCollection(path, constraints = []) {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    const source = query(collection(db, path), ...constraints);
    return onSnapshot(source, snapshot => {
      setData(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
      setError(null);
    }, setError);
  }, [path]);
  return { data, error };
}

export const useMembers = (admin, uid) => useCollection('users', admin ? [where('role', '==', 'member'), orderBy('name')] : [where('uid', '==', uid)]);
export const useMemberships = (admin, uid) => useCollection('memberships', admin ? [] : [where('userId', '==', uid)]);
export const usePayments = (admin, uid) => useCollection('payments', admin ? [orderBy('date', 'desc')] : [where('userId', '==', uid), orderBy('date', 'desc')]);
export const useAttendance = (admin, uid) => useCollection('attendance', admin ? [orderBy('checkInTime', 'desc')] : [where('userId', '==', uid), orderBy('checkInTime', 'desc')]);
export const usePlans = () => useCollection('plans', [orderBy('planName')]);
