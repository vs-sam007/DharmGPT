import React from 'react';
import { Brain, User, ScrollText, Gauge, ChevronRight, Quote } from 'lucide-react';

const InsightPanel = ({ isOpen, insight }) => {
  if (!insight) return null;

  const score = insight.dharma_score?.score ?? insight.score ?? 6;
  const label = insight.dharma_score?.label || 'Alignment with ancient ethics';
  const verse = insight.ancient_parallel?.verse || insight.gitaContext || '';
  const citation = insight.ancient_parallel?.citation || '';

  return (
    <div className={`insight-panel-container ${isOpen ? 'open' : ''}`}>
      <div style={{ width: '340px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2.5rem' }}>
          <div style={{ padding: '8px', background: 'var(--mode-accent-soft)', borderRadius: '12px', color: 'var(--mode-accent)' }}>
            <Brain size={24} />
          </div>
          <h3 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '1.4rem', fontWeight: '600', letterSpacing: '-0.02em' }}>
            Sage Analysis
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Responding Persona */}
          <div className="animate-fade-in-right" style={{ animationDelay: '0.1s' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1.5px', fontWeight: '600' }}>
              Responding Sage
            </div>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--mode-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                <User size={20} />
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '600' }}>{insight.character}</div>
                <div style={{ color: 'var(--mode-accent)', fontSize: '0.8rem' }}>Active Persona</div>
              </div>
            </div>
          </div>

          {/* Ancient Parallel Summary */}
          <div className="animate-fade-in-right" style={{ animationDelay: '0.2s' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1.5px', fontWeight: '600' }}>
              Ancient Parallel
            </div>
            <div style={{
              background: 'var(--mode-accent-soft)',
              padding: '14px 16px',
              borderRadius: '14px',
              borderLeft: '3px solid var(--mode-accent)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Quote size={14} style={{ color: 'var(--mode-accent)', marginTop: '3px', flexShrink: 0 }} />
                <div className="font-serif" style={{ fontSize: '0.95rem', color: '#fff', fontStyle: 'italic', lineHeight: '1.6' }}>
                  "{verse.length > 100 ? verse.substring(0, 100) + '…' : verse}"
                </div>
              </div>
              {citation && (
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginLeft: '22px' }}>
                  — {citation}
                </div>
              )}
            </div>
          </div>

          {/* Philosophy Concept */}
          <div className="animate-fade-in-right" style={{ animationDelay: '0.3s' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1.5px', fontWeight: '600' }}>
              Philosophy
            </div>
            <div style={{ color: 'var(--mode-accent)', fontSize: '1rem', fontWeight: '500', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.6' }}>
              <ScrollText size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>{insight.philosophy || insight.concept || 'Dharma'}</span>
            </div>
          </div>

          {/* Dharma Score */}
          <div className="animate-fade-in-right" style={{ animationDelay: '0.4s', marginTop: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--mode-accent-soft) 0%, rgba(0,0,0,0.2) 100%)',
              padding: '2rem',
              borderRadius: '24px',
              border: '1px solid var(--mode-accent-soft)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div className="shimmer-bg" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.1 }}></div>
              
              <div style={{ fontSize: '0.75rem', color: 'var(--mode-accent)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '2px', fontWeight: '700' }}>
                {label}
              </div>
              
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <span className="font-serif text-mode" style={{ fontSize: '4rem', fontWeight: '600' }}>{score}</span>
                <span style={{ fontSize: '1.5rem', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>/9</span>
              </div>

              <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', marginTop: '1.5rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(score / 9) * 100}%`, background: 'var(--mode-accent)', transition: 'width 1.5s ease' }}></div>
              </div>
            </div>
          </div>

          <button style={{
            marginTop: '1rem',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--color-text-primary)',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--mode-accent)'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          >
            Explore Detailed Logic <ChevronRight size={16} />
          </button>

        </div>
      </div>
    </div>
  );
};

export default InsightPanel;
