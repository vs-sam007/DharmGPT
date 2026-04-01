import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  PhoneOff, 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Shield, 
  Zap, 
  Flame, 
  History, 
  Settings, 
  HelpCircle, 
  Sparkles, 
  MicOff, 
  Mic, 
  Keyboard, 
  Activity // for transcript icon
} from 'lucide-react';
import VoiceOrb from './VoiceOrb';
import { useDharmaAudio } from '../lib/useDharmaAudio';

// ─── Persona Themes (Living Nebula Edition) ──────────────────────────────────
const MODES = {
  krishna: {
    name: 'Krishna',
    title: 'Divine Counsel',
    accent: 'var(--color-primary)',
    icon: <Shield size={18} />,
    bg: 'bg-surface-container-lowest',
    nebulaColor: 'rgba(133, 173, 255, 0.12)', // primary
    particleColor: 'var(--color-primary)',
    tagline: 'The Eternal Truth of the Gita',
    statusPrefix: 'Vasudeva is',
  },
  chanakya: {
    name: 'Chanakya',
    title: 'Strategic Mind',
    accent: '#ff4d4d',
    icon: <Zap size={18} />,
    bg: 'bg-surface-container-lowest',
    nebulaColor: 'rgba(255, 77, 77, 0.12)',
    particleColor: '#ff4d4d',
    tagline: 'The Arthashastra Strategy',
    statusPrefix: 'Acharya is',
  },
  laxmibai: {
    name: 'Laxmibai',
    title: 'Warrior Spirit',
    accent: '#ffb74d',
    icon: <Flame size={18} />,
    bg: 'bg-surface-container-lowest',
    nebulaColor: 'rgba(255, 183, 77, 0.12)',
    particleColor: '#ffb74d',
    tagline: 'Courage of the Jhansi Queen',
    statusPrefix: 'The Maharani is',
  },
};

// ─── Component: AtmosphericNebula ───────────────────────────────────────────
const AtmosphericNebula = ({ color }) => (
  <div className="absolute inset-0 z-0 pointer-events-none">
    <div 
      className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full orb-glow" 
      style={{ background: color }}
    />
    <div 
      className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full orb-glow" 
      style={{ background: color, animationDelay: '-5s' }}
    />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(19,19,19,0)_0%,rgba(14,14,14,1)_85%)]" />
  </div>
);

