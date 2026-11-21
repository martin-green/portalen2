// Statiska byggnader och föremål i 3D: hus, portal, flaggstång, brunn, dass, vedbod, bastu, brygga, sopkärl, lyktor och staket.
import * as THREE from 'three';

const PG = window.PG;
const W = PG.World, M = PG.Mesh, Gfx = PG.Gfx, L = PG.Light;
const Objects = (PG.Objects = {});
const updaters = [];

// ---------- Portal state (directly controlled by the player) ----------
const Portal = (PG.Portal = { frac: 0, target: 0, speed: 0.25, blocked: false, shake: 0 });
Portal.open = function () { Portal.target = 1; };
Portal.close = function () { Portal.target = 0; };
Portal.toggle = function () { Portal.target = Portal.target > 0.5 ? 0 : 1; PG.Audio.pop(); };
Portal.isOpen = () => Portal.frac >= 0.95;
Portal.isOpening = () => Portal.target === 1 && Portal.frac < 0.95;
Portal.passable = () => Portal.frac >= 0.35;
Portal.update = function (dt) {
	if (Portal.target > Portal.frac) Portal.frac = Math.min(Portal.target, Portal.frac + Portal.speed * dt);
	else if (Portal.target < Portal.frac && !(Portal.blocked && Portal.frac <= 0.92)) Portal.frac = Math.max(Portal.target, Portal.frac - Portal.speed * dt);
	Portal.shake = Math.max(0, Portal.shake - dt * 2);
};
Portal.reset = function () { Portal.frac = 0; Portal.target = 0; Portal.blocked = false; Portal.shake = 0; };

// ---------- Buildings ----------
const WHITE = '#ebe6da', GLASS = '#26323d', PLINTH = '#55524c', WOOD = '#8a7f6e';

// Wall details; o: door (true | u | false), doorW, doorH, doorC, windows [{u, w}], noWindows, recess [u0, u1], plinthC, plinthH.
function decorateWall(f, wallW, hw, o) {
	const ph = o.plinthH || 0.4;
	M.decal(f, 0, hw - ph, wallW, hw, o.plinthC || PLINTH);
	if (o.recess) M.decal(f, o.recess[0], 0, o.recess[1], hw - ph, '#5e1a12');
	M.decal(f, 0, 0, 0.24, hw, WHITE);
	M.decal(f, wallW - 0.24, 0, wallW, hw, WHITE);
	let doorU = -99;
	if (o.door !== undefined && o.door !== false) {
		doorU = o.door === true ? wallW / 2 : o.door;
		const dw = (o.doorW || 1.1) / 2, dh = o.doorH || 2.1;
		M.decal(f, doorU - dw - 0.13, hw - dh - 0.1, doorU + dw + 0.13, hw - 0.02, WHITE);
		M.decal(f, doorU - dw, hw - dh, doorU + dw, hw - 0.02, o.doorC || '#5b3a26');
		if (dw > 1) M.decal(f, doorU - 0.04, hw - dh, doorU + 0.04, hw - 0.02, WHITE);
		else M.decal(f, doorU + dw - 0.25, hw - dh / 2 - 0.05, doorU + dw - 0.15, hw - dh / 2 + 0.05, '#c9b46a');
	}
	if (o.noWindows) return;
	let wins = o.windows;
	if (!wins) {
		const n = Math.max(1, Math.floor(wallW / 3.4));
		wins = [];
		for (let i = 0; i < n; i++) {
			const u = (wallW * (i + 0.5)) / n;
			if (Math.abs(u - doorU) >= 1.4) wins.push({ u });
		}
	}
	const top = Math.min(0.9, hw * 0.25), bot = top + 1.15;
	for (const w of wins) {
		const half = (w.w || 1.0) / 2, u = w.u;
		M.decal(f, u - half - 0.12, top - 0.1, u + half + 0.12, bot + 0.1, WHITE);
		M.decal(f, u - half, top, u + half, bot, GLASS, 'window');
		M.decal(f, u - 0.04, top, u + 0.04, bot, WHITE);
		M.decal(f, u - half, (top + bot) / 2 - 0.04, u + half, (top + bot) / 2 + 0.04, WHITE);
	}
}

// Small framed window sticking out of a wall plane (used on gables, where wall decals don't fit).
function wallWindow(faces, x, z, h, side, w, hh) {
	const t = 0.06, a = w / 2 + 0.1, b = hh / 2 + 0.1;
	const box = side === 's' ? M.box(x - a, z, h - b, x + a, z + t, h + b, WHITE)
		: side === 'n' ? M.box(x - a, z - t, h - b, x + a, z, h + b, WHITE)
		: side === 'e' ? M.box(x, z - a, h - b, x + t, z + a, h + b, WHITE)
		: M.box(x - t, z - a, h - b, x, z + a, h + b, WHITE);
	const face = box.find((f) => f.side === side);
	M.decal(face, 0.1, 0.1, w + 0.1, hh + 0.1, GLASS, 'window');
	M.decal(face, a - 0.03, 0.1, a + 0.03, hh + 0.1, WHITE);
	faces.push(...box);
}

