import { useState, useEffect } from 'react';

const STORAGE_KEY = 'dharmagpt_chat_history';

export function useChatHistory() {
  const [sessions, setSessions] = useState([]);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSessions(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load chat history", e);
    }
  }, []);

  // Save the current state of a Chat interface session
  const saveSession = (sessionId, messages, activeMode) => {
    // We only save sessions that have at least one user message
    if (!messages || messages.length === 0) return;
    const firstUserMsg = messages.find(m => m.sender === 'user');
    if (!firstUserMsg) return;

    const title = firstUserMsg.text.length > 40 
      ? firstUserMsg.text.substring(0, 40) + '...' 
      : firstUserMsg.text;

    setSessions(prevSessions => {
      const existingIdx = prevSessions.findIndex(s => s.id === sessionId);
      const sessionObj = {
        id: sessionId,
        title,
        mode: activeMode,
        timestamp: Date.now(), // Update timestamp so it jumps to top
        messages: messages
      };

      let newSessions;
      if (existingIdx >= 0) {
        // Update existing session
        newSessions = [...prevSessions];
        // Only update timestamp if it was updated previously
        if(newSessions[existingIdx].messages.length !== messages.length) {
            newSessions[existingIdx] = sessionObj;
            newSessions.sort((a, b) => b.timestamp - a.timestamp);
        } else {
             // Just update messages without changing timestamp position
             newSessions[existingIdx].messages = messages;
             newSessions[existingIdx].mode = activeMode;
        }
      } else {
        // Add new session at beginning
        newSessions = [sessionObj, ...prevSessions];
      }

      // Persist to local storage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
      return newSessions;
    });
  };

  const deleteSession = (sessionId) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return {
    sessions,
    saveSession,
    deleteSession
  };
}
