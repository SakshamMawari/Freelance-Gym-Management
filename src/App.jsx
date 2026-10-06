import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { supabase, supabaseConfigured } from './lib/supabaseClient';
import AppShell from './components/AppShell';
import OwnerLoginPage from './pages/OwnerLoginPage';
import LoadingPage from './pages/LoadingPage';

export default function App() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setUser(null);
      return undefined;
    }

    const syncOwnerProfile = async currentUser => {
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
            name: data.name || currentUser.user_metadata?.name || 'Gym Owner',
            phone: data.phone || '',
            address: data.address || '',
            role: 'admin',
            photoURL: data.photo_url || ''
          });
        } else {
          // Provision initial owner profile
          const ownerName = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Gym Owner';
          try {
            await supabase.from('profiles').upsert({
              id: currentUser.id,
              name: ownerName,
              role: 'admin'
            });
          } catch (pe) {
            console.warn('Owner profile upsert notice:', pe);
          }

          setProfile({
            id: currentUser.id,
            uid: currentUser.id,
            email: currentUser.email,
            name: ownerName,
            role: 'admin',
            photoURL: ''
          });
        }
      } catch (err) {
        console.error('Error fetching owner profile:', err);
        setProfile({
          id: currentUser.id,
          uid: currentUser.id,
          email: currentUser.email,
          name: currentUser.email?.split('@')[0] || 'Gym Owner',
          role: 'admin',
          photoURL: ''
        });
      }
    };

    // 1. Initial session check
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          syncOwnerProfile(currentUser);
        }
      })
      .catch(() => {
        setUser(null);
      });

    // 2. Auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        syncOwnerProfile(currentUser);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (user === undefined) {
    return <LoadingPage message="Loading Roxy GYM..." subtext="Verifying owner session..." />;
  }

  // Only the Gym Owner is authenticated to access the app
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<OwnerLoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/members" replace />} />
      <Route path="/signup" element={<Navigate to="/members" replace />} />
      <Route path="/guest" element={<Navigate to="/members" replace />} />
      <Route
        path="/*"
        element={<AppShell user={user} profile={profile} />}
      />
    </Routes>
  );
}