function tilePaint(hex) {
	const c = PG.hex2rgb(hex);
	const dark = PG.rgbStr(c[0] * 0.7, c[1] * 0.7, c[2] * 0.7);
	const light = PG.rgbStr(Math.min(255, c[0] * 1.15), Math.min(255, c[1] * 1.15), Math.min(255, c[2] * 1.15));
	return (ctx, w, h) => {
		for (let y = 0, r = 0; y < h; y += 32, r++) {
			ctx.fillStyle = light;
			ctx.fillRect(0, y, w, 4);
			ctx.fillStyle = dark;
			ctx.fillRect(0, y + 26, w, 6);
			for (let x = (r % 2) * 13; x < w; x += 26) ctx.fillRect(x, y, 2, 28);
		}
	};
}

// Building-specific details from photos, in building-local coordinates.
const EXTRAS = {
	ladan(f, b) {
		// Glazed porch with its own gable, centered on the south wall.
		f.push(...M.gable(-3.15, 5.3, 3.15, 7.7, 2.95, 4.2, 'z', b.roof, WHITE, 0.25));
		for (const x of [-3.0, -0.6, 0.6, 3.0]) f.push(...M.box(x - 0.08, 7.45, 0, x + 0.08, 7.61, 2.95, WHITE));
		for (const s of [-1, 1]) {
			const a = s < 0 ? -2.95 : 0.68, c = s < 0 ? -0.68 : 2.95;
			f.push(...M.box(a, 7.42, 0, c, 7.6, 0.95, b.wall), ...M.box(a - 0.05, 7.38, 0.95, c + 0.05, 7.64, 1.04, WHITE));
			const pane = M.box(a, 7.48, 1.05, c, 7.53, 2.6, '#3a4652');
			M.decal(pane.find((p) => p.side === 's'), 0.02, 0.02, c - a - 0.02, 1.53, GLASS, 'window');
			f.push(...pane);
		}
		f.push(...M.box(-3.15, 5.5, 0, 3.15, 7.7, 0.08, '#9a958a'), ...M.box(-7.0, 5.5, 0, -3.15, 9.5, 0.04, '#8d8a82'));
		f.push(...M.box(8.9, 5.5, 2.15, 9.7, 5.8, 2.7, '#f2f2ee'));
		// Loft window and outside staircase on the east gable.
		wallWindow(f, 10.5, 0, 4.4, 'e', 1.1, 0.9);
		f.push(...M.box(10.5, -1.4, 3.1, 12.4, 1.4, 3.25, WOOD));
		for (const z of [-1.3, 1.3]) f.push(...M.box(12.25, z - 0.08, 0, 12.41, z + 0.08, 3.1, WOOD));
		for (const z of [-1.4, 1.34]) {
			f.push(...M.box(10.5, z, 4.1, 12.4, z + 0.06, 4.18, WOOD), ...M.box(10.5, z, 3.65, 12.4, z + 0.06, 3.71, WOOD));
			f.push(...M.box(12.33, z, 3.25, 12.41, z + 0.06, 4.18, WOOD));
		}
		for (let i = 0; i < 10; i++) {
			const x = 12.4 + i * 0.38, top = 3.25 - (i + 1) * 0.325;
			f.push(...M.box(x, -0.6, top - 0.05, x + 0.38, 0.6, top, WOOD));
		}
		for (const s of [-1, 1]) {
			const z0 = s < 0 ? -0.66 : 0.58, z1 = s < 0 ? -0.58 : 0.66;
			f.push(...slab(12.4, 3.25, 16.2, 0, 0.22, z0, z1, WOOD, WOOD));
			f.push(...slab(12.4, 4.15, 16.2, 0.95, 0.07, z0, z1, WOOD, WOOD));
			for (let k = 1; k < 3; k++) {
				const x = 12.4 + k * 1.27, hBase = 3.25 - (k * 1.27 * 3.25) / 3.8;
				f.push(...M.box(x - 0.04, z0, hBase, x + 0.04, z1, hBase + 0.9, WOOD));
			}
		}
	},
	lillstugan(f) {
		f.push(...M.box(2.3, 4.0, 0, 6.2, 5.1, 0.5, WOOD), ...M.box(2.3, 5.1, 0, 6.2, 5.5, 0.33, WOOD), ...M.box(2.3, 5.5, 0, 6.2, 5.9, 0.17, WOOD));
		f.push(...M.box(2.2, 3.95, 0.5, 2.38, 4.13, 3.0, WHITE));
	},
	storstugan(f) {
		wallWindow(f, 2.3, 7.5, 5.5, 's', 0.9, 0.9);
		f.push(...M.box(-4.75, 6.0, 0, -0.15, 7.6, 0.4, WOOD), ...M.box(-1.3, 7.6, 0, -0.15, 8.0, 0.25, WOOD));
		f.push(...M.box(-4.75, 7.52, 1.25, -1.3, 7.6, 1.33, WOOD));
		for (const x of [-4.7, -3.5, -2.3, -1.35]) f.push(...M.box(x - 0.04, 7.52, 0.4, x + 0.04, 7.6, 1.33, WOOD));
	},
};

