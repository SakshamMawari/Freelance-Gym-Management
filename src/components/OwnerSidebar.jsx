import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function OwnerSidebar({
  adminProfile = null,
  onSignOut = null,
  onSignIn = null,
  isGuest = false,
}) {
  const { theme, isDark, setTheme, toggleTheme, sidebarOpen, closeSidebar } = useTheme();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        closeSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, closeSidebar]);

  // Lock background scroll when open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  if (!sidebarOpen) return null;

  const displayName = isGuest ? 'Gym Owner' : (adminProfile?.name || 'Gym Owner');
  const displaySubtitle = isGuest ? 'Preview Mode' : (adminProfile?.email || 'Owner Account');
  const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : 'O';

  return (
    <div className="sidebar-backdrop" onClick={closeSidebar}>
      <aside
        className="owner-sidebar"
        onClick={(e) => e.stopPropagation()}
        aria-label="Gym Owner Settings"
      >
        {/* Header with Owner Profile */}
        <div className="sidebar-header">
          <div className="sidebar-profile-info">
            <div className="sidebar-avatar-circle">
              {adminProfile?.photoURL ? (
                <img src={adminProfile.photoURL} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                avatarLetter
              )}
            </div>
            <div>
              <div className="sidebar-profile-name">{displayName}</div>
              <div className="sidebar-profile-role">{displaySubtitle}</div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Sidebar Content: Small Toggle UI */}
        <div className="sidebar-scrollable-content">
          <section className="sidebar-section">
            <div className="sidebar-section-title">
              <span>Appearance</span>
            </div>

            {/* Small Toggle Row */}
            <div className="theme-toggle-row">
              <div className="theme-toggle-info">
                <span className="theme-toggle-label">Dark Mode</span>
                <span className="theme-toggle-subtext">
                  {isDark ? 'Full Black theme' : 'White & Black plain theme'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                className={`switch-toggle ${isDark ? 'checked' : ''}`}
                onClick={toggleTheme}
                title={isDark ? 'Switch to White & Black plain' : 'Switch to Full Black'}
                aria-label="Toggle dark mode"
              >
                <span className="switch-handle" />
              </button>
            </div>
          </section>

          {/* Optional Sign Out Button */}
          {onSignOut && (
            <div className="sidebar-footer-card">
              <button
                type="button"
                className="sidebar-signout-btn"
                onClick={() => {
                  closeSidebar();
                  onSignOut();
                }}
              >
                Sign out
              </button>
            </div>
          )}

          {/* Optional Sign In Button for Guests */}
          {isGuest && onSignIn && (
            <div className="sidebar-footer-card">
              <button
                type="button"
                className="primary-btn"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  closeSidebar();
                  onSignIn();
                }}
              >
                Sign In to Live Gym
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
