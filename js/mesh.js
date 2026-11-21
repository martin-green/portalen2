'use strict';
// Renderer-agnostic geometry builders (faces) and time-of-day lighting. World: x east, z south, h up.
(function (PG) {
	const Light = (PG.Light = {
		sun: [0, 0.5, 0.8], alt: 0.8, day: 1, golden: 0, windows: 0,
		sunColor: [1, 1, 1], sunIntensity: 2.5, hemiSky: [0.6, 0.7, 0.9], hemiGround: [0.3, 0.3, 0.2], hemiIntensity: 1,
		skyTop: [0.3, 0.5, 0.85], skyHorizon: [0.75, 0.85, 0.95], lightDir: [0, 0.5, 0.8],
		setTime(hours) {
			const az = ((hours - 13) / 12) * Math.PI;
			const altDeg = 52 * Math.sin((Math.PI * (hours - 4)) / 18);
			const alt = (altDeg * Math.PI) / 180;
			const ca = Math.cos(alt);
			this.sun = [-Math.sin(az) * ca, Math.cos(az) * ca, Math.sin(alt)];
			this.alt = alt;
			const day = PG.clamp((altDeg + 5) / 15, 0, 1);
			this.day = day;
			const golden = PG.clamp(1 - altDeg / 20, 0, 1) * day;
			this.golden = golden;
			const sunUp = PG.clamp(altDeg / 6, 0, 1);
			if (sunUp > 0.02) {
				this.lightDir = this.sun.slice();
				this.sunColor = PG.mixRgb([1, 0.96, 0.9], [1, 0.58, 0.32], golden);
				this.sunIntensity = 2.6 * sunUp;
			} else {
				// Moonlight from the south-west.
				this.lightDir = [-0.35, 0.55, 0.76];
				this.sunColor = [0.6, 0.7, 1.0];
				this.sunIntensity = 0.9 * (1 - day);
			}
			const nightSky = [0.02, 0.035, 0.09], nightHor = [0.05, 0.08, 0.16];
			const daySky = [0.27, 0.5, 0.86], dayHor = [0.72, 0.84, 0.95];
			const sunsetHor = [1.0, 0.6, 0.36], sunsetSky = [0.35, 0.42, 0.7];
			this.skyTop = PG.mixRgb(nightSky, PG.mixRgb(daySky, sunsetSky, golden * 0.7), day);
			this.skyHorizon = PG.mixRgb(nightHor, PG.mixRgb(dayHor, sunsetHor, golden), day);
			this.hemiSky = PG.mixRgb([0.34, 0.42, 0.7], PG.mixRgb([0.62, 0.72, 0.92], [0.85, 0.65, 0.6], golden * 0.6), day);
			this.hemiGround = PG.mixRgb([0.1, 0.12, 0.16], [0.32, 0.3, 0.2], day);
			this.hemiIntensity = PG.lerp(0.95, 1.25, day);
			const hm = hours % 24;
			this.windows = PG.clamp((1 - day) * 1.6, 0, 1) * (hm > 17 || hm < 1.5 || (hm > 5 && hm < 7.5) ? 1 : 0.15);
		},
	});

	// ---------- Face builders. Face: { p:[[x,z,h]...], c:[r,g,b] (sRGB 0-255), n:[nx,nz,nh] } ----------
	const M = (PG.Mesh = {});
	function norm(v) {
		const l = Math.hypot(v[0], v[1], v[2]) || 1;
		return [v[0] / l, v[1] / l, v[2] / l];
	}
	M.norm = norm;

	// Wall quads ordered top-left, top-right, bottom-right, bottom-left as seen from outside.
	M.box = function (x0, z0, h0, x1, z1, h1, c, opt) {
		opt = opt || {};
		const C = PG.hex2rgb(c);
		const f = [];
		if (!opt.noTop) f.push({ p: [[x0, z0, h1], [x1, z0, h1], [x1, z1, h1], [x0, z1, h1]], c: opt.top ? PG.hex2rgb(opt.top) : C, n: [0, 0, 1], side: 't' });
		f.push({ p: [[x0, z1, h1], [x1, z1, h1], [x1, z1, h0], [x0, z1, h0]], c: C, n: [0, 1, 0], side: 's' });
		f.push({ p: [[x1, z0, h1], [x0, z0, h1], [x0, z0, h0], [x1, z0, h0]], c: C, n: [0, -1, 0], side: 'n' });
		f.push({ p: [[x1, z1, h1], [x1, z0, h1], [x1, z0, h0], [x1, z1, h0]], c: C, n: [1, 0, 0], side: 'e' });
		f.push({ p: [[x0, z0, h1], [x0, z1, h1], [x0, z1, h0], [x0, z0, h0]], c: C, n: [-1, 0, 0], side: 'w' });
		if (opt.bottom) f.push({ p: [[x0, z1, h0], [x1, z1, h0], [x1, z0, h0], [x0, z0, h0]], c: C, n: [0, 0, -1], side: 'b' });
		return f;
	};

	// Gable roof over the rectangle. ridge 'x' = ridge runs east-west.
	M.gable = function (x0, z0, x1, z1, hw, hr, ridge, roofC, wallC, oh) {
		oh = oh === undefined ? 0.5 : oh;
		const R = PG.hex2rgb(roofC), W = PG.hex2rgb(wallC);
		const f = [];
		if (ridge === 'x') {
			const zm = (z0 + z1) / 2, half = (z1 - z0) / 2, dh = hr - hw;
			const drop = (dh / half) * oh;
			const ns = norm([0, dh, half]), nn = norm([0, -dh, half]);
			f.push({ p: [[x0 - oh, zm, hr], [x1 + oh, zm, hr], [x1 + oh, z1 + oh, hw - drop], [x0 - oh, z1 + oh, hw - drop]], c: R, n: ns, roof: true });
			f.push({ p: [[x1 + oh, zm, hr], [x0 - oh, zm, hr], [x0 - oh, z0 - oh, hw - drop], [x1 + oh, z0 - oh, hw - drop]], c: R, n: nn, roof: true });
			f.push({ p: [[x1, z1, hw], [x1, zm, hr], [x1, z0, hw]], c: W, n: [1, 0, 0] });
			f.push({ p: [[x0, z0, hw], [x0, zm, hr], [x0, z1, hw]], c: W, n: [-1, 0, 0] });
		} else {
			const xm = (x0 + x1) / 2, half = (x1 - x0) / 2, dh = hr - hw;
			const drop = (dh / half) * oh;
			const ne = norm([dh, 0, half]), nw = norm([-dh, 0, half]);
			f.push({ p: [[xm, z1 + oh, hr], [xm, z0 - oh, hr], [x1 + oh, z0 - oh, hw - drop], [x1 + oh, z1 + oh, hw - drop]], c: R, n: ne, roof: true });
			f.push({ p: [[xm, z0 - oh, hr], [xm, z1 + oh, hr], [x0 - oh, z1 + oh, hw - drop], [x0 - oh, z0 - oh, hw - drop]], c: R, n: nw, roof: true });
			f.push({ p: [[x0, z1, hw], [xm, z1, hr], [x1, z1, hw]], c: W, n: [0, 1, 0] });
			f.push({ p: [[x1, z0, hw], [xm, z0, hr], [x0, z0, hw]], c: W, n: [0, -1, 0] });
		}
		return f;
	};

	// Single-slope roof, high edge at z0 and low edge at z1.
	M.shedRoof = function (x0, z0, x1, z1, hLow, hHigh, c, oh) {
		oh = oh || 0.3;
		const C = PG.hex2rgb(c);
		const n = norm([0, hHigh - hLow, z1 - z0]);
		return [{ p: [[x0 - oh, z0 - oh, hHigh], [x1 + oh, z0 - oh, hHigh], [x1 + oh, z1 + oh, hLow], [x0 - oh, z1 + oh, hLow]], c: C, n, roof: true }];
	};

	M.cylinder = function (cx, cz, h0, h1, r, sides, c, opt) {
		opt = opt || {};
		const C = PG.hex2rgb(c);
		const f = [];
		const top = [];
		for (let i = 0; i < sides; i++) {
			const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
			const am = (a0 + a1) / 2;
			f.push({
				p: [[cx + Math.cos(a0) * r, cz + Math.sin(a0) * r, h1], [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r, h1], [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r, h0], [cx + Math.cos(a0) * r, cz + Math.sin(a0) * r, h0]],
				c: C, n: [Math.cos(am), Math.sin(am), 0],
			});
			top.push([cx + Math.cos(a0) * r, cz + Math.sin(a0) * r, h1]);
		}
		if (!opt.noTop) f.push({ p: top, c: opt.top ? PG.hex2rgb(opt.top) : C, n: [0, 0, 1], side: 't' });
		return f;
	};

	// Horizontal cylinder along x (tanks, logs).
	M.hcylinder = function (x0, x1, cz, ch, r, sides, c, capC) {
		const C = PG.hex2rgb(c), CC = PG.hex2rgb(capC || c);
		const f = [];
		const ring = (x) => {
			const pts = [];
			for (let i = 0; i < sides; i++) {
				const a = (i / sides) * Math.PI * 2;
				pts.push([x, cz + Math.cos(a) * r, ch + Math.sin(a) * r]);
			}
			return pts;
		};
		const A = ring(x0), B = ring(x1);
		for (let i = 0; i < sides; i++) {
			const j = (i + 1) % sides;
			const am = ((i + 0.5) / sides) * Math.PI * 2;
			f.push({ p: [A[i], B[i], B[j], A[j]], c: C, n: [0, Math.cos(am), Math.sin(am)] });
		}
		f.push({ p: B.slice(), c: CC, n: [1, 0, 0] });
		f.push({ p: A.slice().reverse(), c: CC, n: [-1, 0, 0] });
		return f;
	};

	M.cone = function (cx, cz, h0, h1, r, sides, c, phase) {
		const C = PG.hex2rgb(c);
		const f = [];
		const slope = r / (h1 - h0);
		const ph = phase || 0;
		for (let i = 0; i < sides; i++) {
			const a0 = (i / sides) * Math.PI * 2 + ph, a1 = ((i + 1) / sides) * Math.PI * 2 + ph, am = (a0 + a1) / 2;
			f.push({
				p: [[cx, cz, h1], [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r, h0], [cx + Math.cos(a0) * r, cz + Math.sin(a0) * r, h0]],
				c: C, n: norm([Math.cos(am), Math.sin(am), slope]),
			});
		}
		f.push({ p: Array.from({ length: sides }, (_, i) => { const a = (i / sides) * Math.PI * 2 + ph; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r, h0]; }), c: C, n: [0, 0, -1] });
		return f;
	};

	// Decal on a quad face: rectangle (u0,v0)-(u1,v1) in meters from the top-left corner.
	M.decal = function (face, u0, v0, u1, v1, c, kind) {
		const p0 = face.p[0], p1 = face.p[1], p3 = face.p[3];
		const U = norm([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]);
		const V = norm([p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]]);
		const n = face.n;
		const o = 0.02 + (face.decals ? face.decals.length : 0) * 0.008;
		const P = (u, v) => [p0[0] + U[0] * u + V[0] * v + n[0] * o, p0[1] + U[1] * u + V[1] * v + n[1] * o, p0[2] + U[2] * u + V[2] * v + n[2] * o];
		(face.decals = face.decals || []).push({ p: [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], c: PG.hex2rgb(c), n, kind });
		return face;
	};

	M.faceSize = function (face) {
		const p0 = face.p[0], p1 = face.p[1], p3 = face.p[3];
		return [Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]), Math.hypot(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2])];
	};

	M.translate = function (faces, dx, dz, dh) {
		for (const f of faces) {
			for (const p of f.p) { p[0] += dx; p[1] += dz; p[2] += dh; }
			if (f.decals) for (const d of f.decals) for (const p of d.p) { p[0] += dx; p[1] += dz; p[2] += dh; }
		}
		return faces;
	};
})(window.PG);