function houseFaces(b) {
	const parts = b.parts || [{ dx: 0, dz: 0, w: b.w, d: b.d, hw: b.hw, hr: b.hr, ridge: b.ridge, walls: b.walls }];
	const faces = [];
	parts.forEach((p, i) => {
		const x0 = p.dx - p.w / 2, x1 = p.dx + p.w / 2, z0 = p.dz - p.d / 2, z1 = p.dz + p.d / 2;
		const walls = M.box(x0, z0, 0, x1, z1, p.hw, b.wall, { noTop: true });
		for (const f of walls) {
			const width = f.side === 's' || f.side === 'n' ? p.w : p.d;
			const o = Object.assign({ plinthC: b.plinth, plinthH: b.plinthH, noWindows: b.noWindows }, (p.walls || {})[f.side]);
			if (o.door === undefined && i === 0 && f.side === 's') o.door = true;
			decorateWall(f, width, p.hw, o);
		}
		faces.push(...walls, ...M.gable(x0, z0, x1, z1, p.hw, p.hr, p.ridge, b.roof, b.wall, 0.55));
	});
	const chimneys = b.chimneys || (b.chimney ? [[b.ridge === 'x' ? -b.w * 0.2 : 0, b.ridge === 'x' ? 0 : -b.d * 0.2, '#7d3a2c']] : []);
	for (const [cx, cz, c, s] of chimneys) {
		const r = s || 0.4;
		faces.push(...M.box(cx - r, cz - r, b.hr - 0.6, cx + r, cz + r, b.hr + 1.0, c, { top: '#2b2b2b' }));
	}
	if (EXTRAS[b.id]) EXTRAS[b.id](faces, b);
	if (b.tiles) {
		const paint = tilePaint(b.roof);
		for (const f of faces) if (f.roof) f.paint = paint;
	}
	return faces;
}

function canoeFaces(color) {
	const C = PG.hex2rgb(color), L = 2.4, R = 0.42, segs = 10, sides = 8;
	const ring = (x) => {
		const r = R * Math.sqrt(Math.max(0.03, 1 - (x / L) ** 2));
		const pts = [];
		for (let k = 0; k <= sides; k++) {
			const a = (k / sides) * Math.PI;
			pts.push([x, Math.cos(a) * r, Math.sin(a) * r * 0.75]);
		}
		return pts;
	};
	const f = [];
	for (let i = 0; i < segs; i++) {
		const A = ring(-L + (2 * L * i) / segs), B = ring(-L + (2 * L * (i + 1)) / segs);
		for (let k = 0; k < sides; k++) {
			const am = ((k + 0.5) / sides) * Math.PI;
			f.push({ p: [A[k], B[k], B[k + 1], A[k + 1]], c: C, n: [0, Math.cos(am), Math.sin(am)] });
		}
	}
	return f;
}

function makeCanoes() {
	const r = W.canoeRack;
	['#c0392b', '#2e7d32', '#d4a017'].forEach((c, i) => {
		const g = Gfx.makeObject(canoeFaces(c));
		Gfx.place(g, r.x + (i - 1) * 1.5, r.z + (i - 1) * 0.4, 0.02, Math.PI / 2 + 0.08 * (i - 1));
		Gfx.add(g);
	});
}

function makeBuildings() {
	for (const b of W.buildings) {
		const g = Gfx.makeObject(houseFaces(b));
		Gfx.place(g, b.cx, b.cz, 0);
		Gfx.add(g);
		Gfx.addPick('building', b.cx, b.cz, 0, b.w, b.hr, b.d, b);
		if (b.id === 'kanot') makeCanoes();
	}
}

