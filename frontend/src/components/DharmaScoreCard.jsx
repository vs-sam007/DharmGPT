import React from 'react';
import { Gauge } from 'lucide-react';

const DharmaScoreCard = ({ score, label }) => {
  const displayScore = Math.max(2, Math.min(9, score || 6));
  const displayLabel = label || 'Alignment with ancient ethics';

  return (
    <div className="glass-panel-deep animate-fade-in-left" style={{
      marginTop: '1.5rem',
      padding: '1.5rem',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.5rem',
      background: 'rgba(0, 0, 0, 0.3)',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          background: 'var(--mode-accent-soft)',
          padding: '8px',
          borderRadius: '50%',
          color: 'var(--mode-accent)'
        }}>
          <Gauge size={20} />
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff', letterSpacing: '0.5px' }}>
            Dharma Score
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            {displayLabel}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div className="font-serif text-mode" style={{ fontSize: '1.75rem', fontWeight: '600' }}>
          {displayScore}<span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)' }}>/9</span>
        </div>
      </div>
    </div>
  );
};

export default DharmaScoreCard;
