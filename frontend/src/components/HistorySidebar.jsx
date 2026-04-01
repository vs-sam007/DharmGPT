import React from 'react';
import { Clock, ChevronRight, X, Plus } from 'lucide-react';

const formatTimestamp = (ts) => {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
  
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const HistorySidebar = ({ isOpen, sessions = [], onClose, onSelect, onNewChat }) => {
  return (
    <>
      {/* Overlay (Mobile Only) */}
      {isOpen && (
        <div 
          className="animate-fade-in mobile-only"
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 1000, backdropFilter: 'blur(10px)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <div className={`history-sidebar-container ${isOpen ? 'open' : ''}`}>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '3.5rem', 
          width: '100%',
          padding: '0 0.5rem' // Minor internal breathing room
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h2 className="font-serif text-gold" style={{ 
              fontSize: '2rem', 
              margin: 0, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              fontWeight: '600' 
            }}>
              <Clock size={26} /> Journeys
            </h2>
            <div style={{ 
              fontSize: '0.7rem', 
              color: 'var(--color-text-secondary)', 
              textTransform: 'uppercase', 
              letterSpacing: '3px',
              fontWeight: '500',
              opacity: 0.8
            }}>
              Your Spiritual Record
            </div>
          </div>
          <button 
            onClick={onClose}
            className="sidebar-close-btn"
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              padding: '10px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition-smooth)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* New Journey Button */}
        <button 
          onClick={onNewChat}
          className="animate-fade-in"
          style={{
            width: '100%',
            padding: '16px',
            marginBottom: '2rem',
            background: 'var(--mode-accent)',
            color: '#000',
            border: 'none',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}
        >
          <Plus size={18} /> New Journey
        </button>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem', 
          overflowY: 'auto', 
          padding: '0 0.5rem 2rem 0.5rem', // Added horizontal padding here too
          width: '100%' 
        }}>
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.5, color: 'var(--color-text-secondary)', padding: '2rem 0', fontSize: '0.9rem' }}>
              No past journeys yet.<br/>Your path begins here.
            </div>
          ) : (
            sessions.map((item, index) => (
             /* History Items... */
            <div 
              key={item.id}
              onClick={() => onSelect(item)}
              className="animate-fade-in-left"
              style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '1.25rem',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                animationDelay: `${index * 0.1}s`
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'var(--mode-accent-soft)';
                e.currentTarget.style.transform = 'translateX(5px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '6px', opacity: 0.7 }}>
                  {formatTimestamp(item.timestamp)} • <span style={{ color: 'var(--mode-accent)', textTransform: 'capitalize' }}>{item.mode}</span>
                </div>
                <div style={{ color: 'var(--color-text-primary)', fontWeight: '600', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                  {item.title}
                </div>
              </div>
              <ChevronRight size={20} color="var(--mode-accent)" style={{ opacity: 0.5 }} />
            </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 'auto', padding: '2rem 1rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', opacity: 0.5 }}>
            "Knowledge is your only true companion."
          </p>
        </div>

      </div>
    </>
  );
};

export default HistorySidebar;