// ---------- Portal (as in hsandvinter.jpg): red plank pillars, gable roof hinged on top of the east pillar ----------
const PORTAL_RED = '#9a2a1e';
const ROOF_OPEN = 1.6; // radians when fully open
function planks(ctx, w, h, shade) {
	ctx.strokeStyle = shade([70, 14, 8]);
	ctx.lineWidth = 2;
	for (let x = 26; x < w - 20; x += 15) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
}
// Board along the line a->b (x,h) with thickness t on its upper side, spanning z0..z1.
function slab(xa, ha, xb, hb, t, z0, z1, topC, edgeC) {
	const len = Math.hypot(xb - xa, hb - ha);
	const dx = (xb - xa) / len, dh = (hb - ha) / len;
	let nx = -dh, nh = dx;
	if (nh < 0) { nx = -nx; nh = -nh; }
	const T = PG.hex2rgb(topC), E = PG.hex2rgb(edgeC);
	const a0 = [xa, ha], b0 = [xb, hb], a1 = [xa + nx * t, ha + nh * t], b1 = [xb + nx * t, hb + nh * t];
	const P3 = (p, z) => [p[0], z, p[1]];
	return [
		{ p: [P3(a1, z0), P3(b1, z0), P3(b1, z1), P3(a1, z1)], c: T, n: [nx, 0, nh] },
		{ p: [P3(a0, z1), P3(b0, z1), P3(b0, z0), P3(a0, z0)], c: E, n: [-nx, 0, -nh] },
		{ p: [P3(a1, z1), P3(b1, z1), P3(b0, z1), P3(a0, z1)], c: E, n: [0, 1, 0] },
		{ p: [P3(b1, z0), P3(a1, z0), P3(a0, z0), P3(b0, z0)], c: E, n: [0, -1, 0] },
		{ p: [P3(a1, z0), P3(a1, z1), P3(a0, z1), P3(a0, z0)], c: E, n: [-dx, 0, -dh] },
		{ p: [P3(b1, z1), P3(b1, z0), P3(b0, z0), P3(b0, z1)], c: E, n: [dx, 0, dh] },
	];
}

function makePortal() {
	const P = W.portal;
	const G = 2.6, PW = 1.0, PD = 0.8, PH = 2.4;
	const root = new THREE.Group();
	Gfx.place(root, P.x, P.z, 0);
	Gfx.add(root);
	// Pillars
	const pf = [];
	for (const side of [-1, 1]) {
		const cx = side * (G + PW / 2);
		const box = M.box(cx - PW / 2, -PD / 2, 0, cx + PW / 2, PD / 2, PH, PORTAL_RED, { top: '#6e2016' });
		for (const f of box) {
			if (f.side === 't') continue;
			const w = f.side === 's' || f.side === 'n' ? PW : PD;
			M.decal(f, 0, 0, 0.13, PH, WHITE);
			M.decal(f, w - 0.13, 0, w, PH, WHITE);
			f.paint = planks;
		}
		pf.push(...box);
	}
	root.add(Gfx.makeObject(pf));
	// Roof assembly, built in portal coordinates and moved so the hinge is the origin.
	const E = PH + 0.05, R = 4.15, S = 4.25, T = 3.05, ZD = 0.55;
	const hingeX = G + PW, hingeH = E;
	const rf = [];
	rf.push(...slab(-S, E, 0, R, 0.22, -ZD, ZD, '#3d3a38', WHITE));
	rf.push(...slab(0, R, S, E, 0.22, -ZD, ZD, '#3d3a38', WHITE));
	const xT = -S + ((T - E) * S) / (R - E);
	const RED = PG.hex2rgb(PORTAL_RED);
	rf.push({ p: [[xT, 0.32, T], [-xT, 0.32, T], [0, 0.32, R]], c: RED, n: [0, 1, 0] });
	rf.push({ p: [[-xT, -0.32, T], [xT, -0.32, T], [0, -0.32, R]], c: RED, n: [0, -1, 0] });
	rf.push(...M.box(-2.95, -0.38, T - 0.18, 2.95, 0.38, T, WHITE));
	const sign = M.box(-0.85, -0.04, T - 0.62, 0.85, 0.04, T - 0.28, '#d98a2b', { top: '#c07020' });
	const paintSign = (ctx, w, h, shade) => {
		ctx.fillStyle = shade([70, 35, 10]);
		ctx.font = 'italic bold 22px Georgia, serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('Härsjösand', w / 2, h / 2 + 1);
	};
	for (const f of sign) if (f.side === 's' || f.side === 'n') f.paint = paintSign;
	rf.push(...sign);
	rf.push(...M.box(-0.6, -0.015, T - 0.3, -0.57, 0.015, T - 0.18, '#333'), ...M.box(0.57, -0.015, T - 0.3, 0.6, 0.015, T - 0.18, '#333'));
	M.translate(rf, -hingeX, 0, -hingeH);
	const pivot = new THREE.Group();
	pivot.position.set(hingeX, hingeH, 0);
	pivot.add(Gfx.makeObject(rf));
	root.add(pivot);
	// White gates, standing open against the pillars as in the photo.
	const gateMat = Gfx.mat([236, 234, 226]);
	const L = 2.3, h0 = 0.3, h1 = 1.45;
	const bar = (len, x, y, rot) => {
		const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.09, 0.06), gateMat);
		m.position.set(x, y, 0);
		m.rotation.z = rot || 0;
		m.castShadow = true;
		return m;
	};
	const diag = Math.hypot(L, h1 - h0), ang = Math.atan2(h1 - h0, L);
	for (const side of [-1, 1]) {
		const g = new THREE.Group();
		g.add(bar(L, L / 2, h0), bar(L, L / 2, h1), bar(diag, L / 2, (h0 + h1) / 2, ang), bar(diag, L / 2, (h0 + h1) / 2, -ang));
		const stile = new THREE.Mesh(new THREE.BoxGeometry(0.09, h1 - h0 + 0.09, 0.07), gateMat);
		stile.position.set(L, (h0 + h1) / 2, 0);
		stile.castShadow = true;
		g.add(stile);
		g.position.set(side * (G - 0.05), 0, -PD / 2);
		g.rotation.y = side < 0 ? 1.5 : Math.PI - 1.5;
		root.add(g);
	}
	Gfx.addPick('portal', P.x, P.z, 0, (G + PW) * 2 + 1.5, 4.6, 3);
	// Fences (gärdsgård)
	const ff = [];
	for (const fc of W.fences) {
		const [a, b] = fc;
		for (let x = a[0]; x < b[0] - 0.1; x += 2.2) {
			const x1 = Math.min(b[0], x + 2.2);
			ff.push(...M.box(x - 0.08, a[1] - 0.08, 0, x + 0.08, a[1] + 0.08, 1.35, '#6b5038', { top: '#8a6a4a' }));
			ff.push(...M.box(x, a[1] - 0.05, 0.55, x1, a[1] + 0.05, 0.68, '#7d5e40'), ...M.box(x, a[1] - 0.05, 1.05, x1, a[1] + 0.05, 1.18, '#7d5e40'));
		}
	}
	Gfx.add(Gfx.makeObject(ff));
	updaters.push(() => {
		pivot.rotation.z = -PG.smooth(Portal.frac) * ROOF_OPEN;
		const j = Portal.shake > 0 ? Math.sin(performance.now() * 0.08) * Portal.shake * 0.12 : 0;
		root.position.x = P.x + j;
	});
}

