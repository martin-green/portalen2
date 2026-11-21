'use strict';
// Kartdata för Härsjösand (meter, tolkat från satellitbilden: 10 px = 1 m) samt vägfinning.
(function (PG) {
	const W = (PG.World = {});

	W.size = { w: 290, h: 190 };

	W.lawn = [
		[41, 58], [64, 55], [77, 62], [87.5, 64], [98, 62], [111, 59], [117, 50], [119, 34], [124, 27], [134, 25.5],
		[146, 27], [157, 30], [165, 39], [180, 41], [192, 45], [194, 62], [193, 77], [190.5, 85], [180, 89],
		[167, 89], [154.5, 90], [149, 101], [145, 108], [134, 107], [121, 106], [108, 103], [98, 98],
		[87.5, 85], [77, 85], [62, 103], [51.5, 100], [41, 95], [38.6, 77],
	];

	W.lake = [
		[300, 38], [283, 40], [268, 52], [247, 62], [237, 75], [233, 85], [232, 103], [227, 113], [224, 121],
		[225, 134], [227, 144], [221, 154], [218, 171], [216, 200], [300, 200],
	];

	W.roadOuter = [[163, 195], [161, 165], [158, 148], [155.5, 138], [154.5, 132]];
	W.roadInner = [
		[154.5, 132], [153.5, 127.5], [151, 122], [150, 114], [148, 104], [145, 93], [142.5, 80], [140.5, 71],
		[134, 67.5], [126, 66], [121.5, 61], [121.5, 53], [124, 49],
	];
	W.footpaths = [
		[[192, 81], [197, 92], [204, 104], [210.5, 113], [214, 116]],
		[[214, 116], [222, 116]],
		[[140, 53], [142, 46], [141, 36], [138, 29.5], [133, 28], [131, 25]],
	];
	// Sopbilens tur på gräsmattan när portalen står öppen.
	W.joyride = [
		[154.5, 132], [153.5, 127.5], [151, 122], [150, 114], [148, 104], [145, 93], [152, 86], [164, 82],
		[176, 76], [182, 66], [176, 57], [163, 60], [156, 70], [150, 82], [146, 94], [148, 104], [150, 114],
		[151, 122], [153.5, 127.5], [154.5, 132],
	];

	W.portal = { x: 154.5, z: 132, half: 3.0 };
	W.brunn = { x: 135.5, z: 50.5 };
	W.flag = { x: 168, z: 69 };
	W.bastu = { x: 213, z: 116, w: 5, d: 4 };
	W.jetty = { x0: 222, x1: 236, z: 116 };
	W.dass = { x: 149.7, z: 37.75, w: 5, d: 8.9, door: { x: 145.6, z: 37.75 } };
	W.vedbod = { x: 127, z: 21.5, w: 6, d: 13 };
	W.chopBlock = { x: 132.2, z: 22.5 };
	W.bins = { x: 159.8, z: 136.5 };
	W.canoeRack = { x: 230.5, z: 63 };
	W.mowerHome = { x: 156, z: 39.5 };
	W.lamps = [[158.6, 130.6], [150.5, 67], [208.5, 113]];
	W.fences = [[[139, 132], [150.9, 132]], [[158.1, 132], [171, 132]]];
	W.lawnTrees = [[185, 76, 0], [118, 97, 8], [104, 95, 9], [92, 87, 6], [70, 70, 8], [189, 50, 9]];

	// cx, cz, w (x), d (z), wall height, ridge height, ridge axis, wall, roof. Names from hsandkarta.png, looks from photos.
	// Optional: parts (several volumes), walls (per side: door, windows, recess), chimneys [x, z, color, size], tiles, plinth.
	W.buildings = [
		{
			id: 'ladan', name: 'Ladan', cx: 139, cz: 59, w: 21, d: 11, hw: 3.2, hr: 6.6, ridge: 'x', wall: '#8e2b1f', roof: '#b4532f', tiles: true,
			chimneys: [[1.5, 0, '#8a3a2a'], [-9.2, 0, '#e8e4da', 0.32]],
			walls: { s: { door: 10.5, doorC: '#ebe6da', windows: [{ u: 2.8 }, { u: 5.5 }, { u: 15.5 }, { u: 18.2 }] }, e: { windows: [{ u: 3.2 }, { u: 6.6 }] } },
		},
		{ id: 'verktyg', name: 'Verktygsboden', cx: 131.9, cz: 38.2, w: 11, d: 10, hw: 3.4, hr: 6.2, ridge: 'x', wall: '#8e2b1f', roof: '#2d2d33', chimney: true },
		{
			id: 'lillstugan', name: 'Lillstugan', cx: 172, cz: 48.5, w: 12, d: 8, hw: 3.0, hr: 5.2, ridge: 'x', wall: '#8e2b1f', roof: '#b4532f', tiles: true,
			plinth: '#e6e2d8', plinthH: 0.65, chimneys: [[0.8, 0, '#55524c', 0.22]],
			walls: { s: { door: 9.8, doorW: 0.95, doorC: '#a7835a', recess: [8.3, 12], windows: [{ u: 3.4, w: 0.8 }, { u: 6.2, w: 1.6 }] } },
		},
		{
			id: 'kanot', name: 'Kanotförrådet', cx: 220, cz: 62, w: 11.5, d: 16, hw: 3.4, hr: 6.6, ridge: 'z', wall: '#8e2b1f', roof: '#6b3326', noWindows: true,
			walls: { s: { door: 5.75, doorW: 3.4, doorH: 2.8, doorC: '#7a2318' } },
		},
		{
			id: 'storstugan', name: 'Storstugan', cx: 160, cz: 95, w: 9.5, d: 15, hw: 4.0, hr: 7.9, ridge: 'z', wall: '#8e2b1f', roof: '#5a2e24', tiles: true,
			parts: [
				{ dx: -2.45, dz: -0.75, w: 4.6, d: 13.5, hw: 3.6, hr: 6.8, ridge: 'z', walls: { s: { door: 3.3, windows: [{ u: 1.2 }] } } },
				{ dx: 2.3, dz: 0, w: 4.9, d: 15, hw: 4.2, hr: 7.9, ridge: 'z', walls: { s: { door: false } } },
			],
		},
		{ id: 'uthuset', name: 'Uthuset', cx: 161, cz: 105.5, w: 7.5, d: 4, hw: 2.6, hr: 4.0, ridge: 'x', wall: '#7a3a24', roof: '#3a3a3a' },
		{ id: 'garaget', name: 'Garaget', cx: 142.5, cz: 125.3, w: 9.4, d: 10.5, hw: 3.2, hr: 6.0, ridge: 'z', wall: '#9b2c20', roof: '#6e3a2c' },
		{ id: 'garageboden', name: 'Garageboden', cx: 140.5, cz: 117.3, w: 7, d: 5.5, hw: 2.6, hr: 4.2, ridge: 'x', wall: '#7a3a24', roof: '#2e2e30' },
	];
	W.sleepHouses = ['ladan', 'lillstugan', 'storstugan'];

	W.doorOf = function (b) {
		if (b.ridge === 'x') return { x: b.cx, z: b.cz + b.d / 2 + 1.2 };
		return { x: b.cx, z: b.cz + b.d / 2 + 1.2 };
	};
	W.building = (id) => W.buildings.find((b) => b.id === id);

	W.inLawn = (x, z) => PG.pointInPoly(x, z, W.lawn);
	W.inLake = (x, z) => PG.pointInPoly(x, z, W.lake);
	W.roadDist = (x, z) => Math.min(PG.distToPolyline(x, z, W.roadOuter), PG.distToPolyline(x, z, W.roadInner));
	W.inBuilding = function (x, z, m) {
		m = m || 0;
		for (const b of W.buildings) {
			if (Math.abs(x - b.cx) < b.w / 2 + m && Math.abs(z - b.cz) < b.d / 2 + m) return b;
		}
		return null;
	};
	function inRect(x, z, cx, cz, w, d, m) {
		return Math.abs(x - cx) < w / 2 + m && Math.abs(z - cz) < d / 2 + m;
	}
	W.inStructure = function (x, z, m) {
		if (inRect(x, z, W.bastu.x, W.bastu.z, W.bastu.w, W.bastu.d, m)) return true;
		if (inRect(x, z, W.vedbod.x, W.vedbod.z, W.vedbod.w, W.vedbod.d, m)) return true;
		if (inRect(x, z, W.dass.x, W.dass.z, W.dass.w, W.dass.d, m)) return true;
		return false;
	};

	// ---------- Trees ----------
	W.trees = [];
	W.generateTrees = function () {
		const rnd = PG.mulberry32(1997);
		const S = 5.2;
		const near = (x, z, px, pz, r) => Math.hypot(x - px, z - pz) < r;
		for (let gz = -20; gz < 205; gz += S) {
			for (let gx = -20; gx < 310; gx += S) {
				const x = gx + (rnd() - 0.5) * S * 0.9;
				const z = gz + (rnd() - 0.5) * S * 0.9;
				if (W.inLake(x, z)) continue;
				const lawnEdge = PG.distToPolyEdge(x, z, W.lawn);
				if (W.inLawn(x, z)) continue;
				if (lawnEdge < 2.5 && rnd() < 0.7) continue;
				if (W.roadDist(x, z) < 4.5) continue;
				let onPath = false;
				for (const p of W.footpaths) if (PG.distToPolyline(x, z, p) < 2.6) onPath = true;
				if (onPath) continue;
				if (W.inBuilding(x, z, 3.5) || W.inStructure(x, z, 4)) continue;
				if (near(x, z, W.bastu.x, W.bastu.z, 8) || near(x, z, W.portal.x, W.portal.z, 7) || near(x, z, W.bins.x, W.bins.z, 4)) continue;
				if (near(x, z, W.brunn.x, W.brunn.z, 6) || near(x, z, W.chopBlock.x, W.chopBlock.z, 5)) continue;
				if (near(x, z, W.canoeRack.x, W.canoeRack.z, 5.5)) continue;
				// Shore line clearing by the sauna and the jetty.
				if (x > 205 && x < 232 && z > 106 && z < 126) continue;
				let v;
				const r = rnd();
				if (lawnEdge < 12 && r < 0.3) v = 8 + (rnd() < 0.5 ? 0 : 1);
				else if (r < 0.08) v = 6 + (rnd() < 0.5 ? 0 : 1);
				else v = Math.floor(rnd() * 6);
				W.trees.push({ x, z, v, s: 0.8 + rnd() * 0.35 });
			}
		}
		for (const t of W.lawnTrees) W.trees.push({ x: t[0], z: t[1], v: t[2], s: 1.05 });
	};

	// ---------- Navigation grid ----------
	const C = 2;
	const NAV = (W.nav = { C, gw: Math.ceil(W.size.w / C), gh: Math.ceil(W.size.h / C), cost: null, kind: null });
	// kind: 0 blocked, 1 road/path, 2 lawn, 3 forest
	W.buildNav = function () {
		const n = NAV.gw * NAV.gh;
		NAV.kind = new Uint8Array(n);
		for (let j = 0; j < NAV.gh; j++) {
			for (let i = 0; i < NAV.gw; i++) {
				const x = (i + 0.5) * C, z = (j + 0.5) * C;
				let k = 3;
				if (W.inLake(x, z) && !(z > 114.5 && z < 117.5 && x < W.jetty.x1)) k = 0;
				else if (W.inBuilding(x, z, 0.6) || W.inStructure(x, z, 0.3)) k = 0;
				else if (W.roadDist(x, z) < 2.6) k = 1;
				else {
					let fp = false;
					for (const p of W.footpaths) if (PG.distToPolyline(x, z, p) < 1.4) fp = true;
					if (fp) k = 1;
					else if (W.inLawn(x, z)) k = 2;
				}
				for (const f of W.fences) {
					if (Math.abs(z - f[0][1]) < 1.0 && x > f[0][0] && x < f[1][0]) k = 0;
				}
				NAV.kind[j * NAV.gw + i] = k;
			}
		}
	};

	W.navKind = function (x, z) {
		const i = Math.floor(x / C), j = Math.floor(z / C);
		if (i < 0 || j < 0 || i >= NAV.gw || j >= NAV.gh) return 0;
		return NAV.kind[j * NAV.gw + i];
	};

	// opt.cart: wheelbarrow – forest is blocked and tall grass is expensive.
	function cellCost(idx, x, z, opt) {
		const k = NAV.kind[idx];
		if (k === 0) return -1;
		if (k === 1) return 1;
		if (k === 2) {
			if (opt && opt.cart) {
				const L = PG.Ground ? PG.Ground.grassAt(x, z) : 0;
				return L > PG.Ground.CART_LIMIT ? 40 : 1.1 + L * 0.5;
			}
			return 1.2;
		}
		return opt && opt.cart ? -1 : 2.6;
	}

	function nearestOpen(i, j, opt) {
		for (let r = 0; r < 8; r++) {
			for (let dj = -r; dj <= r; dj++) {
				for (let di = -r; di <= r; di++) {
					const a = i + di, b = j + dj;
					if (a < 0 || b < 0 || a >= NAV.gw || b >= NAV.gh) continue;
					if (cellCost(b * NAV.gw + a, (a + 0.5) * C, (b + 0.5) * C, opt) > 0) return [a, b];
				}
			}
		}
		return [i, j];
	}

	W.findPath = function (sx, sz, tx, tz, opt) {
		const gw = NAV.gw, gh = NAV.gh;
		let [si, sj] = nearestOpen(PG.clamp(Math.floor(sx / C), 0, gw - 1), PG.clamp(Math.floor(sz / C), 0, gh - 1), opt);
		let [ti, tj] = nearestOpen(PG.clamp(Math.floor(tx / C), 0, gw - 1), PG.clamp(Math.floor(tz / C), 0, gh - 1), opt);
		const start = sj * gw + si, goal = tj * gw + ti;
		const g = new Float32Array(gw * gh).fill(Infinity);
		const from = new Int32Array(gw * gh).fill(-1);
		const closed = new Uint8Array(gw * gh);
		const heap = new PG.Heap();
		g[start] = 0;
		heap.push(start, 0);
		const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
		let found = false;
		let iter = 0;
		while (heap.size() > 0 && iter++ < 20000) {
			const cur = heap.pop();
			if (closed[cur]) continue;
			if (cur === goal) { found = true; break; }
			closed[cur] = 1;
			const ci = cur % gw, cj = (cur / gw) | 0;
			for (const d of dirs) {
				const ni = ci + d[0], nj = cj + d[1];
				if (ni < 0 || nj < 0 || ni >= gw || nj >= gh) continue;
				const nidx = nj * gw + ni;
				if (closed[nidx]) continue;
				const cc = cellCost(nidx, (ni + 0.5) * C, (nj + 0.5) * C, opt);
				if (cc < 0) continue;
				if (d[2] > 1) {
					if (cellCost(cj * gw + ni, (ni + 0.5) * C, (cj + 0.5) * C, opt) < 0) continue;
					if (cellCost(nj * gw + ci, (ci + 0.5) * C, (nj + 0.5) * C, opt) < 0) continue;
				}
				const ng = g[cur] + cc * d[2] * C;
				if (ng < g[nidx]) {
					g[nidx] = ng;
					from[nidx] = cur;
					const hx = Math.abs(ni - ti), hz = Math.abs(nj - tj);
					heap.push(nidx, ng + (Math.max(hx, hz) + 0.414 * Math.min(hx, hz)) * C);
				}
			}
		}
		if (!found) return [[sx, sz], [tx, tz]];
		const cells = [];
		for (let c = goal; c !== -1; c = from[c]) cells.push(c);
		cells.reverse();
		const pts = cells.map((c) => [((c % gw) + 0.5) * C, (((c / gw) | 0) + 0.5) * C]);
		pts[0] = [sx, sz];
		pts.push([tx, tz]);
		return smoothPath(pts, opt);
	};

	function losOk(a, b, maxCost, opt) {
		const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
		const n = Math.ceil(d / (C * 0.5));
		for (let s = 1; s < n; s++) {
			const x = a[0] + ((b[0] - a[0]) * s) / n, z = a[1] + ((b[1] - a[1]) * s) / n;
			const i = Math.floor(x / C), j = Math.floor(z / C);
			if (i < 0 || j < 0 || i >= NAV.gw || j >= NAV.gh) return false;
			const c = cellCost(j * NAV.gw + i, x, z, opt);
			if (c < 0 || c > maxCost) return false;
		}
		return true;
	}

	function smoothPath(pts, opt) {
		if (pts.length <= 2) return pts;
		const out = [pts[0]];
		let i = 0;
		while (i < pts.length - 1) {
			let j = pts.length - 1;
			const costAt = (p) => {
				const ii = Math.floor(p[0] / C), jj = Math.floor(p[1] / C);
				if (ii < 0 || jj < 0 || ii >= NAV.gw || jj >= NAV.gh) return 3;
				return Math.max(1.3, cellCost(jj * NAV.gw + ii, p[0], p[1], opt));
			};
			while (j > i + 1) {
				const maxCost = Math.max(costAt(pts[i]), costAt(pts[j]));
				if (losOk(pts[i], pts[j], maxCost, opt)) break;
				j--;
			}
			out.push(pts[j]);
			i = j;
		}
		return out;
	}
})(window.PG);
