'use strict';
// Portalen 2 – gemensamma hjälpfunktioner. Världskoordinater i meter: x österut, z söderut, h uppåt.
window.PG = window.PG || {};

(function (PG) {
	PG.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
	PG.lerp = (a, b, t) => a + (b - a) * t;
	PG.smooth = (t) => t * t * (3 - 2 * t);
	PG.rand = (a, b) => a + Math.random() * (b - a);
	PG.randInt = (n) => Math.floor(Math.random() * n);
	PG.choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
	PG.dist = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
	PG.angleLerp = (a, b, t) => {
		let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
		return a + d * t;
	};

	PG.mulberry32 = function (seed) {
		return function () {
			seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	};

	PG.pointInPoly = function (x, z, poly) {
		let inside = false;
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
			if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
		}
		return inside;
	};

	PG.distToSegment = function (px, pz, ax, az, bx, bz) {
		const dx = bx - ax, dz = bz - az;
		const l2 = dx * dx + dz * dz;
		let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
		t = PG.clamp(t, 0, 1);
		return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
	};

	PG.distToPolyline = function (px, pz, pts) {
		let best = Infinity;
		for (let i = 0; i < pts.length - 1; i++) {
			const d = PG.distToSegment(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
			if (d < best) best = d;
		}
		return best;
	};

	PG.distToPolyEdge = function (px, pz, poly) {
		let best = Infinity;
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const d = PG.distToSegment(px, pz, poly[j][0], poly[j][1], poly[i][0], poly[i][1]);
			if (d < best) best = d;
		}
		return best;
	};

	// Precomputed polyline for constant-speed travel.
	PG.Path = function (pts) {
		this.pts = pts;
		this.cum = [0];
		for (let i = 1; i < pts.length; i++) {
			this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
		}
		this.length = this.cum[this.cum.length - 1];
	};
	PG.Path.prototype.at = function (s) {
		const pts = this.pts, cum = this.cum;
		s = PG.clamp(s, 0, this.length);
		let i = 1;
		while (i < cum.length - 1 && cum[i] < s) i++;
		const seg = cum[i] - cum[i - 1] || 1;
		const t = (s - cum[i - 1]) / seg;
		const a = pts[i - 1], b = pts[i];
		return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, heading: Math.atan2(b[1] - a[1], b[0] - a[0]) };
	};
	PG.Path.prototype.reversed = function () {
		return new PG.Path(this.pts.slice().reverse());
	};
	PG.Path.prototype.closestS = function (x, z) {
		let bestS = 0, bestD = Infinity;
		for (let i = 0; i < this.pts.length - 1; i++) {
			const a = this.pts[i], b = this.pts[i + 1];
			const dx = b[0] - a[0], dz = b[1] - a[1];
			const l2 = dx * dx + dz * dz || 1;
			const t = PG.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1);
			const d = Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz));
			if (d < bestD) { bestD = d; bestS = this.cum[i] + t * Math.sqrt(l2); }
		}
		return bestS;
	};

	PG.hex2rgb = function (hex) {
		if (Array.isArray(hex)) return hex;
		const h = hex.replace('#', '');
		const v = h.length === 3 ? h.split('').map((c) => parseInt(c + c, 16)) : [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
		return v;
	};
	PG.rgbStr = (r, g, b, a) =>
		a === undefined ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`;
	PG.mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

	PG.fmtTime = function (hours) {
		const h = Math.floor(hours) % 24;
		const m = Math.floor((hours - Math.floor(hours)) * 60);
		return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
	};

	// Minimal binary heap for A*.
	PG.Heap = function () { this.items = []; };
	PG.Heap.prototype.push = function (node, pri) {
		const a = this.items;
		a.push([pri, node]);
		let i = a.length - 1;
		while (i > 0) {
			const p = (i - 1) >> 1;
			if (a[p][0] <= a[i][0]) break;
			[a[p], a[i]] = [a[i], a[p]];
			i = p;
		}
	};
	PG.Heap.prototype.pop = function () {
		const a = this.items;
		const top = a[0];
		const last = a.pop();
		if (a.length > 0) {
			a[0] = last;
			let i = 0;
			for (;;) {
				const l = i * 2 + 1, r = l + 1;
				let m = i;
				if (l < a.length && a[l][0] < a[m][0]) m = l;
				if (r < a.length && a[r][0] < a[m][0]) m = r;
				if (m === i) break;
				[a[m], a[i]] = [a[i], a[m]];
				i = m;
			}
		}
		return top[1];
	};
	PG.Heap.prototype.size = function () { return this.items.length; };
})(window.PG);