// ---------- Flag pole ----------
const FLAG_W = 2.4, FLAG_H = 1.5, POLE_H = 10;
function flagTexture() {
	const c = document.createElement('canvas');
	c.width = 160; c.height = 100;
	const g = c.getContext('2d');
	g.fillStyle = '#005baa';
	g.fillRect(0, 0, 160, 100);
	g.fillStyle = '#fecb00';
	g.fillRect(50, 0, 20, 100);
	g.fillRect(0, 40, 160, 20);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}
function makeFlag() {
	const F = W.flag;
	const pole = Gfx.makeObject([].concat(
		M.cylinder(0, 0, 0, 0.35, 0.35, 10, '#8f8f88', { top: '#a5a59d' }),
		M.cylinder(0, 0, 0.35, POLE_H, 0.08, 8, '#f2f2ee'),
		M.cylinder(0, 0, POLE_H, POLE_H + 0.25, 0.14, 8, '#d9b23a')
	));
	Gfx.place(pole, F.x, F.z, 0);
	Gfx.add(pole);
	const geo = new THREE.PlaneGeometry(FLAG_W, FLAG_H, 14, 6);
	geo.translate(FLAG_W / 2, -FLAG_H / 2, 0);
	const base = geo.attributes.position.array.slice();
	const cloth = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: flagTexture(), side: THREE.DoubleSide }));
	cloth.castShadow = true;
	const holder = new THREE.Group();
	holder.add(cloth);
	holder.position.set(F.x + 0.1, 0, F.z);
	Gfx.add(holder);
	const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, POLE_H - 0.9, 4), Gfx.mat([220, 220, 210]));
	rope.position.set(F.x + 0.1, (POLE_H + 0.9) / 2, F.z);
	Gfx.add(rope);
	Gfx.addPick('flag', F.x, F.z, 0, 2.4, POLE_H + 0.5, 2.4);
	updaters.push((dt, t) => {
		const st = PG.state;
		const fr = st ? st.flagFrac : 0;
		holder.visible = fr > 0.01;
		if (!holder.visible) return;
		holder.position.y = 1.8 + fr * (POLE_H - 0.2 - 1.8);
		const wind = 0.35 + 0.25 * Math.sin(t * 0.13);
		holder.rotation.y = 0.25 * Math.sin(t * 0.07);
		const pos = geo.attributes.position.array;
		for (let i = 0; i < pos.length; i += 3) {
			const u = base[i] / FLAG_W;
			const v = -base[i + 1] / FLAG_H;
			pos[i] = base[i] * (0.8 + wind * 0.2);
			pos[i + 2] = Math.sin(t * 6.5 - u * 6) * 0.28 * u + Math.sin(t * 2.1 - u * 3) * 0.1 * u;
			pos[i + 1] = base[i + 1] - (1 - wind) * u * 0.5 * (1 - v * 0.3);
		}
		geo.attributes.position.needsUpdate = true;
		geo.computeVertexNormals();
	});
}

