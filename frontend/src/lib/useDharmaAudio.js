import { useCallback, useEffect, useRef, useState } from 'react';

const FFT_SIZE = 256;
const SILENCE_DURATION_MS = 900; // 0.9 seconds — snappy turn-taking

export function useDharmaAudio({
  persona = 'krishna',
  onPersonaChange,
  onVerseReceived,
  onTranscriptionReceived,
  onStateChange,
  onError,
}) {
  // states: idle -> connecting -> listening -> recording -> processing -> speaking
  const [state, setState] = useState('idle');
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [freqData, setFreqData] = useState(null);

  const stateRef = useRef('idle');
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const analyserDataRef = useRef(null);
  const micStreamRef = useRef(null);
  
  // Web Speech API
  const recognitionRef = useRef(null);
  const latestTranscriptRef = useRef("");
  const silenceTimeoutRef = useRef(null);
  const processingTimeoutRef = useRef(null); // Safety: resets stuck 'processing' state
  const isSpeakingRef = useRef(false);
  const ambientNoiseRef = useRef(20); // Dynamic baseline for VAD
  const rafRef = useRef(null);
  const currentAudioRef = useRef(null);
  const stoppedManuallyRef = useRef(false);
  
  // Whisper STT Recorder Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  // Streaming Audio Queue
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  const setStateSynced = useCallback((s) => {
    stateRef.current = s;
    setState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  // ─── Visualizer & VAD Loop ──────────────────────────────────────────────────

  const startVisualizerLoop = useCallback(() => {
    const tick = () => {
      if (analyserRef.current && analyserDataRef.current && stateRef.current !== 'idle') {
        analyserRef.current.getByteFrequencyData(analyserDataRef.current);
        const data = new Uint8Array(analyserDataRef.current);
        setFreqData(data);

        // Visual VAD only (to drive the orb animation & UI state)
        if (stateRef.current === 'listening' || stateRef.current === 'recording') {
            const sum = data.reduce((a, b) => a + b, 0);
            const avg = sum / data.length;
            
            if (!isSpeakingRef.current) {
                ambientNoiseRef.current = ambientNoiseRef.current * 0.95 + avg * 0.05;
            }
            
            const dynamicThreshold = Math.max(15, ambientNoiseRef.current + 12);

            if (avg > dynamicThreshold) {
               if (!isSpeakingRef.current) {
                   isSpeakingRef.current = true;
                   if (stateRef.current !== 'recording') setStateSynced('recording');
                   
                   // START WHISPER RECORDER
                   if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
                       audioChunksRef.current = [];
                       mediaRecorderRef.current.start(250);
                   }
               }
               clearTimeout(silenceTimeoutRef.current);
               silenceTimeoutRef.current = setTimeout(() => {
                   if (isSpeakingRef.current) {
                       isSpeakingRef.current = false;
                       
                       // STOP WHISPER RECORDER (trigger ws send)
                       if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                           mediaRecorderRef.current.stop();
                       }

                       // Only go back to 'listening' if we aren't already processing an LLM response
                       if (stateRef.current !== 'listening' && stateRef.current !== 'processing' && stateRef.current !== 'speaking') {
                           setStateSynced('processing');
                       }
                       silenceTimeoutRef.current = null;
                   }
               }, SILENCE_DURATION_MS);
            }
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [setStateSynced]);

  const stopVisualizerLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    clearTimeout(silenceTimeoutRef.current);
  }, []);

  // ─── Setup Mic & Recorder ──────────────────────────────────────────────────

  const setupMic = useCallback(async () => {
    // If a stream already exists, kill it FIRST before requesting a new one.
    if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
    }

    // Close any previous context (non-blocking)
    if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
    }

    try {
        // Check if any audio input devices exist first
        let stream;
        try {
            // First try: full audio constraints (best quality)
            stream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
        } catch (constraintErr) {
            // Fallback: if constraints failed, try plain audio:true
            // This handles cases where the browser can't match specific constraints
            console.warn('[DharmaAudio] Constrained getUserMedia failed, trying fallback:', constraintErr.message);
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        micStreamRef.current = stream;
        
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtxClass();
        audioCtxRef.current = ctx;

        // Ensure AudioContext is running
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const srcNode = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;
        analyserDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        
        srcNode.connect(analyser);

        // --- Whisper API Media Recorder Setup ---
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };
        mediaRecorder.onstop = () => {
            if (audioChunksRef.current.length === 0) return;
            const audioBlob = new Blob(audioChunksRef.current);
            audioChunksRef.current = [];
            
            if (wsRef.current?.readyState === WebSocket.OPEN && stateRef.current !== 'speaking') {
                console.log(`[Whisper] Sending ${audioBlob.size} bytes of audio to WebSocket...`);
                wsRef.current.send(audioBlob);
            }
        };
        mediaRecorderRef.current = mediaRecorder;

        // Initialize Native Live Transcription
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-IN'; 
            
            recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                // ─── Seamless Voice Interruption (True VAD) ───
                // If the AI is currently talking or thinking, and the user speaks, HALT the AI.
                if (stateRef.current === 'speaking' || stateRef.current === 'processing') {
                    const activeText = (finalTranscript + interimTranscript).trim();
                    if (activeText.length > 2) {
                        console.log("[VAD] User Interrupted AI with:", activeText);
                        
                        // Halt AI audio instantly
                        audioQueueRef.current = [];
                        isPlayingRef.current = false;
                        if (currentAudioRef.current) {
                            currentAudioRef.current.pause();
                            currentAudioRef.current = null;
                        }

                        // Tell Backend to stop generating
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                            wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
                        }
                        
                        setStateSynced('recording');
                        isSpeakingRef.current = true;
                    }
                }

                
                if (finalTranscript.trim()) {
                    console.log("[SpeechAPI] Final Sentence (UI Only):", finalTranscript.trim());
                    onTranscriptionReceived?.(finalTranscript.trim(), 'user');
                    
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                         mediaRecorderRef.current.stop();
                    }
                    
                    isSpeakingRef.current = false;
                    setStateSynced('processing');
                    clearTimeout(silenceTimeoutRef.current);
                } else if (interimTranscript.trim()) {
                    latestTranscriptRef.current = interimTranscript.trim();
                    onTranscriptionReceived?.(interimTranscript.trim(), 'user');
                }
            };
            
            recognition.onstart = () => {
                console.log("[SpeechAPI] Recognition started");
            };
            
            recognition.onerror = (e) => {
                if (e.error === 'no-speech') return; // Ignore silent period errors
                console.error('[SpeechAPI] Error:', e.error);
                if (e.error === 'not-allowed') {
                    onError?.(new Error("Microphone access denied by browser"));
                }
            };

            // Auto-restart if browser cuts it off due to idle time
            recognition.onend = () => {
                if (stateRef.current !== 'idle' && !stoppedManuallyRef.current) {
                    console.log("[SpeechAPI] Session ended prematurely, restarting...");
                    try { recognition.start(); } catch(e) {}
                }
            };

            recognitionRef.current = recognition;
        } else {
            console.error("Web Speech API not supported.");
        }
    } catch (err) {
        console.error("[DharmaAudio] getUserMedia error:", err);
        throw err;
    }
  }, [onTranscriptionReceived, onError, setStateSynced]);

  const playNextAudio = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setStateSynced('listening');
      return;
    }

    isPlayingRef.current = true;
    setStateSynced('speaking');
    
    const blob = audioQueueRef.current.shift();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudioRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudioRef.current = null;
      playNextAudio();
    };

    audio.onerror = (e) => {
      console.error("Audio playback error:", e);
      URL.revokeObjectURL(url);
      currentAudioRef.current = null;
      playNextAudio();
    };

    audio.play().catch(e => {
        console.error("Audio auto-play blocked/failed:", e);
        playNextAudio();
    });
  }, [setStateSynced]);

  // ─── WebSocket Connection ──────────────────────────────────────────────────

  const connectWebSocket = useCallback(() => {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:8000/ws/voice/${persona}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Connection timeout — if backend doesn't respond in 10s, reject
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('[DharmaAudio] WebSocket connection timed out after 10s');
          ws.close();
          reject(new Error('Connection timed out. Is the backend running at localhost:8000?'));
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        setStateSynced('listening');
        resolve();
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
            try {
                const signal = JSON.parse(event.data);
                if (signal.type === 'agent_thinking') {
                    setStateSynced('processing');
                    // Safety timeout: if no response arrives within 20s, auto-reset to listening
                    if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
                    processingTimeoutRef.current = setTimeout(() => {
                        if (stateRef.current === 'processing') {
                            console.warn('[DharmaAudio] Safety timeout — resetting from stuck processing state');
                            setStateSynced('listening');
                        }
                        processingTimeoutRef.current = null;
                    }, 20000);
                }
                if (signal.type === 'user_transcription') {
                    isSpeakingRef.current = false;
                    onTranscriptionReceived?.(signal.text, 'user');
                }
                if (signal.type === 'verse_retrieved') onVerseReceived?.(signal.ref, signal.verse);
                if (signal.type === 'agent_speaking') {
                    setStateSynced('speaking');
                    onTranscriptionReceived?.(signal.text, 'ai');
                }
                if (signal.type === 'session_error') onError?.(new Error(signal.message));
                if (signal.type === 'agent_done') {
                    // LLM+TTS pipeline complete — only go to listening if no audio is actively playing.
                    // If audio IS playing, playNextAudio() will handle the state reset when queue drains.
                    if (!isPlayingRef.current && !stoppedManuallyRef.current) {
                        setStateSynced('listening');
                    }
                    // Clear any processing safety timeout
                    if (processingTimeoutRef.current) {
                        clearTimeout(processingTimeoutRef.current);
                        processingTimeoutRef.current = null;
                    }
                }
            } catch (e) {
                console.error("Signal parse error:", e);
            }
        } else if (event.data instanceof Blob) {
            // Drop audio only if user is actively recording or we are idle/done
            if (stateRef.current === 'recording' || stateRef.current === 'idle' || stateRef.current === 'listening') {
                console.log('[VAD] Dropping trailing audio chunk (state:', stateRef.current, ')');
                return;
            }
            
            audioQueueRef.current.push(event.data);
            if (!isPlayingRef.current) {
               playNextAudio();
            }
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStateSynced('idle');
      };

      ws.onerror = (err) => {
        onError?.(new Error("WebSocket Connection Failed"));
        setStateSynced('idle');
        reject(err);
      };
    });
  }, [persona, setStateSynced, onVerseReceived, onError]);

  // ─── Public API ────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    // RESET manual stop flag IMMEDIATELY so it doesn't block the logic below
    stoppedManuallyRef.current = false;
    setError(null);
    
    // GUARD: If already connected or connecting, don't start it again!
    if (stateRef.current !== 'idle' && stateRef.current !== 'error') {
        console.log("[DharmaAudio] Skipping start — already in state:", stateRef.current);
        return;
    }
    
    try {
      console.log("[DharmaAudio] Starting session for:", persona);
      setStateSynced('connecting');
      
      await setupMic();
      
      // Start Speech Engine early for immediate feedback
      if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch(e) {}
      }
      
      await connectWebSocket();

      startVisualizerLoop();
    } catch (err) {
      console.error("[DharmaAudio] Start error:", err);
      setError(err.message || String(err));
      onError?.(err);
      setStateSynced('error');
      if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(t => t.stop());
          micStreamRef.current = null;
      }
    }
  }, [setupMic, connectWebSocket, startVisualizerLoop, onError, setStateSynced, persona]);

  const stop = useCallback(() => {
    stoppedManuallyRef.current = true;
    stopVisualizerLoop();
    clearTimeout(silenceTimeoutRef.current);
    clearTimeout(processingTimeoutRef.current);
    processingTimeoutRef.current = null;
    
    // Stop any playing audio and clear the queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
    }

    // Kill speech recognition & recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch(e) {}
    }
    
    if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try { recognitionRef.current.abort(); } catch(e) {}
        recognitionRef.current = null;
    }

    // Kill microphone hardware tracks
    if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => {
            t.stop();
            t.enabled = false; 
        });
        micStreamRef.current = null;
    }

    // Kill audio context
    if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch(e) {}
        audioCtxRef.current = null;
    }

    // Kill WebSocket
    if (wsRef.current) {
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
    }

    setIsConnected(false);
    setStateSynced('idle');
    setFreqData(null);
  }, [stopVisualizerLoop, setStateSynced]);

  const interrupt = useCallback(() => {
    if (stateRef.current !== 'speaking') return;
    
    // Clear queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
    }
    setStateSynced('listening');
  }, [setStateSynced]);

  const setMuted = useCallback((isMuted) => {
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { state, error, freqData, start, stop, interrupt, isConnected, setMuted, stoppedManually: stoppedManuallyRef };
}
