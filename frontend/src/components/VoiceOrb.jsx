'use client';

/**
 * VoiceOrb — 3D Living Sound Wave
 *
 * Renders an organic, amorphous floating blob using overlapping frequencies
 * and radial gradients. Replaces the rigid 2D bars with a "Gemini Live"
 * style breathing presence.
 */

import { useEffect, useRef, useCallback } from 'react';

// ─── Persona color map ────────────────────────────────────────────────────────

export const PERSONA_COLORS = {
  krishna:      '#85adff', // Sky Blue
  chanakya:     '#ff4d4d', // Strategic Red
  laxmibai:     '#ffb74d', // Warrior Saffron
};

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export default function VoiceOrb({
  state,
  freqData,
  personaColor = PERSONA_COLORS.krishna,
  size = 300,
  onClick,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const startTimeRef = useRef(performance.now());

  const currentColorRef = useRef(hexToRgb(personaColor));
  const targetColorRef = useRef(hexToRgb(personaColor));
  const colorProgressRef = useRef(1);

  // Smooth color transition
  useEffect(() => {
    targetColorRef.current = hexToRgb(personaColor);
    colorProgressRef.current = 0;
  }, [personaColor]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const CX = W / 2;
    const CY = H / 2;
    const baseR = (W / 2) * 0.45; 
    const t = (performance.now() - startTimeRef.current) / 1000;

    // Clear canvas
    ctx.clearRect(0, 0, W, H);

    // Color transition interpolation
    if (colorProgressRef.current < 1) {
      colorProgressRef.current = Math.min(1, colorProgressRef.current + 0.016 / 1.2);
      const p = colorProgressRef.current;
      const eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p; 
      currentColorRef.current = [
        Math.round(lerp(currentColorRef.current[0], targetColorRef.current[0], eased)),
        Math.round(lerp(currentColorRef.current[1], targetColorRef.current[1], eased)),
        Math.round(lerp(currentColorRef.current[2], targetColorRef.current[2], eased)),
      ];
    }
    const [r, g, b] = currentColorRef.current;

    // Audio Analysis
    let avgAmp = 0;
    if (freqData && freqData.length > 0) {
      avgAmp = freqData.reduce((acc, val) => acc + val, 0) / freqData.length / 255;
    }

    // Determine state-based animation parameters
    let activity = 0.05; // Base undulation
    let expansion = 1.0; // Base size multiplier
    let layerCount = 3;

    if (state === 'idle' || state === 'connecting') {
      expansion = 1 + Math.sin(t * 1.2) * 0.06; // Calm breathing
      activity = 0.02;
    } else if (state === 'listening' || state === 'recording') {
      expansion = 1 + avgAmp * 0.3; // Grow when speaking
      activity = 0.05 + avgAmp * 0.2;
    } else if (state === 'processing') {
      expansion = 1.05 + Math.sin(t * 8) * 0.08; // Rapid pulsing heartbeat
      activity = 0.2; 
      layerCount = 5; // Extra layers for hyper-active look
    } else if (state === 'speaking') {
      // If we don't have real freqData while speaking, simulate it organically
      const simulatedAmp = (Math.sin(t * 5) * Math.cos(t * 3.4) + 1) / 2;
      const finalAmp = avgAmp > 0 ? avgAmp : simulatedAmp * 0.5;
      expansion = 1.0 + finalAmp * 0.6; // Large growth when Agent speaks
      activity = 0.15 + finalAmp * 0.4;
      layerCount = 4;
    }

    ctx.globalCompositeOperation = 'screen';

    // ─── Render 3D Blob Layers ──────────────────────────────────────────────
    const resolution = 150; // High res for perfectly smooth curves

    for (let layer = 0; layer < layerCount; layer++) {
      ctx.beginPath();
      
      const layerOffsetRadius = baseR * expansion * (0.8 + layer * 0.12);
      
      for (let i = 0; i <= resolution; i++) {
        const angle = (i / resolution) * Math.PI * 2;
        
        // Complex Superposition of Waves (Simulating 3D Perlin Noise)
        // We offset phase by layer so they weave into each other
        const wave1 = Math.sin(angle * 3 + t * (1.8 + layer * 0.5)) * 0.15;
        const wave2 = Math.cos(angle * 5 - t * (2.1 - layer * 0.3)) * 0.1;
        const wave3 = Math.sin(angle * 7 + t * 4) * 0.05;
        
        const distortion = (wave1 + wave2 + wave3) * layerOffsetRadius * activity;
        const radius = layerOffsetRadius + distortion;

        // Apply slight rotation to each layer for volumetric spinning effect
        const spinAngle = angle + t * (layer % 2 === 0 ? 0.3 : -0.3);
        
        const px = CX + Math.cos(spinAngle) * radius;
        const py = CY + Math.sin(spinAngle) * radius;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // ─── Chromatic Aberration & Volumetric Shifting ────────────────────────
      // We offset the RGB layers slightly based on activity to create a 3D prism effect
      const shiftX = Math.sin(t * 2) * 5 * activity;
      const shiftY = Math.cos(t * 2) * 5 * activity;
      
      // 3D Volumetric Fill via Radial Gradient
      const lightX = CX - baseR * 0.3 + shiftX;
      const lightY = CY - baseR * 0.3 + shiftY;
      
      const grad = ctx.createRadialGradient(lightX, lightY, baseR * 0.1, CX, CY, layerOffsetRadius * 1.5);
      
      if (layer === 0) {
        // Inner Core - High intensity bloom
        const bloom = 0.7 + avgAmp * 0.3;
        grad.addColorStop(0, `rgba(255, 255, 255, ${bloom})`);
        grad.addColorStop(0.1, `rgba(${r + 50}, ${g + 50}, ${b + 50}, 0.8)`);
        grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.6)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      } else {
        // Outer translucent aura layers with color splitting
        const layerAlpha = 0.5 - (layer / layerCount) * 0.4;
        // Shift colors slightly per layer for chromatic depth
        const hueShift = layer * 10; 
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${layerAlpha})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      }

      ctx.fillStyle = grad;
      ctx.fill();

      // Add a crisp glass-like edge to the outermost layer
      if (layer === layerCount - 1) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + activity * 0.2})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [state, freqData]);

  // Loop manager
  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  // Handle High DPI displays
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const canvasSize = size * dpr;

  return (
    <div className={`relative ${state === 'processing' ? 'animate-pulse' : ''}`} style={{ width: size, height: size }}>
      
      {/* Intense center backdrop glow */}
      <div 
        className="absolute inset-0 rounded-full blur-3xl opacity-50 mix-blend-screen scale-110 pointer-events-none transition-transform duration-700"
        style={{ 
            background: `radial-gradient(circle, ${personaColor} 0%, transparent 60%)`,
            transform: state === 'speaking' || state === 'recording' ? 'scale(1.4)' : 'scale(1)'
        }}
      />

      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onClick={onClick}
        style={{
          width: size,
          height: size,
          cursor: onClick ? 'pointer' : 'default',
        }}
        aria-label={`DharmaGPT voice orb — ${state}`}
        role="button"
        tabIndex={0}
      />
    </div>
  );
}
