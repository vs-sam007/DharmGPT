import { Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import React from 'react';

const KRISHNA_COLOR = '#d4af37';
const CHANAKYA_COLOR = '#c1121f';
const LAXMIBAI_COLOR = '#e65100';

const MessageBubble = ({ message }) => {
  const isUser = message.sender === 'user';
  const charLower = message.character?.toLowerCase() || '';
  const isChanakya = charLower === 'chanakya';
  const isLaxmibai = charLower === 'laxmi bai' || charLower === 'laxmibai';
  
  const uiColor = isLaxmibai ? LAXMIBAI_COLOR : (isChanakya ? CHANAKYA_COLOR : KRISHNA_COLOR);
  const aiName = isLaxmibai ? 'Rani Laxmibai Decrees' : (isChanakya ? 'Chanakya Neeti' : 'Krishna speaks');

  // ─── User Message ───────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="animate-fade-in-right" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <div className="user-bubble" style={{
          color: 'var(--color-text-primary)',
          padding: '1.25rem 1.75rem',
          borderRadius: '24px 24px 4px 24px',
          maxWidth: '75%',
          fontSize: '1.05rem',
          lineHeight: '1.7',
          fontWeight: '500'
        }}>
          {message.text}
        </div>
      </div>
    );
  }

  // ─── System / Error Message ─────────────────────────────────────────────
  if (message.sender === 'system') {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
        <div style={{
          background: 'rgba(220, 38, 38, 0.15)',
          color: '#f87171',
          padding: '0.75rem 1.5rem',
          borderRadius: '16px',
          maxWidth: '85%',
          fontSize: '0.95rem',
          fontWeight: '500',
          textAlign: 'center',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 4px 20px rgba(220, 38, 38, 0.1)'
        }}>
          {message.text}
        </div>
      </div>
    );
  }

  // ─── AI (Krishna) Message — Streaming-aware ─────────────────────────────
  return (
    <div className="animate-fade-in-left msg-bubble-ai" style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div className="glass-panel" style={{
        padding: '1.75rem',
        borderRadius: '24px 24px 24px 4px',
        maxWidth: '92%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        borderLeft: `4px solid ${uiColor}`,
        position: 'relative',
        overflow: 'visible',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        background: 'rgba(15, 23, 42, 0.8)'
      }}>
        {/* Subtle Background Glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: `linear-gradient(135deg, ${uiColor}18 0%, transparent 100%)`,
          zIndex: -1, opacity: 0.5, borderRadius: 'inherit'
        }}></div>

        {/* Sage Header */}
        <div style={{
          fontSize: '0.8rem', color: uiColor,
          textTransform: 'uppercase', letterSpacing: '3px', fontWeight: '800',
          display: 'flex', alignItems: 'center', gap: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          paddingBottom: '1rem'
        }}>
          <Sparkles size={14} className="pulse-glow" style={{ borderRadius: '50%' }} />
          {aiName}
        </div>

        {/* Message Body */}
        <div className="markdown-body font-serif" style={{
          fontSize: '1.1rem',
          color: 'var(--color-text-primary)',
          lineHeight: '1.9',
          letterSpacing: '0.2px',
        }}>
          <ReactMarkdown
            components={{
              blockquote: ({node, ...props}) => (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderLeft: `3px solid ${uiColor}`,
                  padding: '1.25rem 1.5rem',
                  borderRadius: '0 16px 16px 0',
                  margin: '1.5rem 0',
                  fontStyle: 'italic',
                  color: 'rgba(255,255,255,0.85)',
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
                }} {...props} />
              ),
              hr: ({node, ...props}) => (
                <hr style={{
                  border: 'none',
                  height: '1px',
                  background: `linear-gradient(90deg, transparent, ${uiColor}60, transparent)`,
                  margin: '2rem 0',
                }} {...props} />
              ),
              strong: ({node, ...props}) => (
                <strong style={{
                  color: uiColor,
                  fontWeight: '700',
                  textShadow: `0 0 15px ${uiColor}40`,
                  letterSpacing: '0.5px'
                }} {...props} />
              ),
              ul: ({node, ...props}) => (
                <ul style={{ 
                  listStyleType: 'disc', 
                  paddingLeft: '1.5rem', 
                  margin: '1rem 0',
                  color: 'rgba(255,255,255,0.9)'
                }} {...props} />
              ),
              li: ({node, ...props}) => (
                <li style={{ 
                  marginBottom: '0.75rem',
                  paddingLeft: '0.5rem',
                  lineHeight: '1.8'
                }} {...props} />
              ),
              p: ({node, ...props}) => (
                <p style={{ marginBottom: '1.25rem' }} {...props} />
              )
            }}
          >
            {message.text || ""}
          </ReactMarkdown>

          {/* Streaming cursor */}
          {message.isStreaming && (
            <span className="streaming-cursor" style={{
              display: 'inline-block',
              width: '2px',
              height: '1.2em',
              background: uiColor,
              marginLeft: '2px',
              verticalAlign: 'text-bottom',
              animation: 'blink 1s step-end infinite',
            }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
