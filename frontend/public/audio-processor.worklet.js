/**
 * DharmaGPT Audio Worklet Processor
 * Runs in a dedicated AudioWorkletGlobalScope (separate thread from main JS).
 *
 * TWO processors in one file:
 *   1. MicCaptureProcessor  — captures mic input, sends 16kHz PCM to main thread
 *   2. PlaybackProcessor    — receives 24kHz PCM from main thread, plays to speakers
 *
 * Why AudioWorklet and not ScriptProcessorNode?
 *   ScriptProcessorNode runs on the main thread and causes glitches under JS load.
 *   AudioWorklet runs on a real-time audio thread — no GC pauses, no dropped frames.
 */

// ─── 1. MIC CAPTURE PROCESSOR ────────────────────────────────────────────────
// Receives: raw mic input at the AudioContext sample rate (usually 44100 or 48000 Hz)
// Sends:    downsampled 16-bit PCM at 16000 Hz to main thread
// Gemini Live API requires: 16kHz, 16-bit, mono, little-endian PCM

class MicCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._targetSampleRate = 16000;
    this._sourceSampleRate = options.processorOptions?.sourceSampleRate ?? 44100;
    this._resampleRatio = this._sourceSampleRate / this._targetSampleRate;

    // Accumulate samples until we have a full 100ms chunk (1600 samples at 16kHz)
    this._chunkSamples = 1600;
    this._buffer = new Float32Array(this._chunkSamples * Math.ceil(this._resampleRatio) + 128);
    this._bufferPos = 0;
    this._outputBuf = new Float32Array(this._chunkSamples);

    this._active = true;
    this.port.onmessage = (e) => {
      if (e.data.type === 'stop') this._active = false;
    };
  }

  process(inputs) {
    if (!this._active) return false;

    const input = inputs[0];
    if (!input || !input[0]) return true;

    // Mix down to mono if stereo (Gemini only wants mono)
    const channel = input[0];
    const numChannels = input.length;

    let mono;
    if (numChannels === 1) {
      mono = channel;
    } else {
      mono = new Float32Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        let sum = 0;
        for (let c = 0; c < numChannels; c++) sum += input[c][i];
        mono[i] = sum / numChannels;
      }
    }

    // Write incoming samples to buffer
    for (let i = 0; i < mono.length; i++) {
      if (this._bufferPos < this._buffer.length) {
        this._buffer[this._bufferPos++] = mono[i];
      }
    }

    // Downsample and flush when we have enough source samples
    const neededSourceSamples = this._chunkSamples * this._resampleRatio;
    while (this._bufferPos >= neededSourceSamples) {
      this._downsample();
      this._bufferPos -= neededSourceSamples;
      // Shift remaining samples to front
      this._buffer.copyWithin(0, Math.floor(neededSourceSamples));
    }

    return true;
  }

  _downsample() {
    // Linear interpolation downsampling
    for (let i = 0; i < this._chunkSamples; i++) {
      const srcIdx = i * this._resampleRatio;
      const lo = Math.floor(srcIdx);
      const hi = Math.min(lo + 1, this._buffer.length - 1);
      const frac = srcIdx - lo;
      this._outputBuf[i] = this._buffer[lo] * (1 - frac) + this._buffer[hi] * frac;
    }

    // Convert Float32 [-1, 1] to Int16 PCM [-32768, 32767]
    const pcm16 = new Int16Array(this._chunkSamples);
    for (let i = 0; i < this._chunkSamples; i++) {
      const clamped = Math.max(-1, Math.min(1, this._outputBuf[i]));
      pcm16[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
    }

    // Send PCM chunk to main thread (zero-copy transfer)
    this.port.postMessage(
      { type: 'pcm', buffer: pcm16.buffer },
      [pcm16.buffer]
    );
  }
}

// ─── 2. PLAYBACK PROCESSOR ───────────────────────────────────────────────────
// Receives: 24kHz 16-bit PCM chunks from main thread (Gemini's audio output)
// Outputs:  resampled audio at the AudioContext's native sample rate
// Critical: Must never underrun (causes audible pops/silence gaps)

class PlaybackProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._sourceSampleRate = 24000;  // Gemini outputs 24kHz
    this._targetSampleRate = options.processorOptions?.targetSampleRate ?? 44100;
    this._resampleRatio = this._sourceSampleRate / this._targetSampleRate;

    // Ring buffer: 3 seconds of audio headroom to absorb network jitter
    // (24000 samples/sec * 3 sec = 72000 samples, but we store at target rate)
    const bufSize = Math.ceil(this._targetSampleRate * 3);
    this._ring = new Float32Array(bufSize);
    this._writePos = 0;
    this._readPos = 0;
    this._filled = 0;

    // Track source position for resampling
    this._srcPos = 0;
    this._srcBuffer = new Float32Array(0);

    this._playing = false;
    this._minBufferSamples = Math.ceil(this._targetSampleRate * 0.1); // 100ms prebuffer

    this.port.onmessage = (e) => {
      if (e.data.type === 'pcm') {
        this._enqueue(new Int16Array(e.data.buffer));
      } else if (e.data.type === 'clear') {
        // Called when user interrupts — flush immediately
        this._writePos = 0;
        this._readPos = 0;
        this._filled = 0;
        this._playing = false;
        this._srcBuffer = new Float32Array(0);
        this._srcPos = 0;
      }
    };
  }

  _enqueue(pcm16) {
    // Convert Int16 PCM to Float32
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 32768 : 32767);
    }

    // Upsample from 24kHz to target rate and write to ring buffer
    const outSamples = Math.ceil(float32.length / this._resampleRatio);
    for (let i = 0; i < outSamples; i++) {
      const srcIdx = i * this._resampleRatio;
      const lo = Math.floor(srcIdx);
      const hi = Math.min(lo + 1, float32.length - 1);
      const frac = srcIdx - lo;
      const sample = float32[lo] * (1 - frac) + float32[hi] * frac;

      if (this._filled < this._ring.length) {
        this._ring[this._writePos] = sample;
        this._writePos = (this._writePos + 1) % this._ring.length;
        this._filled++;
      }
    }

    // Start playing once we have enough buffered to avoid underrun
    if (!this._playing && this._filled >= this._minBufferSamples) {
      this._playing = true;
      this.port.postMessage({ type: 'playback_started' });
    }
  }

  process(_inputs, outputs) {
    const out = outputs[0][0];
    if (!out) return true;

    if (!this._playing || this._filled < out.length) {
      // Not enough data yet — output silence (do NOT underrun with garbage)
      out.fill(0);
      return true;
    }

    for (let i = 0; i < out.length; i++) {
      out[i] = this._ring[this._readPos];
      this._readPos = (this._readPos + 1) % this._ring.length;
      this._filled--;
    }

    // Notify main thread when buffer drains (stream ended)
    if (this._filled === 0 && this._playing) {
      this._playing = false;
      this.port.postMessage({ type: 'playback_ended' });
    }

    return true;
  }
}

registerProcessor('mic-capture-processor', MicCaptureProcessor);
registerProcessor('playback-processor', PlaybackProcessor);
