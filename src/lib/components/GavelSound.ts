// Web Audio API Synthesizer for Gavel Strike & Fanfare
// 100% offline, zero network requests, instant playback!

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!audioCtx) {
		const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
		if (AudioContextClass) {
			audioCtx = new AudioContextClass();
		}
	}
	if (audioCtx && audioCtx.state === 'suspended') {
		audioCtx.resume();
	}
	return audioCtx;
}

export function playGavelStrike() {
	const ctx = getAudioContext();
	if (!ctx) return;

	const now = ctx.currentTime;

	// Single wooden impact:
	const strike = (startTime: number, volume: number) => {
		// 1. Low body resonance (wooden table thud)
		const osc = ctx.createOscillator();
		const oscGain = ctx.createGain();

		osc.type = 'triangle';
		osc.frequency.setValueAtTime(140, startTime);
		osc.frequency.exponentialRampToValueAtTime(35, startTime + 0.12);

		oscGain.gain.setValueAtTime(volume * 0.9, startTime);
		oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

		osc.connect(oscGain);
		oscGain.connect(ctx.destination);

		osc.start(startTime);
		osc.stop(startTime + 0.2);

		// 2. High snap / crack of hard oak wood
		const bufferSize = ctx.sampleRate * 0.05;
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
		}

		const noise = ctx.createBufferSource();
		noise.buffer = buffer;

		const noiseFilter = ctx.createBiquadFilter();
		noiseFilter.type = 'bandpass';
		noiseFilter.frequency.setValueAtTime(1200, startTime);
		noiseFilter.Q.setValueAtTime(3, startTime);

		const noiseGain = ctx.createGain();
		noiseGain.gain.setValueAtTime(volume * 0.7, startTime);
		noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);

		noise.connect(noiseFilter);
		noiseFilter.connect(noiseGain);
		noiseGain.connect(ctx.destination);

		noise.start(startTime);
	};

	// Double impact: light bounce + heavy strike!
	strike(now, 0.45);
	strike(now + 0.06, 1.0);
}

export function playOrderInCourt() {
	const ctx = getAudioContext();
	if (!ctx) return;
	const now = ctx.currentTime;
	// Three rhythmic gavel strikes
	playGavelStrike();
	setTimeout(() => playGavelStrike(), 220);
	setTimeout(() => playGavelStrike(), 440);
}

export function playVerdictFanfare() {
	const ctx = getAudioContext();
	if (!ctx) return;

	const now = ctx.currentTime;
	// Playful Haven chime chords: C5, E5, G5, C6
	const notes = [523.25, 659.25, 783.99, 1046.5];
	notes.forEach((freq, i) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(freq, now + i * 0.08);

		gain.gain.setValueAtTime(0, now + i * 0.08);
		gain.gain.linearRampToValueAtTime(0.35, now + i * 0.08 + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.8);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now + i * 0.08);
		osc.stop(now + i * 0.08 + 0.85);
	});
}
