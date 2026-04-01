import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import InsightPanel from './InsightPanel';
import VoiceUI from './VoiceUI';
import VoiceOrb from './VoiceOrb';
import HistorySidebar from './HistorySidebar';
import UserProfileModal from './UserProfileModal';
import { useChatHistory } from '../hooks/useChatHistory';
import { useDharmaAudio } from '../lib/useDharmaAudio';
import { Menu, Sparkles, Server, User } from 'lucide-react';

// ─── Backend URL ──────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000';

const ChatInterface = ({ onStartVoice, activeMode: propMode, onModeChange }) => {
  const [messages, setMessages] = useState([]);
  const [activeMode, setActiveMode] = useState(propMode || 'krishna');
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [latestInsight, setLatestInsight] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const [isStreaming, setIsStreaming] = useState(false);

  const { sessions, saveSession } = useChatHistory();
  const [sessionId, setSessionId] = useState(() => "sess-" + Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        setServerStatus(res.ok ? 'online' : 'offline');
      } catch (e) {
        setServerStatus('offline');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const scrollRef = useRef(null);



  useEffect(() => {
    if (messages.length > 0) {
      saveSession(sessionId, messages, activeMode);
    }
  }, [messages, sessionId, activeMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, isSpeaking, isStreaming]);

  const handleSelectHistory = (historyItem) => {
    setMessages(historyItem.messages || []);
    setSessionId(historyItem.id);
    setLatestInsight(null);
    setIsHistoryOpen(false);
  };

  const handleNewChat = () => {
    setSessionId("sess-" + Math.random().toString(36).substring(2, 9));
    setMessages([]);
    setLatestInsight(null);
    setIsHistoryOpen(false);
  };

  // ─── Streaming Chat Handler ─────────────────────────────────────────────
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);
    setIsSpeaking(false);

    // Create a placeholder AI message that will be filled via streaming
    const aiMsgId = Date.now() + 1;
    const aiMsg = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      character: activeMode === 'chanakya' ? 'Chanakya' : activeMode === 'laxmibai' ? 'Laxmi Bai' : 'Krishna',
      isStreaming: true,
    };

    try {
      // Use streaming endpoint
      const streamUrl = `${API_BASE}/chat/stream?query=${encodeURIComponent(text)}&session_id=${encodeURIComponent(sessionId)}&persona=${activeMode}`;
      const response = await fetch(streamUrl);

      if (!response.ok) {
        throw new Error('Failed to connect to Krishna.');
      }

      setIsThinking(false);
      setIsStreaming(true);
      setMessages(prev => [...prev, aiMsg]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE lines
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                // Stream complete
                break;
              }
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.text) {
                fullText += data.text;
                // Update the streaming message in-place
                setMessages(prev =>
                  prev.map(m =>
                    m.id === aiMsgId
                      ? { ...m, text: fullText }
                      : m
                  )
                );
              }
            } catch (e) {
              // Skip malformed lines
              if (e.message && !e.message.includes('JSON')) throw e;
            }
          }
        }
      }

      // Mark streaming as complete
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? { ...m, isStreaming: false }
            : m
        )
      );
      setIsStreaming(false);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 2000);

    } catch (err) {
      console.warn('Streaming failed:', err);
      setIsThinking(false);
      setIsStreaming(false);
      setMessages(prev => {
        // Remove empty AI placeholder if it exists
        const filtered = prev.filter(m => !(m.id === aiMsgId && !m.text));
        return [...filtered, {
          id: Date.now() + 2,
          sender: 'system',
          text: `⚠️ Error: ${err.message}`
        }];
      });
    }
  };


  return (
    <div className="app-container" data-mode={activeMode} style={{ display: 'flex', flexDirection: 'row', height: '100vh', overflow: 'hidden' }}>
      {/* Background */}
      <div className="bg-cosmic"></div>

      {/* Left Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        sessions={sessions}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={handleSelectHistory}
        onNewChat={handleNewChat}
      />

      {/* Main Content Area */}
      <div
        className="main-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>

        {/* Header */}
        <header className="layer-low" style={{
          padding: '1.25rem 2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(40px)',
          zIndex: 10,
          boxShadow: '0 4px 30px rgba(0,0,0,0.2)'
        }}>
          {!isHistoryOpen && (
             <button
                onClick={() => setIsHistoryOpen(true)}
                className="animate-fade-in"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  transition: '0.3s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <Menu size={20} />
              </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: isHistoryOpen ? '0' : '15px' }}>
            {/* Server Status Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(0,0,0,0.4)',
              border: `1px solid ${serverStatus === 'online' ? 'rgba(34, 197, 94, 0.3)' : serverStatus === 'offline' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: serverStatus === 'online' ? '#4ade80' : serverStatus === 'offline' ? '#f87171' : '#a1a1aa',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              transition: 'all 0.3s ease'
            }}>
              <Server size={14} />
              {serverStatus}
            </div>

            <div className="layer-highest" style={{ 
              display: 'flex', 
              borderRadius: '30px', 
              padding: '6px',
              alignItems: 'center',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
            }}>
              {[
                { id: 'krishna', label: '🕉️ Krishna', color: 'var(--color-primary)' },
                { id: 'chanakya', label: '🪔 Chanakya', color: '#ff4d4d' },
                { id: 'laxmibai', label: '⚔️ Rani Laxmibai', color: '#ffb74d' }
              ].map(persona => (
                <button
                  key={persona.id}
                  onClick={() => {
                    if (activeMode !== persona.id) {
                      setActiveMode(persona.id);
                      if (onModeChange) onModeChange(persona.id);
                      handleNewChat();
                    }
                  }}
                  className="font-display"
                  style={{
                    background: activeMode === persona.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: activeMode === persona.id ? persona.color : 'rgba(255,255,255,0.4)',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '24px',
                    fontSize: '0.85rem',
                    fontWeight: activeMode === persona.id ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    lineHeight: '1',
                  }}
                >
                  {persona.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setIsProfileOpen(true)}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: '0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--mode-accent)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              <User size={16} className="text-mode" />
              <span className="hidden-mobile" style={{ fontWeight: '600' }}>Profile</span>
            </button>
          </div>
        </header>

        {/* Message Feed */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            maxWidth: '900px',
            width: '100%',
            margin: '0 auto',
            paddingBottom: '240px',
            scrollBehavior: 'smooth'
          }}>

          {messages.length === 0 ? (
            <div className="animate-fade-in" style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              opacity: 0.8,
              paddingTop: '10vh'
            }}>
              <div style={{
                background: 'var(--color-surface-low)',
                padding: '2rem',
                borderRadius: '50%',
                marginBottom: '3rem',
                boxShadow: '0 0 60px var(--mode-accent-soft)',
                color: 'var(--mode-accent)'
              }}>
                <Sparkles size={64} />
              </div>
              <h2 className="text-headline-lg" style={{ color: '#fff', marginBottom: '1.5rem' }}>How may I guide your path today?</h2>
              <p className="text-body-lg" style={{ maxWidth: '600px', color: 'var(--color-text-secondary)' }}>
                Speak your dilemma, and ancient wisdom shall illuminate the path of Dharma. Choose your guide and embark on a journey of clarity.
              </p>
            </div>
          ) : (
            messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}

          {isThinking && (
            <div className="animate-fade-in-left">
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="speaking-waveform">
                  <div className="speaking-bar" /> <div className="speaking-bar" /> <div className="speaking-bar" />
                </div>
                <span style={{ fontSize: '0.9rem', color: 'var(--mode-accent)' }}>Krishna is contemplating...</span>
              </div>
            </div>
          )}
        </div>


        {/* Bottom Bar */}
        <VoiceUI
          onSend={handleSendMessage}
          isSageThinking={isThinking}
          isSageSpeaking={isSpeaking}
          onLiveTalk={() => onStartVoice(activeMode)}
          isLiveMode={false}
          placeholder="Share your burden, O Seeker..."
        />
      </div>

      {/* Side Insight Panel */}
      <InsightPanel isOpen={isInsightOpen} insight={latestInsight} />

      {/* User Context Form */}
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
};

export default ChatInterface;
