'use strict';
// Kartdata för Härsjösand (meter, tolkat från satellitbilden: 10 px = 1 m) samt vägfinning.
(function (PG) {
	const W = (PG.World = {});

	W.size = { w: 290, h: 190 };

	W.lawn = [
		[41, 58], [64, 55], [77, 62], [87.5, 64], [98, 62], [111, 59], [117, 50], [119, 34], [124, 27], [134, 25.5],
		[146, 27], [157, 30], [165, 39], [180, 41], [192, 45], [194, 62], [193, 77], [190.5, 85], [181, 90],
		[174.5, 93.5], [173.5, 99], [173.5, 104], [168, 106.6], [161, 107.2], [152, 107.6], [146, 108], [134, 107],
		[121, 106], [108, 103], [98, 98], [87.5, 85], [77, 85], [62, 103], [51.5, 100], [41, 95], [38.6, 77],
	];

	// Stora Härsjön. W.lake is the part inside the map; W.lakeFar is the whole lake out to the horizon.
	W.lake = [
		[300, 38], [283, 40], [268, 52], [247, 62], [237, 75], [233, 85], [232, 103], [227, 113], [224, 121],
		[225, 134], [227, 144], [221, 154], [218, 171], [216, 200], [300, 200],
	];
	W.lakeFar = [[900, -300], [330, -300], [300, 38]].concat(W.lake.slice(1, 14), [[232, 600], [900, 600]]);
	// Boktjärn, väster om lägergården (från hsandkarta.png, skala 0,3 m/px med Ladan som fixpunkt).
	// Utanför satellitbildens västkant, där bilden bara visar skog.
	W.boktjarn = [
		[-130, 50], [-100, 44], [-76, 49], [-62, 70], [-53, 88], [-44, 74], [-28, 55], [-13, 49.5], [-8, 51.5],
		[-5, 64], [-6.5, 94], [-8, 112], [-4, 135], [-2, 160], [0, 185], [5, 205], [10, 240], [12, 300],
		[-60, 320], [-100, 220], [-125, 130],
	];
	W.waters = [W.lakeFar, W.boktjarn];

	W.roadOuter = [[163, 195], [161, 165], [158, 148], [155.5, 138], [154.5, 132]];
	W.roadInner = [
		[154.5, 132], [153.5, 127.5], [151, 122], [150, 114], [148, 104], [145, 93], [142.5, 80], [140.5, 71],
		[134, 67.5], [126, 66], [121.5, 61], [121.5, 53], [124, 49],
	];
	W.footpaths = [
		[[192, 81], [197, 92], [203, 103], [207, 110], [211, 112.5]],
		[[211, 112.5], [213, 116], [222, 116]],
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
	// Bastun: grått plåttak med nock öst–väst (satellitbild 3 och 4), dörr mot sjön.
	W.bastu = { x: 207, z: 116, w: 5.6, d: 5 };
	W.jetty = { x0: 222, x1: 236, z: 116 };
	W.dass = { x: 149.7, z: 37.75, w: 5, d: 8.9, door: { x: 145.6, z: 37.75 } };
	W.vedbod = { x: 127, z: 21.5, w: 6, d: 13 };
	W.chopBlock = { x: 132.2, z: 22.5 };
	W.bins = { x: 159.8, z: 136.5 };
	W.canoeRack = { x: 230.5, z: 63 };
	W.mowerHome = { x: 156, z: 39.5 };
	W.lamps = [[158.6, 130.6], [150.5, 67], [211.5, 111.5]];
	// Stenmurar norr om garaget, på båda sidor om vägen (syns tydligt i satellitbild 1).
	W.stoneWalls = [
		[[102.4, 118.8], [110.8, 116], [118, 114.4], [128, 113.6], [136, 112], [145.6, 110]],
		[[151.6, 108.6], [159.5, 108.9]],
	];
	W.lawnTrees = [[185, 76, 0], [118, 97, 8], [104, 95, 9], [92, 87, 6], [70, 70, 8], [189, 50, 9]];

	// cx, cz, w (x), d (z), wall height, ridge height, ridge axis, wall, roof. Names from hsandkarta.png, looks from photos.
	// Optional: parts (several volumes; shed: true gives a lean-to roof falling to the south), walls (per side: door, doors,
	// windows, winTop, recess), chimneys [x, z, color, size], tiles, plinth, rot (radians, turns the house around its center),
	// door (where people go in and out). type and info are shown in the detail view when the house is clicked.
	W.buildings = [
		{
			id: 'ladan', name: 'Ladan', cx: 139, cz: 59, w: 21, d: 11, hw: 3.2, hr: 6.6, ridge: 'x', wall: '#8e2b1f', roof: '#b4532f', tiles: true,
			// Brick chimney on the ridge, white chimney on the south roof slope in the south-west corner (ladan.webp).
			chimneys: [[1.5, 0, '#8a3a2a'], [-9.4, 4.2, '#e8e4da', 0.32, 1.2]],
			walls: { s: { door: 10.5, doorC: '#ebe6da', windows: [{ u: 2.8 }, { u: 5.5 }, { u: 15.5 }, { u: 18.2 }] }, e: { windows: [{ u: 3.2 }, { u: 6.6 }] } },
			type: 'Sovhus',
			info: 'Den långa röda ladan med tegeltak mitt på lägergården. Mitt på södersidan finns en inglasad veranda med egen gavel, och på östra gaveln går en yttertrappa upp till loftet. Trekammarbrunnen ligger strax norr om ladan, och sugbilen ställer sig på vägen väster om den när brunnen ska tömmas. Det här var ladan där kossorna var.',
		},
		{
			id: 'verktyg', name: 'Verktygsboden', cx: 131.9, cz: 38.2, w: 11, d: 10, hw: 3.4, hr: 6.2, ridge: 'x', wall: '#8e2b1f', roof: '#2d2d33', chimney: true,
			type: 'Förråd',
			info: 'Röd bod med svart tak mellan vedboden och ladan. Här förvaras verktygen.',
		},
		{
			id: 'lillstugan', name: 'Lillstugan', cx: 172, cz: 48.5, w: 12, d: 8, hw: 3.0, hr: 5.2, ridge: 'x', wall: '#8e2b1f', roof: '#b4532f', tiles: true,
			plinth: '#e6e2d8', plinthH: 0.65, chimneys: [[0.8, 0, '#55524c', 0.22]],
			walls: { s: { door: 9.8, doorW: 0.95, doorC: '#a7835a', recess: [8.3, 12], windows: [{ u: 3.4, w: 0.8 }, { u: 6.2, w: 1.6 }] } },
			type: 'Sovhus',
			info: 'Liten röd stuga med tegeltak och vit sockel i norra delen av gården. Entrén är indragen i husets sydöstra hörn och nås via en trätrappa. Huset byggdes på grunden av den gamla lillstugan som förstördes i en brand.',
		},
		{
			id: 'kanot', name: 'Kanotförrådet', cx: 220, cz: 62, w: 11.5, d: 16, hw: 3.4, hr: 6.6, ridge: 'z', wall: '#8e2b1f', roof: '#6b3326', noWindows: true,
			walls: { s: { door: 5.75, doorW: 3.4, doorH: 2.8, doorC: '#7a2318' } },
			type: 'Förråd',
			info: 'Stort förråd nere vid stranden av Stora Härsjön, med en bred port på gaveln. Kanoterna ligger på stället utanför.',
		},
		{
			// Satellitbild 4: huvudkropp med nock öst–väst, tvärgavel mot gräsmattan i nordväst (nock nord–syd, samma nockhöjd)
			// och en lägre tillbyggnad med pulpettak mitt på södersidan. Altan med räcke öster om tvärgaveln, stenläggning väster om den.
			id: 'storstugan', name: 'Storstugan', cx: 165.2, cz: 100, w: 14.4, d: 7.6, hw: 4.3, hr: 8.2, ridge: 'x', wall: '#8e2b1f', roof: '#5a2e24', tiles: true,
			door: { x: 165.4, z: 95.1 },
			parts: [
				{
					dx: 0, dz: 0, w: 14.4, d: 7.6, hw: 4.3, hr: 8.2, ridge: 'x',
					walls: {
						n: { door: 6.8, winTop: 2.0, windows: [{ u: 2.2 }, { u: 4.4 }] },
						s: { door: false, winTop: 2.0, windows: [{ u: 2.0 }, { u: 12.4 }] },
						e: { winTop: 2.0, windows: [{ u: 2.2 }, { u: 5.4 }] },
						w: { winTop: 2.0, windows: [{ u: 2.4 }, { u: 5.2 }] },
					},
				},
				{
					dx: -4.0, dz: -3.25, w: 5.2, d: 5.5, hw: 4.3, hr: 8.15, ridge: 'z',
					walls: { n: { door: false, winTop: 2.0, windows: [{ u: 2.6 }] }, w: { winTop: 2.0, windows: [{ u: 2.4 }] }, e: { winTop: 2.0, windows: [{ u: 1.5 }] }, s: { noWindows: true } },
				},
				{
					dx: 2.35, dz: 4.9, w: 6.7, d: 2.2, hw: 2.6, hr: 3.5, shed: true,
					walls: { s: { windows: [{ u: 1.6 }, { u: 5.1 }] }, e: { door: 1.1, doorW: 0.9 }, w: { noWindows: true }, n: { noWindows: true } },
				},
			],
			type: 'Sovhus',
			info: 'Den största stugan, i ett och ett halvt plan. Huvudbyggnaden har nocken i öst–västlig riktning och en hög tvärgavel mot gräsmattan i nordväst. Entrén ligger på norrsidan vid altanen med räcke, och en lägre tillbyggnad med pulpettak sitter mitt på södersidan. Huset är flyttat i bitar från ett hus i Lindome. Den gamla Storstugan i stockvirke är riven.',
		},
		{
			// Satellitbild 1 och 4: rött tegeltak med nock nord–syd, något vridet. Portarna mot vägen i öster.
			id: 'garaget', name: 'Garaget', cx: 142.8, cz: 125.2, w: 7.4, d: 9.6, hw: 3.0, hr: 5.6, ridge: 'z', rot: -0.18, wall: '#8e2b1f', roof: '#b4532f', tiles: true,
			walls: {
				e: { doors: [{ u: 2.55, w: 2.7, h: 2.45 }, { u: 7.05, w: 2.7, h: 2.45 }], doorC: '#7e2419', windows: [] },
				n: { door: 2.0, doorW: 0.9, windows: [{ u: 5.2 }] },
				s: { door: false, windows: [{ u: 3.7 }] },
				w: { windows: [{ u: 2.6 }, { u: 7.0 }] },
			},
			type: 'Garage',
			info: 'Rött garage med tegeltak vid vägen precis innanför portalen. Huset står lite snett mot vägen, med de breda portarna åt öster. Norr om garaget går en stenmur, och på andra sidan vägen fortsätter muren fram mot Storstugan.',
		},
		{
			id: 'garageboden', name: 'Garageboden', cx: 140.5, cz: 116.3, w: 7, d: 5.5, hw: 2.6, hr: 4.2, ridge: 'x', wall: '#7a3a24', roof: '#2e2e30',
			type: 'Förråd',
			info: 'Liten bod med svart tak norr om garaget, mellan garaget och stenmuren.',
		},
	];
	W.sleepHouses = ['ladan', 'lillstugan', 'storstugan'];

	// Small buildings that are modelled separately (objects.js) but get the same detail view as the houses.
	W.structures = [
		{
			id: 'vedbod', name: 'Vedboden', type: 'Vedbod', size: [6, 13], height: 2.8, task: 'vedbod',
			info: 'Den långa vedboden med vitt tak längst norrut på gården. Utanför står huggkubben där funktionärerna hugger ved. Veden körs med skottkärra hela vägen ner till bastun.',
		},
		{
			id: 'dass', name: 'Utedasset', type: 'Dass', size: [5, 8.9], height: 3.3, ridge: 'z', task: 'dass',
			info: 'Brunt utedass med tre dörrar mot väster, alla med hjärta. När tunnan är full bär en funktionär den till trekammarbrunnen.',
		},
		{
			id: 'bastu', name: 'Bastun', type: 'Bastu', size: [5.6, 5], height: 3.9, ridge: 'x', task: 'bastu',
			info: 'Vedeldad bastu nere vid Stora Härsjön, med grått plåttak och dörren mot sjön. Bryggan för kvällsdoppet ligger alldeles intill. Bastun ska vara minst 65° till kvällsdoppet kl 21.',
		},
	];

	// Wall rectangles in world coordinates (axis-aligned bounds; a turned house gets the bounds of the turned footprint).
	function partRects(b) {
		const parts = b.parts || [{ dx: 0, dz: 0, w: b.w, d: b.d }];
		const c = Math.cos(b.rot || 0), s = Math.sin(b.rot || 0);
		return parts.map((p) => {
			const xs = [], zs = [];
			for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
				const lx = p.dx + (u * p.w) / 2, lz = p.dz + (v * p.d) / 2;
				xs.push(b.cx + lx * c - lz * s);
				zs.push(b.cz + lx * s + lz * c);
			}
			return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
		});
	}
	for (const b of W.buildings) {
		b.rects = partRects(b);
		b.bounds = {
			x0: Math.min(...b.rects.map((r) => r.x0)), x1: Math.max(...b.rects.map((r) => r.x1)),
			z0: Math.min(...b.rects.map((r) => r.z0)), z1: Math.max(...b.rects.map((r) => r.z1)),
		};
	}

	W.doorOf = function (b) {
		if (b.door) return b.door;
		return { x: b.cx, z: b.cz + b.d / 2 + 1.2 };
	};
	W.building = (id) => W.buildings.find((b) => b.id === id);
	W.structure = (id) => W.structures.find((s) => s.id === id);
	for (const s of W.structures) {
		s.cx = W[s.id].x;
		s.cz = W[s.id].z;
	}

	W.inLawn = (x, z) => PG.pointInPoly(x, z, W.lawn);
	W.inLake = (x, z) => PG.pointInPoly(x, z, W.lake);
	W.inWater = (x, z) => W.waters.some((p) => PG.pointInPoly(x, z, p));
	W.waterDist = (x, z) => Math.min(...W.waters.map((p) => PG.distToPolyEdge(x, z, p)));
	W.wallDist = (x, z) => Math.min(...W.stoneWalls.map((p) => PG.distToPolyline(x, z, p)));
	W.roadDist = (x, z) => Math.min(PG.distToPolyline(x, z, W.roadOuter), PG.distToPolyline(x, z, W.roadInner));
	W.inBuilding = function (x, z, m) {
		m = m || 0;
		for (const b of W.buildings) {
			for (const r of b.rects) if (x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m) return b;
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
				// Keep trunks and crowns out of the water: no trees in a lake or right at the shore line.
				if (W.inWater(x, z) || W.waterDist(x, z) < 2.5) continue;
				if (W.wallDist(x, z) < 1.8) continue;
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
				if (x > 200 && x < 232 && z > 106 && z < 126) continue;
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
				if (k !== 1 && W.wallDist(x, z) < 1.0) k = 0;
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
