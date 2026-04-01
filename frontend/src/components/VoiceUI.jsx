import React, { useState } from 'react';
import { Send, PhoneCall } from 'lucide-react';

/**
 * VoiceUI — Bottom-bar multi-action input.
 *
 * Props:
 *   onSend         — (text: string) => void
 *   isSageThinking — boolean
 *   isSageSpeaking — boolean
 *   onLiveTalk     — () => void  (navigates to the dedicated VoicePage)
 */
const VoiceUI = ({ onSend, isSageThinking, isSageSpeaking, onLiveTalk, isLiveMode, placeholder }) => {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (inputText.trim() && !isSageThinking && !isSageSpeaking) {
      onSend(inputText);
      setInputText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="voice-ui-container" style={{
      position: 'absolute',
      bottom: '1.5rem',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 3rem)',
      maxWidth: '850px',
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem'
    }}>

      {/* State Overlay (Thinking/Speaking) */}
      {(isSageThinking || isSageSpeaking) && (
        <div className="animate-fade-in" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 24px',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(20px)',
          borderRadius: '50px',
          border: '1px solid var(--mode-accent-soft)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
        }}>
          {isSageSpeaking ? (
            <>
              <div className="speaking-waveform">
                {[1,2,3,4,5].map(i => <div key={i} className="speaking-bar" style={{ animationDelay: `${i*0.1}s` }} />)}
              </div>
              <span style={{ color: 'var(--mode-accent)', fontWeight: '700', fontSize: '0.85rem' }}>Digital Sage is speaking...</span>
            </>
          ) : (
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Seeking guidance from the Gita...</span>
          )}
        </div>
      )}

      {/* Main Input Bar */}
      <div className="glass-panel" style={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: '40px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 80px rgba(0,0,0,0.6)'
      }}>

        {/* Live Talk Button — navigates to VoicePage */}
        <button
          onClick={onLiveTalk}
          disabled={isSageThinking}
          style={{
            background: isLiveMode ? '#ff4d4d' : 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            color: isLiveMode ? '#fff' : 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontWeight: '700',
            fontSize: '0.85rem',
            boxShadow: isLiveMode ? '0 10px 30px rgba(255, 77, 77, 0.3)' : 'none'
          }}
          onMouseOver={e => { if (!isLiveMode) { e.currentTarget.style.background = 'var(--mode-accent)'; e.currentTarget.style.color = '#000'; } }}
          onMouseOut={e => { if (!isLiveMode) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; } }}
        >
          <PhoneCall size={18} />
          <span className="hidden-mobile">{isLiveMode ? 'End Talk' : 'Live Talk'}</span>
        </button>

        {/* Text Input */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isSageThinking}
            placeholder={placeholder || "Share your burden..."}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px',
              padding: '14px 24px',
              color: '#fff',
              fontSize: '1rem',
              outline: 'none',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--mode-accent)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isSageThinking}
          style={{
            background: inputText.trim() && !isSageThinking ? 'var(--mode-accent)' : 'rgba(0,0,0,0.2)',
            color: inputText.trim() && !isSageThinking ? '#000' : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          <Send size={22} />
        </button>
      </div>
    </div>
  );
};

export default VoiceUI;