// ---------- Trekammarbrunnen ----------
function makeBrunn() {
	const B = W.brunn;
	const f = [];
	for (let i = -1; i <= 1; i++) {
		f.push(...M.cylinder(i * 2, 0, 0, 0.4, 0.9, 14, '#9c9a92', { top: '#a9a79f' }));
		f.push(...M.cylinder(i * 2, 0, 0.4, 0.46, 0.6, 12, '#4d4d4a', { top: '#5b5b57' }));
		f.push(...M.box(i * 2 - 0.25, -0.05, 0.46, i * 2 + 0.25, 0.05, 0.52, '#2e2e2c'));
	}
	f.push(...M.box(-3.2, -0.15, 0.1, 3.2, 0.15, 0.3, '#86847d'));
	f.push(...M.box(3.1, -0.1, 0, 3.3, 0.1, 1.2, '#d0d0c8'));
	const g = Gfx.makeObject(f);
	Gfx.place(g, B.x, B.z, 0);
	Gfx.add(g);
	const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: Gfx.color([105, 70, 30]) }));
	puddle.position.set(B.x, 0.09, B.z);
	puddle.receiveShadow = true;
	Gfx.add(puddle);
	Gfx.addPick('brunn', B.x, B.z, 0, 7.5, 2, 3);
	updaters.push((dt, t) => {
		const st = PG.state;
		const lvl = st ? PG.clamp((st.brunn - 88) / 12, 0, 1) : 0;
		puddle.visible = lvl > 0.01;
		const r = 1 + lvl * 3.5 + Math.sin(t * 2) * 0.1 * lvl;
		puddle.scale.set(r * 1.4, 1, r);
	});
}

// ---------- Utedasset ----------
function makeDass() {
	const D = W.dass;
	const hw = D.w / 2, hd = D.d / 2;
	const body = M.box(-hw, -hd, 0, hw, hd, 2.4, '#8a5a32', { noTop: true });
	const doorsU = [D.d * 0.2, D.d * 0.5, D.d * 0.8];
	for (const f of body) {
		if (f.side === 'w') {
			for (const u of doorsU) M.decal(f, u - 0.5, 0.3, u + 0.5, 2.4, '#6e4426');
			f.paint = (ctx, w, h, shade) => {
				ctx.fillStyle = shade([40, 20, 10]);
				for (const u of doorsU) {
					const cx = u * 100, cy = 65;
					ctx.beginPath();
					ctx.moveTo(cx, cy + 14);
					ctx.bezierCurveTo(cx - 24, cy - 4, cx - 12, cy - 22, cx, cy - 8);
					ctx.bezierCurveTo(cx + 12, cy - 22, cx + 24, cy - 4, cx, cy + 14);
					ctx.fill();
				}
				ctx.fillStyle = shade([200, 180, 90]);
				for (const u of doorsU) ctx.fillRect(u * 100 + 30, h / 2 + 20, 8, 8);
			};
		}
		if (f.side === 's') M.decal(f, D.w / 2 - 0.4, 0.5, D.w / 2 + 0.4, 1.0, GLASS);
	}
	const roof = M.gable(-hw, -hd, hw, hd, 2.4, 3.3, 'z', '#3e3e3e', '#8a5a32', 0.35);
	const g = Gfx.makeObject(body.concat(roof));
	Gfx.place(g, D.x, D.z, 0);
	Gfx.add(g);
	Gfx.addPick('dass', D.x, D.z, 0, D.w + 2, 3.5, D.d + 1);
}

