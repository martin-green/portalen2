'use strict';
// Syntetiserade ljud med WebAudio – inga ljudfiler behövs.
(function (PG) {
	const A = (PG.Audio = {
		ctx: null,
		master: null,
		muted: localStorage.getItem('portalen.muted') === '1',
		loops: {},
		noiseBuf: null,
	});

	A.init = function () {
		if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return;
		A.ctx = new AC();
		A.master = A.ctx.createGain();
		A.master.gain.value = A.muted ? 0 : 0.6;
		A.master.connect(A.ctx.destination);
		const len = A.ctx.sampleRate * 2;
		A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
		const d = A.noiseBuf.getChannelData(0);
		for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
	};

	A.setMuted = function (m) {
		A.muted = m;
		localStorage.setItem('portalen.muted', m ? '1' : '0');
		if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 0.6, A.ctx.currentTime, 0.05);
	};

	function ok() { return A.ctx && A.ctx.state === 'running'; }

	function env(gainNode, t, attack, hold, release, peak) {
		const g = gainNode.gain;
		g.setValueAtTime(0.0001, t);
		g.exponentialRampToValueAtTime(peak, t + attack);
		g.setValueAtTime(peak, t + attack + hold);
		g.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
	}

	function tone(type, freq, t, dur, peak, dest) {
		const o = A.ctx.createOscillator();
		const g = A.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		env(g, t, 0.01, Math.max(0, dur - 0.06), 0.05, peak);
		o.connect(g).connect(dest || A.master);
		o.start(t);
		o.stop(t + dur + 0.1);
		return o;
	}

	function noise(t, dur, filterType, freq, peak, q) {
		const src = A.ctx.createBufferSource();
		src.buffer = A.noiseBuf;
		const f = A.ctx.createBiquadFilter();
		f.type = filterType;
		f.frequency.setValueAtTime(freq, t);
		if (q) f.Q.value = q;
		const g = A.ctx.createGain();
		env(g, t, 0.005, 0, dur, peak);
		src.connect(f).connect(g).connect(A.master);
		src.start(t, Math.random());
		src.stop(t + dur + 0.1);
		return { src, f, g };
	}

	A.horn = function (kind) {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		const base = kind === 'sop' ? 220 : 330;
		const lp = A.ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 1800;
		lp.connect(A.master);
		for (let k = 0; k < 2; k++) {
			const st = t + k * 0.32;
			tone('square', base, st, 0.24, 0.08, lp);
			tone('square', base * 1.26, st, 0.24, 0.06, lp);
		}
	};

	A.honkTune = function () {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		const notes = [392, 392, 392, 523, 659, 392, 392, 392, 523, 659];
		const lp = A.ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 2000;
		lp.connect(A.master);
		notes.forEach((f, i) => {
			const st = t + i * 0.16 + (i >= 5 ? 0.25 : 0);
			tone('square', f, st, i === 4 || i === 9 ? 0.32 : 0.12, 0.07, lp);
		});
	};

	A.crash = function () {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		noise(t, 0.9, 'lowpass', 2500, 0.7);
		noise(t + 0.05, 0.5, 'highpass', 3000, 0.25);
		const o = A.ctx.createOscillator();
		const g = A.ctx.createGain();
		o.frequency.setValueAtTime(120, t);
		o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
		env(g, t, 0.005, 0.05, 0.4, 0.8);
		o.connect(g).connect(A.master);
		o.start(t); o.stop(t + 0.6);
		for (let i = 0; i < 5; i++) tone('triangle', 1500 + Math.random() * 2500, t + 0.1 + i * 0.07, 0.08, 0.05);
	};

	A.fart = function (long) {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		const dur = long ? 3.2 : 0.9;
		const o = A.ctx.createOscillator();
		o.type = 'sawtooth';
		o.frequency.setValueAtTime(95, t);
		for (let i = 0; i < dur * 12; i++) o.frequency.setValueAtTime(70 + Math.random() * 60, t + i / 12);
		o.frequency.exponentialRampToValueAtTime(45, t + dur);
		const lfo = A.ctx.createOscillator();
		lfo.frequency.value = 23;
		const lfoG = A.ctx.createGain();
		lfoG.gain.value = 0.35;
		const g = A.ctx.createGain();
		const lp = A.ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 600;
		lp.Q.value = 6;
		env(g, t, 0.05, dur - 0.3, 0.25, 0.5);
		lfo.connect(lfoG).connect(g.gain);
		o.connect(lp).connect(g).connect(A.master);
		o.start(t); lfo.start(t);
		o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
	};

	A.chop = function (vol) {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		noise(t, 0.08, 'bandpass', 1800, 0.5 * vol, 2);
		tone('sine', 190, t, 0.1, 0.35 * vol);
	};

	A.sputter = function () {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		for (let i = 0; i < 4; i++) {
			noise(t + i * 0.13 + Math.random() * 0.04, 0.09, 'lowpass', 500, 0.5);
			tone('sawtooth', 50 + Math.random() * 20, t + i * 0.13, 0.08, 0.15);
		}
		tone('triangle', 900, t, 0.25, 0.04);
	};

	A.pop = function () {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		noise(t, 0.12, 'lowpass', 900, 0.6);
	};

	A.flagRope = function () {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		for (let i = 0; i < 6; i++) {
			const o = A.ctx.createOscillator();
			const g = A.ctx.createGain();
			o.type = 'triangle';
			o.frequency.setValueAtTime(1200 + i * 60, t + i * 0.18);
			o.frequency.exponentialRampToValueAtTime(1700, t + i * 0.18 + 0.12);
			env(g, t + i * 0.18, 0.01, 0.06, 0.05, 0.03);
			o.connect(g).connect(A.master);
			o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.2);
		}
	};

	A.bell = function (bad) {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		if (bad) {
			tone('triangle', 330, t, 0.2, 0.12);
			tone('triangle', 247, t + 0.18, 0.35, 0.12);
		} else {
			tone('sine', 880, t, 0.35, 0.08);
			tone('sine', 1320, t + 0.08, 0.4, 0.05);
		}
	};

	A.success = function () {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		[523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, t + i * 0.09, 0.18, 0.09));
	};

	A.lifeLost = function () {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		[392, 330, 262, 196].forEach((f, i) => tone('square', f, t + i * 0.16, 0.2, 0.06));
	};

	A.splash = function (vol) {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		noise(t, 0.4, 'highpass', 1200, 0.4 * vol);
		noise(t, 0.25, 'lowpass', 400, 0.4 * vol);
	};

	A.flush = function () {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		const n = noise(t, 1.4, 'bandpass', 300, 0.5, 3);
		n.f.frequency.exponentialRampToValueAtTime(1500, t + 1.2);
	};

	A.chirp = function (vol) {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		const n = 2 + PG.randInt(3);
		const base = 2800 + Math.random() * 1500;
		for (let i = 0; i < n; i++) {
			const o = A.ctx.createOscillator();
			const g = A.ctx.createGain();
			const st = t + i * 0.11;
			o.frequency.setValueAtTime(base, st);
			o.frequency.exponentialRampToValueAtTime(base * 1.4, st + 0.06);
			env(g, st, 0.005, 0.03, 0.04, 0.025 * vol);
			o.connect(g).connect(A.master);
			o.start(st); o.stop(st + 0.12);
		}
	};

	A.cricket = function (vol) {
		if (!ok()) return;
		const t = A.ctx.currentTime;
		for (let i = 0; i < 3; i++) tone('sine', 4200, t + i * 0.05, 0.03, 0.012 * vol);
	};

	A.crackle = function (vol) {
		if (!ok()) return;
		noise(A.ctx.currentTime, 0.03, 'highpass', 2000 + Math.random() * 3000, 0.3 * vol);
	};

	// Continuous sounds (engine, pump). level 0 = silent.
	A.loop = function (name, level) {
		if (!ok()) return;
		let L = A.loops[name];
		if (!L) {
			if (level <= 0) return;
			L = A.loops[name] = makeLoop(name);
		}
		L.g.gain.setTargetAtTime(Math.max(0, level), A.ctx.currentTime, 0.1);
	};
	A.stopLoops = function () {
		for (const k in A.loops) A.loop(k, 0);
	};

	function makeLoop(name) {
		const g = A.ctx.createGain();
		g.gain.value = 0;
		g.connect(A.master);
		if (name === 'mower') {
			const o = A.ctx.createOscillator();
			o.type = 'sawtooth';
			o.frequency.value = 52;
			const lfo = A.ctx.createOscillator();
			lfo.frequency.value = 9;
			const lg = A.ctx.createGain();
			lg.gain.value = 6;
			lfo.connect(lg).connect(o.frequency);
			const lp = A.ctx.createBiquadFilter();
			lp.type = 'lowpass';
			lp.frequency.value = 700;
			o.connect(lp).connect(g);
			o.start(); lfo.start();
		} else if (name === 'pump') {
			const src = A.ctx.createBufferSource();
			src.buffer = A.noiseBuf;
			src.loop = true;
			const bp = A.ctx.createBiquadFilter();
			bp.type = 'bandpass';
			bp.frequency.value = 250;
			bp.Q.value = 2;
			const lfo = A.ctx.createOscillator();
			lfo.frequency.value = 3;
			const lg = A.ctx.createGain();
			lg.gain.value = 120;
			lfo.connect(lg).connect(bp.frequency);
			src.connect(bp).connect(g);
			src.start(); lfo.start();
		} else if (name === 'engine') {
			const o = A.ctx.createOscillator();
			o.type = 'sawtooth';
			o.frequency.value = 38;
			const lp = A.ctx.createBiquadFilter();
			lp.type = 'lowpass';
			lp.frequency.value = 300;
			o.connect(lp).connect(g);
			o.start();
		}
		return { g };
	}
})(window.PG);