// ─── Component: SacredParticles ─────────────────────────────────────────────
const SacredParticles = ({ color }) => {
  const count = 30;
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * -20,
    }));
  }, [color]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: color,
            boxShadow: `0 0 10px ${color}`,
            animation: `float ${p.duration}s infinite linear`,
            animationDelay: `${p.delay}s`,
            opacity: 0.4
          }}
        />
      ))}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const VoicePage = ({ activeMode, personaIdx, onBack }) => {
  const resolvedPersona = activeMode || personaIdx || 'krishna';
  const mode = MODES[resolvedPersona] || MODES.krishna;
  const audio = useDharmaAudio({
    persona: resolvedPersona,
    onTranscriptionReceived: (text, role) => {
        setTranscript(prev => {
            if (prev.length === 0) return [{ role, text }];
            const last = prev[prev.length - 1];
            
            // If the same role is speaking, manage the string intelligently
            if (last.role === role) {
                if (role === 'user') {
                    // User text comes from WebSpeechAPI which emits the FULL growing sentence.
                    // Replace the string rather than appending it.
                    // If the new text is significantly shorter, it means the VAD reset the engine for a new sentence!
                    if (text.length < last.text.length * 0.5 && text.length > 0) {
                        return [...prev, { role, text }];
                    }
                    const updatedLast = { ...last, text };
                    return [...prev.slice(0, -1), updatedLast];
                } else {
                    // AI text comes from WebSocket as distinct word chunks. Append them.
                    if (last.text.endsWith(text)) return prev;
                    const updatedLast = { ...last, text: last.text + " " + text };
                    return [...prev.slice(0, -1), updatedLast];
                }
            }
            
            return [...prev, { role, text }];
        });
    },
    onVerseReceived: (ref, verse) => {
        setTranscript(prev => [...prev, { role: 'ai', text: `[${ref}] ${verse}` }]);
    }
  });
  const scrollRef = useRef(null);

  // Cleanup: stop audio session when the component unmounts
  useEffect(() => {
    return () => {
      audio.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real live transcript managed via useDharmaAudio callbacks
  const [transcript, setTranscript] = useState([
    { role: 'ai', text: "Mere priya dost... main yahan hoon. Batao, aaj kya chal raha hai tumhare mann mein?" },
  ]);

  const [isMuted, setIsMuted] = useState(false);

  const statusInfo = useMemo(() => {
    switch (audio.state) {
      case 'connecting': return { text: 'INITIALIZING', sub: 'ALIGNING DHARMA ENGINE' };
      case 'error':      return { text: 'CONNECTION FAILED', sub: audio.error || 'PLEASE RETRY' };
      case 'listening':  return { text: `${mode.statusPrefix.toUpperCase()} LISTENING`, sub: 'SHARE YOUR WISDOM' };
      case 'speaking':   return { text: `${mode.statusPrefix.toUpperCase()} SPEAKING`, sub: 'HEED THE ANCIENT WORDS' };
      case 'thinking':
      case 'processing': return { text: 'CONTEMPLATING', sub: 'BROWSING SACRED TEXTS' };
      case 'recording':  return { text: 'HEARING YOU', sub: 'SPEAK YOUR MIND' };
      default:           return { text: 'PRESENCE ESTABLISHED', sub: 'READY FOR COUNSEL' };
    }
  }, [audio.state, mode.statusPrefix]);

  const personaColor = mode.accent;

  return (
    <div className={`relative w-full h-screen flex transition-colors duration-1000 overflow-hidden ${mode.bg}`}>
      
      {/* ── Atmospheric Layers ────────────────────────────────────────────── */}
      <AtmosphericNebula color={mode.nebulaColor} />
      <SacredParticles color={mode.particleColor} />
      <div className="pointer-events-none fixed inset-0 z-[5] opacity-20 mix-blend-screen overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=2000')] bg-cover opacity-10 filter grayscale contrast-150" />
      </div>

      {/* ── TopAppBar ──────────────────────────────────────────────────────── */}
      <header className="fixed top-0 w-full flex justify-between items-center px-16 py-8 z-50 bg-transparent">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-black bg-gradient-to-r from-[#85adff] to-[#c180ff] bg-clip-text text-transparent font-display tracking-tight">DharmaGPT</span>
        </div>
      </header>

      {/* ── SideNavBar (Asymmetric Left) ──────────────────────────────────── */}


      {/* ── Main Canvas (Center) ──────────────────────────────────────────── */}
      <main className="relative flex-grow h-full flex flex-col items-center justify-center z-10 px-24">
        
        {/* Central Physical Orb ────────────────────────────────────────── */}
        <div className="relative group mb-20">
          {/* Nebula Backglow */}
          <div 
            className="absolute inset-0 blur-3xl opacity-30 scale-150 transition-opacity duration-1000" 
            style={{ background: `radial-gradient(circle, ${mode.accent} 0%, transparent 70%)` }}
          />
          
          <div className="relative w-80 h-80 rounded-full orb-container flex items-center justify-center overflow-visible z-20">
            <div className="absolute inset-0 bg-transparent pointer-events-none" />
            
            <VoiceOrb
              state={audio.state}
              freqData={audio.freqData}
              personaColor={personaColor}
              size={340}
              onClick={audio.state === 'speaking' ? audio.interrupt : undefined}
            />
          </div>
        </div>

        {/* Status Text ────────────────────────────────────────────────── */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-2 animate-fade-up">
            <span className="text-[12px] font-black tracking-[8px] uppercase text-primary opacity-40">Dharma Session</span>
            <div 
              className="px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest rounded-full" 
              style={{ background: `${mode.accent}15`, color: mode.accent, border: `1px solid ${mode.accent}30` }}
            >
              {mode.name}
            </div>
          </div>
          <h1 className="text-headline-lg text-white/90 uppercase tracking-tight" style={{ fontSize: '2.5rem' }}>
            {statusInfo.text}
          </h1>
          <p className="text-body-lg text-white/40 max-w-lg mx-auto">
            {statusInfo.sub}
          </p>

          {(audio.state === 'idle' || audio.state === 'error' || audio.state === 'connecting') && (
            <div className="mt-8 animate-fade-up" style={{ animationDelay: '0.2s', marginTop: '2rem' }}>
                <button
                    onClick={() => {
                      if (audio.state === 'connecting') {
                        audio.stop();
                      } else {
                        audio.start();
                      }
                    }}
                    className="px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm outline-none transition-all duration-300 pointer-events-auto"
                    style={{
                        background: audio.state === 'connecting' ? '#555' : mode.accent,
                        color: audio.state === 'connecting' ? '#fff' : '#000',
                        boxShadow: `0 0 40px ${mode.accent}40`,
                        border: 'none',
                        cursor: 'pointer'
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    {audio.state === 'error' ? '⟳ Retry Voice Connection' : 
                     audio.state === 'connecting' ? '✕ Cancel' :
                     'Begin Voice Counsel'}
                </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Transcript Overlay (Asymmetric Right) ────────────────────────── */}
      <div className="fixed right-12 top-1/2 -translate-y-1/2 w-80 space-y-6 z-20 hidden 2xl:block">
        <div className="p-8 rounded-[2rem] bg-surface-container-low/40 backdrop-blur-3xl border border-white/5 shadow-2xl animate-fade-in-right">
          <div className="flex items-center gap-3 mb-6 text-[10px] font-black text-primary tracking-[4px] uppercase">
            <Activity size={16} />
            Live Transcript
          </div>
          <div ref={scrollRef} className="space-y-6 max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar">
            {transcript.map((item, i) => (
              <div key={i} className={`space-y-2 ${i < transcript.length - 1 ? 'opacity-40 scale-[0.98]' : 'animate-fade-up'}`}>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#ababab]">
                  {item.role === 'ai' ? mode.name : 'You'}
                </p>
                <p className="text-sm text-white/80 leading-relaxed font-body">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Bottom Navigation Bar ─────────────────────────────────────────── */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center justify-center gap-12 px-10 py-5 z-[70] min-w-[200px] rounded-[3rem] bg-[#111]/40 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/[0.08] animate-fade-up">
        
        <button 
          onClick={() => {
            const newState = !isMuted;
            setIsMuted(newState);
            if (audio.setMuted) audio.setMuted(newState);
          }}
          className="group flex flex-col items-center gap-1.5 text-[#ababab] p-3 hover:bg-white/5 rounded-full transition-all duration-300"
        >
          <div className="group-active:scale-90 transition-transform">
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </div>
          <span className="text-[8px] font-black uppercase tracking-[2px] opacity-60">Mute</span>
        </button>

        <button 
          onClick={() => {
            audio.stop();
            setTimeout(onBack, 150);
          }}
          className="bg-gradient-to-r from-[#ff716c] to-[#9f0519] text-white rounded-full w-16 h-16 flex items-center justify-center shadow-[0_15px_40px_rgba(255,113,108,0.3)] hover:scale-110 active:scale-95 transition-all duration-300 group"
        >
          <PhoneOff size={32} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
        </button>

      </nav>

    </div>
  );
};

export default VoicePage;