// ---------- Vedboden ----------
function makeVedbod() {
	const V = W.vedbod;
	const hw = V.w / 2, hd = V.d / 2;
	const WALL = '#6d4a2e';
	const shell = [].concat(
		M.box(-hw, -hd, 0, -hw + 0.15, hd, 2.6, WALL),
		M.box(-hw, -hd, 0, hw, -hd + 0.15, 2.6, WALL),
		M.box(-hw, hd - 0.15, 0, hw, hd, 2.6, WALL),
		M.box(hw - 0.2, -hd, 0, hw, -hd + 0.2, 2.3, WALL),
		M.box(hw - 0.2, hd - 0.2, 0, hw, hd, 2.3, WALL),
		M.box(hw - 0.2, -0.1, 0, hw, 0.1, 2.3, WALL)
	);
	shell.push({ p: [[-hw - 0.4, -hd - 0.4, 2.8], [-hw - 0.4, hd + 0.4, 2.8], [hw + 0.5, hd + 0.4, 2.25], [hw + 0.5, -hd - 0.4, 2.25]], c: PG.hex2rgb('#d8d8d2'), n: M.norm([0.55, 0, 6.9]) });
	const g = Gfx.makeObject(shell);
	Gfx.place(g, V.x, V.z, 0);
	Gfx.add(g);
	const logEnds = (ctx, w, h, shade) => {
		ctx.fillStyle = shade([120, 90, 60]);
		ctx.fillRect(0, 0, w, h);
		const r = 9;
		for (let y = r; y < h; y += r * 1.8) {
			for (let x = r + ((y / (r * 1.8)) % 2) * r; x < w - r * 0.5; x += r * 2.1) {
				ctx.fillStyle = shade([205, 168, 112]);
				ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
				ctx.strokeStyle = shade([150, 110, 70]);
				ctx.lineWidth = 2;
				ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.stroke();
			}
		}
	};
	let stack = null, stackLevel = -1;
	const C = W.chopBlock;
	const block = Gfx.makeObject(M.cylinder(0, 0, 0, 0.55, 0.38, 10, '#7a5a3c', { top: '#c7a27a' }));
	Gfx.place(block, C.x, C.z, 0);
	Gfx.add(block);
	const axe = Gfx.makeObject([].concat(M.box(-0.03, -0.03, 0.5, 0.03, 0.03, 1.2, '#a07a50'), M.box(-0.04, -0.15, 0.45, 0.04, 0.12, 0.6, '#777')));
	Gfx.place(axe, C.x + 0.1, C.z, 0);
	axe.rotation.z = 0.4;
	Gfx.add(axe);
	Gfx.addPick('vedbod', V.x + 1, V.z, 0, V.w + 4, 3, V.d + 1);
	Gfx.addPick('vedbod', C.x, C.z, 0, 2.5, 2, 2.5);
	updaters.push(() => {
		const st = PG.state;
		const level = Math.round(st ? st.ved : 10);
		axe.visible = !(st && st.chopping);
		if (level === stackLevel) return;
		stackLevel = level;
		if (stack) Gfx.remove(stack);
		const h = 0.15 + Math.min(1, level / 30) * 2.0;
		const sf = M.box(-hw + 0.3, -hd + 0.4, 0, hw - 1.2, hd - 0.4, h, '#8b6a45', { top: '#7a5a3a' });
		for (const f of sf) if (f.side === 'e') f.paint = logEnds;
		stack = Gfx.makeObject(sf);
		Gfx.place(stack, V.x, V.z, 0);
		Gfx.add(stack);
	});
}

