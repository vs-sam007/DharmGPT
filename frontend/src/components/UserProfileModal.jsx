import React, { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';

const UserProfileModal = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState({ name: '', focus: '' });

  useEffect(() => {
    const saved = localStorage.getItem('dharma_user_profile');
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse profile", e);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('dharma_user_profile', JSON.stringify(profile));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="modal-content glass-panel" style={{
        background: 'var(--color-bg-secondary)', padding: '2rem',
        borderRadius: '16px', border: '1px solid var(--color-border)',
        minWidth: '400px', maxWidth: '90%', position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'none', border: 'none', color: 'var(--color-text-secondary)',
          cursor: 'pointer'
        }}>
          <X size={20} />
        </button>
        
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, color: 'var(--color-text-primary)'}}>
          <User size={24} className="text-mode" /> Your Context
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem'}}>
          Share your situation so the AI can deeply personalize its guidance.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)'}}>Your Name</label>
            <input 
              type="text" 
              value={profile.name}
              onChange={(e) => setProfile({...profile, name: e.target.value})}
              placeholder="e.g., Arjuna"
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)'}}>Current Life Focus or Challenge</label>
            <textarea 
              value={profile.focus}
              onChange={(e) => setProfile({...profile, focus: e.target.value})}
              placeholder="e.g., Student preparing for finals, Founder facing burnout..."
              rows={3}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)', resize: 'none'
              }}
            />
          </div>
          
          <button 
            onClick={handleSave}
            className="btn-primary"
            style={{
              padding: '0.75rem', marginTop: '0.5rem', borderRadius: '8px',
              background: 'var(--mode-accent)', color: 'white', border: 'none',
              cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            Save Context
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
