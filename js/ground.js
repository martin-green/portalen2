'use strict';
// Marktexturer (ritas på canvas och laddas upp som texturer): skogsbotten, vägar, sjöbotten,
// gräsmattan som rutnät med växande gräs samt hjulspår och fläckar.
(function (PG) {
	const W = PG.World;
	const PPM = 5;   // ground texture pixels per meter
	const MPPM = 3;  // marks texture pixels per meter
	const GC = 2;    // grass cell size in meters
	const G = (PG.Ground = { PPM, MPPM, GC, CART_LIMIT: 0.85, grassVersion: 0, marksVersion: 0 });

	let groundCv, grassCv, maskCv, marksCv;
	let gx0, gz0, gw, gh;
	let mask, len, stripe, seed;
	let grassTimer = 0, marksDirty = true, marksTimer = 0;
	G.marks = [];

	G.init = function () {
		const w = W.size.w, h = W.size.h;
		groundCv = makeCanvas(w * PPM, h * PPM);
		marksCv = makeCanvas(w * MPPM, h * MPPM);
		paintGround();
		initGrass();
		G.canvases = { ground: groundCv, grass: grassCv, marks: marksCv };
	};

	function makeCanvas(w, h) {
		const c = document.createElement('canvas');
		c.width = w; c.height = h;
		return c;
	}

	function polyPath(g, pts) {
		g.beginPath();
		g.moveTo(pts[0][0], pts[0][1]);
		for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
	}

	function strokePath(g, pts, width, color) {
		polyPath(g, pts);
		g.lineWidth = width;
		g.strokeStyle = color;
		g.lineCap = 'round';
		g.lineJoin = 'round';
		g.stroke();
	}

	function paintGround() {
		const g = groundCv.getContext('2d');
		const rnd = PG.mulberry32(7);
		g.scale(PPM, PPM);
		g.fillStyle = '#3a4a2c';
		g.fillRect(0, 0, W.size.w, W.size.h);
		for (let i = 0; i < 14000; i++) {
			const x = rnd() * W.size.w, z = rnd() * W.size.h;
			const r = 0.2 + rnd() * 1.5;
			g.fillStyle = ['rgba(70,58,34,0.35)', 'rgba(80,105,50,0.35)', 'rgba(28,38,22,0.4)', 'rgba(120,110,70,0.22)', 'rgba(95,120,60,0.3)'][i % 5];
			g.beginPath();
			g.arc(x, z, r, 0, Math.PI * 2);
			g.fill();
		}
		polyPath(g, W.lawn); g.closePath();
		g.fillStyle = '#56763a';
		g.fill();
		// Shore and lake bed
		polyPath(g, W.lake); g.closePath();
		g.lineWidth = 5;
		g.strokeStyle = '#b3a477';
		g.stroke();
		g.fillStyle = '#4b5a3c';
		g.fill();
		// Clearings
		const clear = (x, z, r, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, z, r, r * 0.8, 0, 0, Math.PI * 2); g.fill(); };
		clear(W.bastu.x + 1, W.bastu.z, 7.5, 'rgba(120,108,76,0.8)');
		clear(124, 49, 4.8, 'rgba(155,142,112,0.95)');
		clear(W.chopBlock.x, W.chopBlock.z, 3.4, 'rgba(150,120,80,0.85)');
		clear(W.flag.x, W.flag.z, 1.5, 'rgba(160,160,150,1)');
		clear(W.brunn.x, W.brunn.z, 3.6, 'rgba(125,120,104,0.8)');
		clear(W.dass.door.x, W.dass.door.z, 2.2, 'rgba(130,115,85,0.6)');
		// Roads
		for (const r of [W.roadOuter, W.roadInner]) {
			strokePath(g, r, 5.8, '#6f6450');
			strokePath(g, r, 5.0, '#a39579');
		}
		for (let i = 0; i < 7000; i++) {
			const pts = rnd() < 0.3 ? W.roadOuter : W.roadInner;
			const path = new PG.Path(pts);
			const p = path.at(rnd() * path.length);
			const off = (rnd() - 0.5) * 4.8;
			const nx = -Math.sin(p.heading), nz = Math.cos(p.heading);
			g.fillStyle = rnd() < 0.5 ? 'rgba(80,70,55,0.4)' : 'rgba(205,195,170,0.4)';
			g.fillRect(p.x + nx * off, p.z + nz * off, 0.22, 0.22);
		}
		// Grass strip in the middle of the inner gravel road
		strokePath(g, W.roadInner.slice(2, 8), 0.5, 'rgba(95,125,60,0.6)');
		for (const p of W.footpaths) {
			strokePath(g, p, 1.9, 'rgba(118,104,74,0.85)');
			strokePath(g, p, 1.1, 'rgba(150,132,98,0.7)');
		}
		g.fillStyle = '#8d8d86';
		g.fillRect(W.bins.x - 1.2, W.bins.z - 2.4, 2.4, 4.8);
	}

	// ---------- Grass ----------
	function initGrass() {
		let minx = 1e9, minz = 1e9, maxx = -1e9, maxz = -1e9;
		for (const p of W.lawn) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[1]); maxz = Math.max(maxz, p[1]); }
		gx0 = Math.floor(minx / GC) * GC; gz0 = Math.floor(minz / GC) * GC;
		gw = Math.ceil((maxx - gx0) / GC); gh = Math.ceil((maxz - gz0) / GC);
		const n = gw * gh;
		mask = new Uint8Array(n);
		len = new Float32Array(n);
		stripe = new Int8Array(n);
		seed = new Float32Array(n);
		const rnd = PG.mulberry32(3);
		for (let j = 0; j < gh; j++) {
			for (let i = 0; i < gw; i++) {
				const k = j * gw + i;
				const x = gx0 + (i + 0.5) * GC, z = gz0 + (j + 0.5) * GC;
				seed[k] = rnd();
				const ok = W.inLawn(x, z) && W.roadDist(x, z) > 2.6 && !W.inBuilding(x, z, 0.4) && !W.inStructure(x, z, 0.4) &&
					Math.hypot(x - W.flag.x, z - W.flag.z) > 1.2 && Math.hypot(x - W.brunn.x, z - W.brunn.z) > 3 &&
					!W.footpaths.some((p) => PG.distToPolyline(x, z, p) < 1.2);
				mask[k] = ok ? 1 : 0;
				const blob = 0.5 + 0.25 * Math.sin(x * 0.09 + 1) * Math.cos(z * 0.12) + 0.12 * Math.sin(x * 0.31 + z * 0.17);
				len[k] = PG.clamp(0.15 + blob * 0.55 + rnd() * 0.08, 0.05, 0.75);
				stripe[k] = 0;
			}
		}
		if (!grassCv) {
			grassCv = makeCanvas(gw * GC * PPM, gh * GC * PPM);
			maskCv = makeCanvas(gw * GC * PPM, gh * GC * PPM);
			paintMask();
		}
		G.grassInfo = { gx0, gz0, gw, gh, GC };
		G.grassArrays = { mask, len, seed, stripe };
		redrawGrass();
	}

	// Soft-edged alpha mask: lawn minus roads, paths and buildings.
	function paintMask() {
		const g = maskCv.getContext('2d');
		g.setTransform(PPM, 0, 0, PPM, -gx0 * PPM, -gz0 * PPM);
		polyPath(g, W.lawn); g.closePath();
		g.fillStyle = '#fff';
		g.fill();
		g.globalCompositeOperation = 'destination-out';
		for (const r of [W.roadOuter, W.roadInner]) strokePath(g, r, 5.0, '#000');
		for (const p of W.footpaths) strokePath(g, p, 1.6, '#000');
		g.fillStyle = '#000';
		for (const b of W.buildings) for (const r of b.rects) g.fillRect(r.x0 - 0.2, r.z0 - 0.2, r.x1 - r.x0 + 0.4, r.z1 - r.z0 + 0.4);
		g.fillRect(W.dass.x - W.dass.w / 2, W.dass.z - W.dass.d / 2, W.dass.w, W.dass.d);
		g.fillRect(W.vedbod.x - W.vedbod.w / 2, W.vedbod.z - W.vedbod.d / 2, W.vedbod.w, W.vedbod.d);
		g.beginPath(); g.arc(W.flag.x, W.flag.z, 1.3, 0, Math.PI * 2); g.fill();
		g.beginPath(); g.arc(W.brunn.x, W.brunn.z, 3.3, 0, Math.PI * 2); g.fill();
		g.globalCompositeOperation = 'source-over';
	}

	G.resetGrass = function () { initGrass(); };

	G.cellIndex = function (x, z) {
		const i = Math.floor((x - gx0) / GC), j = Math.floor((z - gz0) / GC);
		if (i < 0 || j < 0 || i >= gw || j >= gh) return -1;
		return j * gw + i;
	};
	G.grassAt = function (x, z) {
		const k = G.cellIndex(x, z);
		return k >= 0 && mask[k] ? len[k] : 0;
	};
	G.isLawnCell = function (x, z) {
		const k = G.cellIndex(x, z);
		return k >= 0 && mask[k] === 1;
	};

	G.grow = function (dh) {
		for (let k = 0; k < len.length; k++) {
			if (!mask[k]) continue;
			len[k] = Math.min(1.5, len[k] + dh * (0.85 + seed[k] * 0.3));
		}
	};

	G.cut = function (x, z, r, dir) {
		const i0 = Math.floor((x - r - gx0) / GC), i1 = Math.floor((x + r - gx0) / GC);
		const j0 = Math.floor((z - r - gz0) / GC), j1 = Math.floor((z + r - gz0) / GC);
		let cut = 0;
		const g = grassCv.getContext('2d');
		for (let j = Math.max(0, j0); j <= Math.min(gh - 1, j1); j++) {
			for (let i = Math.max(0, i0); i <= Math.min(gw - 1, i1); i++) {
				const k = j * gw + i;
				if (!mask[k]) continue;
				const cx = gx0 + (i + 0.5) * GC, cz = gz0 + (j + 0.5) * GC;
				if (Math.hypot(cx - x, cz - z) > r) continue;
				if (len[k] > 0.06) {
					cut += len[k];
					len[k] = 0.03;
					stripe[k] = dir;
					drawCell(g, i, j, true);
				}
			}
		}
		if (cut > 0) G.grassVersion++;
		return cut;
	};

	G.stats = function () {
		let sum = 0, n = 0, max = 0, tall = 0;
		for (let k = 0; k < len.length; k++) {
			if (!mask[k]) continue;
			sum += len[k]; n++;
			if (len[k] > max) max = len[k];
			if (len[k] > G.CART_LIMIT) tall++;
		}
		return { avg: n ? sum / n : 0, max, tallFrac: n ? tall / n : 0 };
	};

	// Mowing rows across the lawn (east-west), 4 m apart.
	G.mowRows = function () {
		const rows = [];
		let r = 0;
		for (let z = gz0 + 2; z < gz0 + gh * GC; z += 4, r++) {
			let start = null;
			for (let x = gx0; x <= gx0 + gw * GC; x += 1) {
				const ok = G.isLawnCell(x, z) && W.navKind(x, z) !== 0;
				if (ok && start === null) start = x;
				if ((!ok || x >= gx0 + gw * GC) && start !== null) {
					if (x - start >= 6) rows.push({ z, x0: start + 1, x1: x - 1, row: r });
					start = null;
				}
			}
		}
		return rows;
	};
	G.segmentAvg = function (s) {
		let sum = 0, n = 0;
		for (let x = s.x0; x <= s.x1; x += 2) {
			for (const dz of [-1.5, 0, 1.5]) {
				const k = G.cellIndex(x, s.z + dz);
				if (k >= 0 && mask[k]) { sum += len[k]; n++; }
			}
		}
		return n ? sum / n : 0;
	};

	const C0 = [150, 196, 92], C1 = [96, 150, 58], C2 = [70, 116, 42], C3 = [128, 128, 66];
	function grassColor(L, s, st) {
		let c;
		if (L < 0.4) c = PG.mixRgb(C0, C1, L / 0.4);
		else if (L < 0.9) c = PG.mixRgb(C1, C2, (L - 0.4) / 0.5);
		else c = PG.mixRgb(C2, C3, Math.min(1, (L - 0.9) / 0.6));
		const v = 1 + (s - 0.5) * 0.08 + (L < 0.5 ? st * 0.07 * (1 - L * 2) : 0);
		return [c[0] * v, c[1] * v, c[2] * v];
	}

	function drawCell(g, i, j, applyMask) {
		const k = j * gw + i;
		const sz = GC * PPM, px = i * sz, pz = j * sz;
		const L = len[k];
		const c = grassColor(L, seed[k], stripe[k]);
		if (applyMask) {
			// Single-cell update: clip to the cell, otherwise 'destination-in' below
			// wipes the whole canvas outside the drawn rect (unbounded compositing).
			g.save();
			g.beginPath();
			g.rect(px, pz, sz, sz);
			g.clip();
		}
		g.fillStyle = PG.rgbStr(c[0], c[1], c[2]);
		g.fillRect(px - 1, pz - 1, sz + 2, sz + 2);
		if (L > 0.5) {
			const r = PG.mulberry32((k * 7919) | 0);
			g.fillStyle = L > 0.95 ? 'rgba(70,95,40,0.35)' : 'rgba(60,100,40,0.25)';
			for (let t = 0; t < 4; t++) g.fillRect(px + r() * sz, pz + r() * sz, 2, 2);
			if (L > 1.0) {
				g.fillStyle = 'rgba(210,195,120,0.7)';
				for (let t = 0; t < 3; t++) g.fillRect(px + r() * sz, pz + r() * sz, 1.4, 1.4);
			}
		}
		if (applyMask) {
			g.globalCompositeOperation = 'destination-in';
			g.drawImage(maskCv, px, pz, sz, sz, px, pz, sz, sz);
			g.globalCompositeOperation = 'source-over';
			g.restore();
		}
	}

	function redrawGrass() {
		const g = grassCv.getContext('2d');
		g.clearRect(0, 0, grassCv.width, grassCv.height);
		for (let j = 0; j < gh; j++) {
			for (let i = 0; i < gw; i++) {
				// Paint unmasked neighbours too so the soft mask edge has grass under it.
				const k = j * gw + i;
				if (mask[k] || hasMaskedNeighbour(i, j)) {
					if (!mask[k]) len[k] = nearLen(i, j);
					drawCell(g, i, j, false);
				}
			}
		}
		g.globalCompositeOperation = 'destination-in';
		g.drawImage(maskCv, 0, 0);
		g.globalCompositeOperation = 'source-over';
		G.grassVersion++;
	}
	function hasMaskedNeighbour(i, j) {
		for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
			const a = i + di, b = j + dj;
			if (a >= 0 && b >= 0 && a < gw && b < gh && mask[b * gw + a]) return true;
		}
		return false;
	}
	function nearLen(i, j) {
		for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
			const a = i + di, b = j + dj;
			if (a >= 0 && b >= 0 && a < gw && b < gh && mask[b * gw + a]) return len[b * gw + a];
		}
		return 0.3;
	}

	// ---------- Marks (wheel ruts, stains) ----------
	G.addRut = function (x, z, ang, now) {
		G.marks.push({ t: 'rut', x, z, a: ang, born: now });
		marksDirty = true;
	};
	G.addStain = function (x, z, r, now) {
		G.marks.push({ t: 'stain', x, z, r, born: now, seed: Math.random() * 1000 });
		marksDirty = true;
	};
	G.clearMarks = function () { G.marks.length = 0; marksDirty = true; };

	function redrawMarks(now) {
		const g = marksCv.getContext('2d');
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, marksCv.width, marksCv.height);
		g.setTransform(MPPM, 0, 0, MPPM, 0, 0);
		const keep = [];
		for (const m of G.marks) {
			const age = now - m.born;
			const life = m.t === 'rut' ? 150 : 200;
			if (age > life) continue;
			keep.push(m);
			const a = 1 - age / life;
			if (m.t === 'rut') {
				const nx = -Math.sin(m.a), nz = Math.cos(m.a);
				g.fillStyle = `rgba(70,50,30,${0.6 * a})`;
				for (const side of [-1, 1]) {
					g.save();
					g.translate(m.x + nx * side * 0.95, m.z + nz * side * 0.95);
					g.rotate(m.a);
					g.fillRect(-0.5, -0.25, 1.0, 0.5);
					g.restore();
				}
			} else {
				const r = PG.mulberry32(m.seed | 0);
				g.fillStyle = `rgba(95,62,25,${0.8 * a})`;
				for (let i = 0; i < 7; i++) {
					g.beginPath();
					g.ellipse(m.x + (r() - 0.5) * m.r, m.z + (r() - 0.5) * m.r, m.r * (0.3 + r() * 0.4), m.r * (0.2 + r() * 0.3), r() * 3, 0, Math.PI * 2);
					g.fill();
				}
			}
		}
		const changed = keep.length !== G.marks.length;
		G.marks = keep;
		return changed;
	}

	G.update = function (dt, now) {
		marksTimer += dt;
		if (marksDirty || (marksTimer > 3 && G.marks.length)) {
			redrawMarks(now);
			marksTimer = 0;
			marksDirty = false;
			G.marksVersion++;
		}
		grassTimer += dt;
		if (grassTimer > 1.5) {
			grassTimer = 0;
			redrawGrass();
		}
	};
})(window.PG);