// ---------- Bastun och bryggan ----------
function makeBastu() {
	const B = W.bastu;
	const hw = B.w / 2, hd = B.d / 2;
	const logs = (ctx, w, h, shade) => {
		ctx.strokeStyle = shade([60, 38, 22]);
		ctx.lineWidth = 3;
		for (let y = 22; y < h; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
	};
	const body = M.box(-hw, -hd, 0, hw, hd, 2.4, '#6a4426', { noTop: true });
	for (const f of body) {
		f.paint = logs;
		if (f.side === 'e') M.decal(f, 1.2, 0.5, 2.2, 2.4, '#3b2414');
		if (f.side === 's') {
			M.decal(f, 3.2, 0.7, 4.0, 1.3, '#e8e2d2');
			M.decal(f, 3.28, 0.78, 3.92, 1.22, '#2a1a10', 'emit');
		}
	}
	const faces = body.concat(M.gable(-hw, -hd, hw, hd, 2.4, 3.6, 'x', '#3a3a3c', '#6a4426', 0.45), M.box(-1.6, -0.3, 2.6, -1.0, 0.3, 4.3, '#777770', { top: '#222' }));
	const g = Gfx.makeObject(faces);
	Gfx.place(g, B.x, B.z, 0);
	Gfx.add(g);
	const pile = Gfx.makeObject(M.box(-hw - 1.3, -1.2, 0, -hw - 0.3, 1.2, 0.9, '#8b6a45', { top: '#7a5a3a' }));
	Gfx.place(pile, B.x, B.z, 0);
	Gfx.add(pile);
	const light = Gfx.addPointLight(B.x + 1.1, B.z + hd + 1.0, 1.2, 0xff8a3a, 14);
	const glow = Gfx.makeGlow(0xff8a3a, 4);
	glow.position.set(B.x + 1.1, 1.0, B.z + hd + 0.2);
	Gfx.add(glow);
	Gfx.addPick('bastu', B.x, B.z, 0, B.w + 3, 4.5, B.d + 2);
	const J = W.jetty;
	const jf = [].concat(M.box(J.x0, J.z - 1, 0.35, J.x1, J.z + 1, 0.5, '#9a7a55', { top: '#a8875f' }));
	for (let x = J.x0 + 2; x <= J.x1; x += 3) {
		jf.push(...M.box(x - 0.1, J.z - 1.05, -0.6, x + 0.1, J.z - 0.85, 0.5, '#5a4630'));
		jf.push(...M.box(x - 0.1, J.z + 0.85, -0.6, x + 0.1, J.z + 1.05, 0.5, '#5a4630'));
	}
	jf[0].paint = (ctx, w, h, shade) => {
		ctx.strokeStyle = shade([120, 92, 62]);
		ctx.lineWidth = 2;
		for (let x = 20; x < w; x += 22) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
	};
	jf.push(...M.box(J.x1 - 0.1, J.z - 0.5, -0.5, J.x1 + 0.05, J.z - 0.4, 1.1, '#b5b5b0'), ...M.box(J.x1 - 0.1, J.z + 0.4, -0.5, J.x1 + 0.05, J.z + 0.5, 1.1, '#b5b5b0'));
	Gfx.add(Gfx.makeObject(jf));
	updaters.push(() => {
		const st = PG.state;
		const burning = st && st.bastuFuel > 0;
		const now = performance.now();
		const flick = 0.75 + 0.25 * Math.sin(now * 0.02) * Math.sin(now * 0.013);
		if (g.userData.emitMat) g.userData.emitMat.emissiveIntensity = burning ? 2.5 * flick : 0;
		light.intensity = burning ? 18 * flick * (1.3 - L.day) : 0;
		glow.material.opacity = burning ? 0.5 * flick * (1.2 - L.day * 0.9) : 0;
		pile.visible = !!(st && st.bastuFuel > 0.05);
	});
}

// ---------- Sopkärl ----------
function makeBins() {
	const B = W.bins;
	const proto = Gfx.makeObject([].concat(M.cylinder(0, 0, 0, 1.1, 0.42, 10, '#2f6e3b', { top: '#245a2f' }), M.box(-0.45, -0.45, 1.1, 0.45, 0.45, 1.18, '#1f4a28')));
	const bins = [0, 1, 2].map((i) => {
		const g = proto.clone();
		Gfx.place(g, B.x, B.z - 1.3 + i * 1.3, 0);
		Gfx.add(g);
		return g;
	});
	updaters.push(() => {
		const lift = PG.state && PG.state.binLift ? PG.state.binLift : 0;
		bins.forEach((g, i) => {
			g.position.x = B.x - lift * 0.9;
			g.position.y = lift * 1.6;
			g.rotation.z = lift * 1.2;
		});
	});
}

// ---------- Lyktstolpar ----------
function makeLamps() {
	const pole = Gfx.makeObject([].concat(M.cylinder(0, 0, 0, 3.6, 0.07, 6, '#2b2b2b'), M.box(-0.22, -0.22, 3.6, 0.22, 0.22, 3.95, '#2b2b2b', { top: '#1b1b1b' })));
	const glassMat = new THREE.MeshLambertMaterial({ color: Gfx.color([230, 220, 170]), emissive: new THREE.Color(1, 0.8, 0.5), emissiveIntensity: 0 });
	const lamps = W.lamps.map(([x, z]) => {
		const g = pole.clone();
		Gfx.place(g, x, z, 0);
		Gfx.add(g);
		const glass = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.34), glassMat);
		glass.position.set(x, 3.76, z);
		Gfx.add(glass);
		const light = Gfx.addPointLight(x, z, 3.5, 0xffd9a0, 18);
		const glow = Gfx.makeGlow(0xffd9a0, 3);
		glow.position.set(x, 3.76, z);
		Gfx.add(glow);
		return { light, glow };
	});
	updaters.push(() => {
		const on = PG.clamp((0.45 - L.day) * 3, 0, 1);
		glassMat.emissiveIntensity = on * 2;
		for (const l of lamps) { l.light.intensity = on * 30; l.glow.material.opacity = on * 0.8; }
	});
}

Objects.init = function () {
	makeBuildings();
	makePortal();
	makeFlag();
	makeBrunn();
	makeDass();
	makeVedbod();
	makeBastu();
	makeBins();
	makeLamps();
};

Objects.update = function (dt, t) {
	for (const u of updaters) u(dt, t);
};
