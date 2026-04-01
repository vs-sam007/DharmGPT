import { useState, useEffect } from 'react';
import { Mic, Keyboard, Sparkle, Brain, Shield, Compass, ChevronRight } from 'lucide-react';

const Home = ({ onStart }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="app-container" style={{ alignItems: 'center', overflowY: 'auto', padding: '4rem 1rem', background: 'transparent' }}>
      {/* High-Quality Background Image */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: 'url(/bg-dharma.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: -3,
          opacity: mounted ? 1 : 0,
          transition: 'opacity 1.5s ease-in-out'
        }}
      />
      {/* A dark gradient overlay to ensure text readability */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at center, transparent 0%, rgba(10, 15, 24, 0.9) 100%)', zIndex: -2 }} />
      
      {/* Subtle Space Dots (Background made transparent to show the image) */}
      <div className="bg-cosmic" style={{ background: 'transparent' }}></div>
      
      {/* Intro Content Wrapper */}
      <div className="animate-fade-in-right" style={{
        width: '100%',
        maxWidth: '1000px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4rem',
        alignItems: 'center',
        padding: '2rem 0'
      }}>
        
        {/* Header Hero */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            background: 'var(--color-surface-low)', 
            padding: '1.25rem', 
            borderRadius: '50%', 
            width: 'fit-content', 
            margin: '0 auto 2rem', 
            boxShadow: '0 0 50px var(--mode-accent-soft)',
            color: 'var(--mode-accent)'
          }}>
            <Sparkle size={48} />
          </div>
          <h1 className="text-display-lg text-mode" style={{ marginBottom: '1rem' }}>
            DharmaGPT
          </h1>
          <p className="text-label-md" style={{ color: 'var(--color-text-secondary)', letterSpacing: '6px' }}>
            The Wisdom Engine
          </p>
        </div>

        {/* The "About" Detailed Section */}
        <div className="glass-panel" style={{
          padding: 'clamp(2rem, 6vw, 5rem)',
          borderRadius: '40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '4rem',
          width: '100%',
        }}>
          <div>
            <h2 className="text-headline-lg" style={{ marginBottom: '1.5rem', color: '#fff' }}>The Vision</h2>
            <p className="text-body-lg" style={{ color: 'var(--color-text-secondary)' }}>
              DharmaGPT is not just a chatbot; it is a <strong>Digital Sage</strong> designed to help the modern seeker navigate the complexities of life using the ancient structured wisdom of the <strong>Bhagavad Gita</strong> and <strong>Mahabharata</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
              <div style={{ padding: '10px', background: 'var(--mode-accent-soft)', borderRadius: '12px', color: 'var(--mode-accent)' }}>
                <Brain size={20} />
              </div>
              <div>
                <h4 style={{ color: '#fff', marginBottom: '4px' }}>Cognitive Clarity</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>Translates ancient metaphors into practical, modern frameworks for mental health and strategy.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
              <div style={{ padding: '10px', background: 'var(--mode-accent-soft)', borderRadius: '12px', color: 'var(--mode-accent)' }}>
                <Shield size={20} />
              </div>
              <div>
                <h4 style={{ color: '#fff', marginBottom: '4px' }}>Ethical Alignment</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>Calculates your "Dharma Score" to help you align your actions with your true purpose.</p>
              </div>
            </div>
          </div>
        </div>




        {/* The Massive Proceed Button */}
        <button 
          onClick={() => onStart()}
          className="btn-primary-fluid"
          style={{
            marginTop: '2rem',
            padding: '1.5rem 4rem',
            fontSize: '1.5rem',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            border: 'none',
          }}
        >
          <span>ENTER THE WISDOM ENGINE</span>
          <ChevronRight size={28} />
        </button>

        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '4px', textTransform: 'uppercase', marginTop: '2rem' }}>
          Inspired by The Bhagavad Gita & Mahabharata
        </div>
      </div>
    </div>
  );
};

export default Home;



