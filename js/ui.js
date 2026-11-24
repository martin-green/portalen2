// HUD, kontroller (mus, tangentbord, touch), markörer i världen, skärmar och highscore.
const PG = window.PG;
const W = PG.World, A = PG.Audio, Gfx = PG.Gfx;
const UI = (PG.UI = {});
const $ = (id) => document.getElementById(id);
const HS_KEY = 'portalen2.highscores';

const ICONS = {
	portal: '<svg viewBox="0 0 32 32"><path d="M5 28V8M27 28V8M3 9h26M8 20h16M8 14h16M8 14l16 6M8 20l16-6" /></svg>',
	brunn: '<svg viewBox="0 0 32 32"><circle cx="7" cy="16" r="4.5"/><circle cx="16" cy="16" r="4.5"/><circle cx="25" cy="16" r="4.5"/></svg>',
	dass: '<svg viewBox="0 0 32 32"><path d="M6 28V12l10-7 10 7v16z"/><path d="M16 15c-2-3-6-1-3 2l3 3 3-3c3-3-1-5-3-2z" class="fill"/></svg>',
	flag: '<svg viewBox="0 0 32 32"><path d="M7 29V3"/><path d="M7 5h20v12H7z" class="flagbg"/><path d="M7 11h20M13 5v12" class="flagx"/></svg>',
	vedbod: '<svg viewBox="0 0 32 32"><circle cx="9" cy="22" r="5"/><circle cx="21" cy="22" r="5"/><circle cx="15" cy="12" r="5"/></svg>',
	bastu: '<svg viewBox="0 0 32 32"><path d="M4 28V15l12-8 12 8v13z"/><path d="M16 26c-4 0-5-4-2-7 0 2 2 2 2 0 0-3 3-4 3-6 3 3 3 13-3 13z" class="fill fire"/></svg>',
	mower: '<svg viewBox="0 0 32 32"><circle cx="9" cy="23" r="5"/><circle cx="25" cy="25" r="3"/><path d="M5 18h22v5M11 18v-6h6M24 18l-3-8"/></svg>',
};

const CARDS = [
	{ id: 'portal', title: 'Portalen', key: 'Mellanslag' },
	{ id: 'brunn', title: 'Trekammarbrunnen', key: '6' },
	{ id: 'dass', title: 'Utedasset', key: '2' },
	{ id: 'flag', title: 'Flaggan', key: '1' },
	{ id: 'vedbod', title: 'Vedboden', key: '3' },
	{ id: 'bastu', title: 'Bastun', key: '4' },
	{ id: 'mower', title: 'Gräsmattan', key: '5' },
];
const cardEls = {};

UI.init = function () {
	const tasks = $('tasks');
	for (const c of CARDS) {
		const el = document.createElement('div');
		el.className = 'card';
		el.innerHTML = `<div class="ico">${ICONS[c.id]}</div><div class="body"><div class="title"></div><div class="status"></div><div class="meter"><i></i></div></div><button class="act"></button>`;
		el.querySelector('.title').textContent = c.title;
		el.querySelector('.ico').title = `Visa ${c.title.toLowerCase()}`;
		el.querySelector('.ico').addEventListener('click', () => focusOn(c.id));
		el.querySelector('.title').addEventListener('click', () => focusOn(c.id));
		el.querySelector('.act').addEventListener('click', (e) => { e.stopPropagation(); A.init(); cardAction(c.id); });
		el.querySelector('.act').title = `Kortkommando: ${c.key}`;
		tasks.appendChild(el);
		cardEls[c.id] = { el, status: el.querySelector('.status'), meter: el.querySelector('.meter i'), meterBox: el.querySelector('.meter'), btn: el.querySelector('.act') };
	}
	$('btnStart').addEventListener('click', startGame);
	$('btnAgain').addEventListener('click', startGame);
	$('btnResume').addEventListener('click', () => togglePause());
	$('btnPause').addEventListener('click', () => togglePause());
	$('btnHelp').addEventListener('click', () => showHelp(true));
	$('btnHelp2').addEventListener('click', () => showHelp(true));
	$('btnHelpClose').addEventListener('click', () => showHelp(false));
	$('btnMute').addEventListener('click', toggleMute);
	$('btnSave').addEventListener('click', saveScore);
	$('btnMenu').addEventListener('click', () => { show('screen-over', false); show('screen-start', true); $('hud').classList.add('hidden'); PG.Game.init(); });
	$('hsName').value = localStorage.getItem('portalen2.name') || '';
	$('btnPortal').addEventListener('click', () => { A.init(); PG.Game.order('portal'); });
	$('houseClose').addEventListener('click', () => UI.hideHouse());
	updateMuteBtn();
	renderHighscores($('hsStart'));
	initInput();
	document.addEventListener('visibilitychange', () => { if (document.hidden && PG.state.state === 'play') togglePause(); });
	Gfx.cam.goal.yaw = 0.35;
	Gfx.cam.focus(165, 85, 170);
	Gfx.cam.snap();
};

function show(id, on) { $(id).classList.toggle('hidden', !on); }

function startGame() {
	A.init();
	show('screen-start', false);
	show('screen-over', false);
	$('hud').classList.remove('hidden');
	$('toasts').innerHTML = '';
	PG.Game.newGame();
}

function togglePause() {
	const s = PG.Game.togglePause();
	show('screen-pause', s === 'paused');
}
function showHelp(on) {
	show('screen-help', on);
	if (on && PG.state.state === 'play') togglePause();
}
function toggleMute() { A.init(); A.setMuted(!A.muted); updateMuteBtn(); }
function updateMuteBtn() { $('btnMute').classList.toggle('off', A.muted); $('btnMute').title = A.muted ? 'Ljud av (M)' : 'Ljud på (M)'; }

function focusOn(id) {
	const p = PG.Game.positionOf(id);
	if (p) Gfx.cam.focus(p.x, p.z + 6, Math.min(Gfx.cam.goal.dist, 70));
}

function cardAction(id) {
	const map = { portal: 'portal', brunn: 'call', dass: 'dass', flag: 'flag', vedbod: 'chop', bastu: 'bastu', mower: 'mow' };
	PG.Game.order(map[id]);
}

// ---------- Toasts, flash, floating text ----------
UI.toast = function (msg, type, focus) {
	const box = $('toasts');
	const el = document.createElement('div');
	el.className = 'toast ' + type;
	el.textContent = msg;
	if (focus) { el.classList.add('link'); el.addEventListener('click', () => focusOn(focus)); }
	box.prepend(el);
	while (box.children.length > 4) box.lastChild.remove();
	setTimeout(() => el.classList.add('out'), 4200);
	setTimeout(() => el.remove(), 4800);
};
UI.flash = function () {
	const f = $('flash');
	f.classList.remove('on');
	void f.offsetWidth;
	f.classList.add('on');
};
UI.floatText = function (x, z, h, text, color) {
	const p = Gfx.project(x, z, h);
	if (p.behind || p.x < 0 || p.y < 0 || p.x > p.w || p.y > p.h) return;
	const el = document.createElement('div');
	el.className = 'float';
	el.textContent = text;
	el.style.left = p.x + 'px';
	el.style.top = p.y + 'px';
	if (color) el.style.color = color;
	$('labels').appendChild(el);
	setTimeout(() => el.remove(), 1700);
};

// ---------- Game over and highscores ----------
function loadScores() {
	try {
		const v = JSON.parse(localStorage.getItem(HS_KEY) || '[]');
		return Array.isArray(v) ? v.filter((e) => e && typeof e.name === 'string' && Number.isFinite(e.score)) : [];
	} catch { return []; }
}
function renderHighscores(ol, highlight) {
	ol.innerHTML = '';
	const list = loadScores();
	if (!list.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Inga resultat ännu'; ol.appendChild(li); return; }
	list.forEach((e, i) => {
		const li = document.createElement('li');
		if (i === highlight) li.className = 'me';
		const n = document.createElement('span'); n.textContent = e.name;
		const s = document.createElement('b'); s.textContent = e.score;
		const d = document.createElement('small'); d.textContent = `dag ${e.day}`;
		li.append(n, d, s);
		ol.appendChild(li);
	});
}
let saved = false;
UI.gameOver = function () {
	saved = false;
	setTimeout(() => {
		const S = PG.state;
		$('overScore').textContent = S.score;
		$('overDay').textContent = S.day;
		$('overStats').textContent = `Sugbilar: ${S.stats.sug} · Sopbilar: ${S.stats.sop} · Varma bastukvällar: ${S.stats.baths}`;
		$('hsEntry').classList.remove('hidden');
		renderHighscores($('hsOver'));
		show('screen-over', true);
		$('hsName').focus();
	}, 4200);
};
function saveScore() {
	if (saved) return;
	const S = PG.state;
	const name = ($('hsName').value || 'Anonym').trim().slice(0, 14) || 'Anonym';
	localStorage.setItem('portalen2.name', name);
	const list = loadScores();
	const entry = { name, score: S.score, day: S.day, date: new Date().toISOString().slice(0, 10) };
	list.push(entry);
	list.sort((a, b) => b.score - a.score);
	const top = list.slice(0, 10);
	localStorage.setItem(HS_KEY, JSON.stringify(top));
	saved = true;
	$('hsEntry').classList.add('hidden');
	renderHighscores($('hsOver'), top.indexOf(entry));
	renderHighscores($('hsStart'));
}

// ---------- Input ----------
const pointers = new Map();
let drag = null;
function initInput() {
	const cv = $('view');
	cv.addEventListener('contextmenu', (e) => e.preventDefault());
	cv.addEventListener('pointerdown', (e) => {
		A.init();
		cv.setPointerCapture(e.pointerId);
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pointers.size === 1) {
			drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, button: e.button, moved: false, shift: e.shiftKey };
		} else if (pointers.size === 2) {
			drag = { multi: true, moved: true, ...pinchInfo() };
		}
	});
	cv.addEventListener('pointermove', (e) => {
		if (!pointers.has(e.pointerId)) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (!drag) return;
		const cam = Gfx.cam;
		if (drag.multi && pointers.size >= 2) {
			const p = pinchInfo();
			cam.goal.dist *= drag.d / p.d;
			cam.goal.yaw -= p.a - drag.a;
			const g0 = Gfx.groundAt(drag.mx, drag.my), g1 = Gfx.groundAt(p.mx, p.my);
			if (g0 && g1) { cam.goal.tx += g0.x - g1.x; cam.goal.tz += g0.z - g1.z; }
			Object.assign(drag, p);
			cam.clamp();
			return;
		}
		const px = drag.x, py = drag.y;
		const dx = e.clientX - px, dy = e.clientY - py;
		if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true;
		drag.x = e.clientX; drag.y = e.clientY;
		if (!drag.moved) return;
		if (drag.button === 2 || drag.shift) {
			cam.goal.yaw -= dx * 0.006;
			cam.goal.pitch += dy * 0.004;
		} else {
			// Incremental delta from the same camera state; the camera matrix only updates once per frame.
			const g0 = Gfx.groundAt(px, py), g1 = Gfx.groundAt(e.clientX, e.clientY);
			if (g0 && g1) {
				const lim = cam.dist * 0.25;
				const ddx = PG.clamp(g0.x - g1.x, -lim, lim), ddz = PG.clamp(g0.z - g1.z, -lim, lim);
				cam.goal.tx += ddx; cam.goal.tz += ddz;
				cam.tx += ddx; cam.tz += ddz;
			}
		}
		cam.clamp();
	});
	const up = (e) => {
		pointers.delete(e.pointerId);
		if (drag && !drag.moved && !drag.multi && drag.button === 0) handleClick(e.clientX, e.clientY);
		if (pointers.size === 0) drag = null;
		else if (pointers.size === 1) { const [p] = pointers.values(); drag = { x0: p.x, y0: p.y, x: p.x, y: p.y, button: 0, moved: true }; }
	};
	cv.addEventListener('pointerup', up);
	cv.addEventListener('pointercancel', up);
	cv.addEventListener('wheel', (e) => {
		e.preventDefault();
		const cam = Gfx.cam;
		const f = Math.pow(1.0015, e.deltaY);
		const g = Gfx.groundAt(e.clientX, e.clientY);
		const before = cam.goal.dist;
		cam.goal.dist = PG.clamp(cam.goal.dist * f, 18, 280);
		const k = 1 - cam.goal.dist / before;
		if (g && k > 0) { cam.goal.tx += (g.x - cam.goal.tx) * k; cam.goal.tz += (g.z - cam.goal.tz) * k; }
		cam.clamp();
	}, { passive: false });
	window.addEventListener('keydown', onKey);
}
function pinchInfo() {
	const [a, b] = [...pointers.values()];
	return { d: Math.max(10, Math.hypot(b.x - a.x, b.y - a.y)), a: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
}
function handleClick(x, y) {
	const hit = Gfx.pick(x, y);
	const ground = Gfx.groundAt(x, y);
	if (house.open) {
		if (hit && hit.id === 'house') UI.showHouse(hit.ref);
		return;
	}
	PG.Game.click(hit, ground);
}

// ---------- House detail view ----------
const house = { open: null, cam: null, pausedByUs: false, t: 0 };
const fmtM = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');

// Footprint parts in house-local meters: [{x0, z0, x1, z1, ridge}]
function houseParts(ref) {
	if (ref.parts) return ref.parts.map((p) => ({ x0: p.dx - p.w / 2, x1: p.dx + p.w / 2, z0: p.dz - p.d / 2, z1: p.dz + p.d / 2, ridge: p.shed ? null : p.ridge }));
	const w = ref.size ? ref.size[0] : ref.w, d = ref.size ? ref.size[1] : ref.d;
	return [{ x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2, ridge: ref.ridge || null }];
}
function footprint(parts) {
	const b = { x0: Math.min(...parts.map((p) => p.x0)), x1: Math.max(...parts.map((p) => p.x1)), z0: Math.min(...parts.map((p) => p.z0)), z1: Math.max(...parts.map((p) => p.z1)) };
	// Union area by sampling (parts may overlap).
	let n = 0;
	const s = 0.1;
	for (let x = b.x0 + s / 2; x < b.x1; x += s) for (let z = b.z0 + s / 2; z < b.z1; z += s) if (parts.some((p) => x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1)) n++;
	return { ...b, area: n * s * s };
}
function drawPlan(svg, parts, fp, rot) {
	const W0 = 120, H0 = 90, pad = 12;
	const span = Math.max(fp.x1 - fp.x0, fp.z1 - fp.z0) * (rot ? 1.15 : 1);
	const k = Math.min((W0 - 2 * pad) / span, (H0 - 2 * pad) / span);
	const cx = (fp.x0 + fp.x1) / 2, cz = (fp.z0 + fp.z1) / 2;
	let g = `<g transform="translate(${W0 / 2} ${H0 / 2}) rotate(${((rot || 0) * 180) / Math.PI}) scale(${k}) translate(${-cx} ${-cz})">`;
	for (const p of parts) g += `<rect class="wall" x="${p.x0}" y="${p.z0}" width="${p.x1 - p.x0}" height="${p.z1 - p.z0}" vector-effect="non-scaling-stroke"/>`;
	for (const p of parts) {
		if (p.ridge === 'x') g += `<line class="ridge" x1="${p.x0}" y1="${(p.z0 + p.z1) / 2}" x2="${p.x1}" y2="${(p.z0 + p.z1) / 2}" vector-effect="non-scaling-stroke"/>`;
		if (p.ridge === 'z') g += `<line class="ridge" x1="${(p.x0 + p.x1) / 2}" y1="${p.z0}" x2="${(p.x0 + p.x1) / 2}" y2="${p.z1}" vector-effect="non-scaling-stroke"/>`;
	}
	g += '</g>';
	g += `<path class="north" d="M110 16V5M106 9l4-4 4 4"/><text x="107.5" y="24">N</text>`;
	g += `<text x="4" y="86">${fmtM(fp.x1 - fp.x0)} × ${fmtM(fp.z1 - fp.z0)} m</text>`;
	svg.innerHTML = g;
}

function houseLive(ref) {
	const S = PG.state;
	const rows = [];
	const acts = [];
	if (W.sleepHouses.includes(ref.id)) {
		const mine = S.scouts.filter((s) => s.house === ref);
		const inside = mine.filter((s) => s.state === 'inside').length;
		rows.push(['Scouter som bor här', `${mine.length}`], ['Inne just nu', `${inside}`]);
	}
	const busy = (kind) => S.workers.find((w) => w.task && w.task.kind === kind);
	if (ref.task === 'bastu') {
		const bw = busy('bastu');
		rows.push(['Temperatur', `${Math.round(S.bastuTemp)}°` + (S.bastuFuel > 0 ? ' · eldas' : '')], ['Kvällsdopp', 'kl 21:00, minst 65°']);
		if (bw) rows.push(['Ved', `${bw.name} kör ved hit`]);
		acts.push(['Elda bastun', 'bastu']);
	} else if (ref.task === 'vedbod') {
		const cw = busy('chop');
		rows.push(['Ved i boden', `${Math.floor(S.ved)} av 30`]);
		if (cw) rows.push(['Huggs nu av', cw.name]);
		acts.push([cw ? 'Sluta hugga' : 'Hugg ved', 'chop']);
	} else if (ref.task === 'dass') {
		const dw = busy('dass');
		rows.push(['Tunnan', `${Math.round(Math.min(100, S.dass))} % full`]);
		if (dw) rows.push(['Töms nu av', dw.name]);
		acts.push(['Töm dasset', 'dass']);
	} else if (ref.id === 'ladan') {
		rows.push(['Trekammarbrunnen', `${Math.round(S.brunn)} % full`]);
	}
	return { rows, acts };
}

function renderHouse() {
	const ref = house.open;
	const parts = houseParts(ref);
	const fp = footprint(parts);
	$('houseType').textContent = ref.type || 'Byggnad';
	$('houseName').textContent = ref.name;
	$('houseInfo').textContent = ref.info || '';
	drawPlan($('housePlan'), parts, fp, ref.rot);
	const live = houseLive(ref);
	const rows = [['Yttermått', `${fmtM(fp.x1 - fp.x0)} × ${fmtM(fp.z1 - fp.z0)} m`], ['Byggnadsyta', `ca ${Math.round(fp.area)} m²`], ['Nockhöjd', `ca ${fmtM(ref.hr || ref.height)} m`]].concat(live.rows);
	const dl = $('houseFacts');
	dl.innerHTML = '';
	for (const [k, v] of rows) {
		const dt = document.createElement('dt'), dd = document.createElement('dd');
		dt.textContent = k;
		dd.textContent = v;
		dl.append(dt, dd);
	}
	const box = $('houseActions');
	const key = live.acts.map((a) => a[0]).join('|');
	if (box.dataset.key !== key) {
		box.dataset.key = key;
		box.innerHTML = '';
		for (const [label, order] of live.acts) {
			const b = document.createElement('button');
			b.textContent = label;
			b.addEventListener('click', () => { A.init(); UI.hideHouse(); PG.Game.order(order); });
			box.appendChild(b);
		}
	}
}

UI.showHouse = function (ref) {
	const S = PG.state;
	if (!house.open) {
		const g = Gfx.cam.goal;
		house.cam = { tx: g.tx, tz: g.tz, dist: g.dist, yaw: g.yaw, pitch: g.pitch };
		house.pausedByUs = false;
		if (S.state === 'play') { PG.Game.togglePause(); house.pausedByUs = true; }
	}
	house.open = ref;
	house.t = 0;
	$('house').classList.remove('hidden');
	document.body.classList.add('house-open');
	$('houseActions').dataset.key = '';
	renderHouse();
	// Fly to the house and look at it from a little lower angle; UI.update keeps the camera slowly circling.
	const parts = houseParts(ref);
	const fp = footprint(parts);
	const size = Math.max(fp.x1 - fp.x0, fp.z1 - fp.z0, ref.hr || ref.height || 3);
	const cam = Gfx.cam;
	// High enough to look over the spruces (up to ~18 m) around the houses at the forest edge.
	cam.goal.pitch = 0.72;
	cam.focus(ref.cx, ref.cz, PG.clamp(size * 2.4 + 18, 30, 80));
	// Keep the house clear of the panel on wide screens by aiming a bit to its left (as seen on screen).
	if (window.innerWidth > 760) {
		const sh = size * 0.45;
		cam.goal.tx -= Math.cos(cam.goal.yaw) * sh;
		cam.goal.tz += Math.sin(cam.goal.yaw) * sh;
	} else {
		// Phone: the panel covers the lower half, so aim past the house towards the camera to lift it up on screen.
		const sh = size * 0.5 + 8;
		cam.goal.tx += Math.sin(cam.goal.yaw) * sh;
		cam.goal.tz += Math.cos(cam.goal.yaw) * sh;
	}
};

UI.hideHouse = function () {
	if (!house.open) return;
	house.open = null;
	$('house').classList.add('hidden');
	document.body.classList.remove('house-open');
	if (house.cam) Object.assign(Gfx.cam.goal, house.cam);
	Gfx.cam.clamp();
	if (house.pausedByUs && PG.state.state === 'paused' && $('screen-pause').classList.contains('hidden')) PG.Game.togglePause();
	house.pausedByUs = false;
};

function updateHouse(dt) {
	if (!house.open) return;
	if (PG.state.state === 'menu' || PG.state.state === 'over') { UI.hideHouse(); return; }
	const cam = Gfx.cam;
	const r = dt * 0.12;
	cam.goal.yaw += r;
	// Rotate the aim offset with the camera so the house stays put on screen.
	const ox = cam.goal.tx - house.open.cx, oz = cam.goal.tz - house.open.cz;
	const c = Math.cos(r), s = Math.sin(r);
	cam.goal.tx = house.open.cx + ox * c + oz * s;
	cam.goal.tz = house.open.cz - ox * s + oz * c;
	house.t -= dt;
	if (house.t <= 0) { house.t = 0.25; renderHouse(); }
}
function onKey(e) {
	if (e.target && e.target.tagName === 'INPUT') { if (e.key === 'Enter') saveScore(); return; }
	const S = PG.state;
	const cam = Gfx.cam;
	const k = e.key.toLowerCase();
	const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), step = cam.dist * 0.08;
	let handled = true;
	switch (k) {
		case 'arrowup': if (S.state === 'play') PG.Portal.open(); break;
		case 'arrowdown': if (S.state === 'play') PG.Portal.close(); break;
		case ' ': if (S.state === 'play') PG.Game.order('portal'); else if (S.state === 'menu') startGame(); break;
		case '1': PG.Game.order('flag'); break;
		case '2': PG.Game.order('dass'); break;
		case '3': PG.Game.order('chop'); break;
		case '4': PG.Game.order('bastu'); break;
		case '5': PG.Game.order('mow'); break;
		case '6': PG.Game.order('call'); break;
		case 'w': cam.goal.tx += fx * step; cam.goal.tz += fz * step; break;
		case 's': cam.goal.tx -= fx * step; cam.goal.tz -= fz * step; break;
		case 'a': cam.goal.tx += fz * step; cam.goal.tz -= fx * step; break;
		case 'd': cam.goal.tx -= fz * step; cam.goal.tz += fx * step; break;
		case 'q': cam.goal.yaw += 0.25; break;
		case 'e': cam.goal.yaw -= 0.25; break;
		case 'r': cam.goal.pitch += 0.1; break;
		case 'f': cam.goal.pitch -= 0.1; break;
		case '+': case '=': cam.goal.dist *= 0.85; break;
		case '-': cam.goal.dist *= 1.18; break;
		case 'c': focusOn('portal'); break;
		case 'p': case 'escape':
			if (k === 'escape' && house.open) UI.hideHouse();
			else if (!$('screen-help').classList.contains('hidden')) showHelp(false);
			else if (S.state === 'play' || S.state === 'paused') togglePause();
			break;
		case 'm': toggleMute(); break;
		case 'h': case '?': showHelp($('screen-help').classList.contains('hidden')); break;
		default: handled = false;
	}
	if (handled) { e.preventDefault(); cam.clamp(); }
}

// ---------- Per-frame HUD ----------
let hudT = 0;
const markerEls = new Map();

function tentSvg(lost) {
	return `<svg viewBox="0 0 40 30" class="tent${lost ? ' lost' : ''}"><path d="M2 28 L20 4 L38 28 Z"/><path d="M20 4 L14 28 M20 4 L26 28" class="door"/>${lost ? '<path d="M4 4 L36 28 M36 4 L4 28" class="x"/>' : ''}</svg>`;
}
let livesShown = -1;

function setCard(id, status, meter, btnText, opts) {
	const c = cardEls[id];
	opts = opts || {};
	if (c.status.textContent !== status) c.status.textContent = status;
	if (meter === null) c.meterBox.style.display = 'none';
	else {
		c.meterBox.style.display = '';
		c.meter.style.width = Math.round(PG.clamp(meter, 0, 1) * 100) + '%';
		c.meter.className = opts.level || '';
	}
	if (c.btn.textContent !== btnText) c.btn.textContent = btnText;
	c.btn.disabled = !!opts.disabled;
	c.el.classList.toggle('alert', !!opts.alert);
	c.el.classList.toggle('busy', !!opts.busy);
}

function updateHud() {
	const S = PG.state;
	const hour = S.time % 24;
	$('day').textContent = `Dag ${S.day}`;
	$('time').textContent = PG.fmtTime(hour);
	$('clock').classList.toggle('night', PG.Light.day < 0.4);
	if (livesShown !== S.lives) {
		livesShown = S.lives;
		$('lives').innerHTML = [0, 1, 2].map((i) => tentSvg(i >= S.lives)).join('');
	}
	$('score').textContent = S.score;
	const mb = $('morale').querySelector('i');
	mb.style.width = Math.round(S.morale) + '%';
	mb.className = S.morale < 25 ? 'bad' : S.morale < 50 ? 'warn' : '';
	const Pt = PG.Portal;
	const busy = (kind) => S.workers.find((w) => w.task && w.task.kind === kind);
	const lvl = (v, w, b) => (v >= b ? 'bad' : v >= w ? 'warn' : '');
	// Portal
	const approaching = S.vehicles.filter((v) => !v.dead && ((v.state === 'in' && !v.passed) || (v.state === 'out' && !v.passed) || v.state === 'empty' || (v.state === 'joy' && !v.exited)));
	const needOpen = approaching.some((v) => v.kind === 'sug' || v.state === 'joy');
	const needClose = approaching.some((v) => v.kind === 'sop' && v.state !== 'joy');
	const pStatus = Pt.frac >= 0.95 ? 'Öppen' : Pt.frac <= 0.02 ? 'Stängd' : Pt.target > 0.5 ? 'Öppnas…' : 'Stängs…';
	const pInfo = approaching.length ? ' · ' + approaching.map((v) => (v.kind === 'sug' ? 'sugbil' : 'sopbil')).join(', ') : '';
	setCard('portal', pStatus + pInfo, null, Pt.target > 0.5 ? 'Stäng' : 'Öppna', { alert: (needOpen && Pt.target < 0.5) || (needClose && Pt.frac > 0.02) });
	$('btnPortal').textContent = Pt.target > 0.5 ? 'Stäng portalen' : 'Öppna portalen';
	$('btnPortal').classList.toggle('open', Pt.target > 0.5);
	$('btnPortal').classList.toggle('alert', (needOpen && Pt.target < 0.5) || (needClose && Pt.frac > 0.02));
	// Brunn
	const sugActive = S.vehicles.find((v) => v.kind === 'sug' && !v.dead);
	const brunnTxt = `${Math.round(S.brunn)} %` + (sugActive ? ` · sugbil ${Game().vehicleStatus(sugActive)}` : S.called ? ` · sugbil ca ${PG.fmtTime(S.called.t)}` : '');
	setCard('brunn', brunnTxt, S.brunn / 100, 'Ring sugbil', { level: lvl(S.brunn, 70, 88), alert: S.brunn > 80 && !sugActive && !S.called, disabled: !!(sugActive || S.called) });
	// Dass
	setCard('dass', `${Math.round(Math.min(100, S.dass))} %` + (busy('dass') ? ` · ${busy('dass').name} tömmer` : ''), S.dass / 100, 'Töm', { level: lvl(S.dass, 70, 95), alert: S.dass > 85 && !busy('dass'), busy: !!busy('dass') });
	// Flag
	const fw = busy('flag');
	const flagAlert = (!S.flagUp && hour >= 7.75 && hour < 9) || (S.flagUp && hour >= 20 && hour < 21);
	setCard('flag', (S.flagUp ? 'Hissad' : 'Halad') + (fw ? ` · ${fw.name} ${fw.status.toLowerCase()}` : S.flagUp ? ' · halas senast 21:00' : ' · hissas 08:00'), null, S.flagUp ? 'Hala' : 'Hissa', { alert: flagAlert && !fw, busy: !!fw });
	// Vedbod
	const cw = busy('chop');
	setCard('vedbod', `${Math.floor(S.ved)} ved` + (cw ? ` · ${cw.name} hugger` : ''), S.ved / 30, cw ? 'Sluta hugga' : 'Hugg ved', { level: S.ved < 6 ? 'warn' : '', alert: S.ved < 6 && !cw, busy: !!cw });
	// Bastu
	const bw = busy('bastu');
	const bastuAlert = hour >= 17.75 && hour < 21 && S.bastuTemp < 65 && S.bastuFuel <= 0.05 && !bw;
	setCard('bastu', `${Math.round(S.bastuTemp)}°` + (S.bastuFuel > 0 ? ' · eldas' : '') + (bw ? ` · ${bw.name} kör ved` : hour < 21 && hour > 12 ? ' · 65° till kl 21' : ''), S.bastuTemp / 90, 'Elda', { level: S.bastuTemp >= 65 ? 'good' : '', alert: bastuAlert, busy: !!bw });
	// Mower
	const MW = PG.Mower;
	const mStat = { parked: 'parkerad', waitStart: 'startar inte…', stalled: 'tjuvstannade!', pick: 'klipper', transit: 'klipper', mowing: 'klipper', returning: 'kör hem' }[MW.state] || '';
	const mBtn = MW.driver ? (MW.state === 'waitStart' || MW.state === 'stalled' ? 'Dra igång!' : 'Kör hem') : 'Klipp';
	setCard('mower', `Längd ${Math.round(S.grass.avg * 100)} % · ${Math.round(S.grass.tallFrac * 100)} % för långt · klippare ${mStat}`, S.grass.avg / 1.2, mBtn, {
		level: lvl(S.grass.avg, 0.65, 0.9), alert: MW.state === 'waitStart' || MW.state === 'stalled' || (S.grass.tallFrac > 0.2 && !MW.driver), busy: !!MW.driver,
	});
	// Crew
	const crew = $('crew');
	if (crew.children.length !== S.workers.length) {
		crew.innerHTML = '';
		for (const w of S.workers) {
			const el = document.createElement('div');
			el.className = 'crew';
			el.innerHTML = '<i></i><b></b><span></span>';
			el.querySelector('i').style.background = PG.rgbStr(...w.look.shirt);
			el.querySelector('b').textContent = w.name;
			el.addEventListener('click', () => Gfx.cam.focus(w.x, w.z + 4, Math.min(Gfx.cam.goal.dist, 50)));
			crew.appendChild(el);
		}
	}
	S.workers.forEach((w, i) => {
		const el = crew.children[i];
		const st = w.status;
		const sp = el.querySelector('span');
		if (sp.textContent !== st) sp.textContent = st;
		el.classList.toggle('busy', !!w.task);
	});
}
const Game = () => PG.Game;

function markerList() {
	const S = PG.state;
	const out = [];
	if (S.state !== 'play' && S.state !== 'paused') return out;
	const hour = S.time % 24;
	const Pt = PG.Portal;
	for (const v of S.vehicles) {
		if (v.dead) continue;
		let cls = 'veh ' + v.kind, txt = v.kind === 'sug' ? 'Sugbil' : 'Sopbil';
		const wantsIn = v.kind === 'sug' && (v.state === 'in' || v.state === 'out') && !v.passed;
		if (wantsIn && Pt.target < 0.5) { cls += ' urgent'; txt += ' – öppna!'; }
		if (v.kind === 'sop' && (v.state === 'in' || v.state === 'empty') && Pt.frac > 0.02) { cls += ' urgent'; txt += ' – stäng!'; }
		if (v.state === 'joy' && !v.exited && v.waiting) { cls += ' urgent'; txt += ' – släpp ut!'; }
		out.push({ key: 'v' + v.id, x: v.x, z: v.z, h: 4.4, txt, cls, edge: true });
	}
	const add = (key, p, h, txt, cls) => out.push({ key, x: p.x, z: p.z, h, txt, cls: 'task ' + (cls || ''), edge: true });
	const busy = (kind) => S.workers.some((w) => w.task && w.task.kind === kind);
	if (!S.flagUp && hour >= 7.75 && hour < 9 && !busy('flag')) add('flag', W.flag, 11, 'Hissa flaggan!');
	if (S.flagUp && hour >= 20 && hour < 21 && !busy('flag')) add('flag', W.flag, 11, 'Hala flaggan!');
	if (S.brunn > 80) add('brunn', W.brunn, 2.5, `Brunnen ${Math.round(S.brunn)} %`, S.brunn > 92 ? 'urgent' : '');
	if (S.dass > 85 && !busy('dass')) add('dass', W.dass, 4, 'Dasset är fullt!', S.dass >= 100 ? 'urgent' : '');
	if (hour >= 17.75 && hour < 21 && S.bastuTemp < 65 && S.bastuFuel <= 0.05 && !busy('bastu')) add('bastu', W.bastu, 5, 'Elda bastun!', hour > 19 ? 'urgent' : '');
	const MW = PG.Mower;
	if (MW.state === 'waitStart' || MW.state === 'stalled') add('mower', MW, 2.6, 'Klicka – dra igång!', 'urgent');
	if (S.ved < 4 && !S.chopping) add('vedbod', W.vedbod, 4, 'Ont om ved');
	if (Gfx.cam.dist < 110) for (const w of S.workers) if (!w.riding && !w.hidden) out.push({ key: 'w' + w.name, x: w.x, z: w.z, h: 2.4, txt: w.name, cls: 'name' + (w.task ? ' busy' : '') });
	return out;
}

function updateMarkers() {
	const list = markerList();
	const seen = new Set();
	const box = $('labels');
	for (const m of list) {
		seen.add(m.key);
		let el = markerEls.get(m.key);
		if (!el) {
			el = document.createElement('div');
			el.innerHTML = '<span></span><i></i>';
			box.appendChild(el);
			markerEls.set(m.key, el);
		}
		const sp = el.firstChild;
		if (sp.textContent !== m.txt) sp.textContent = m.txt;
		const p = Gfx.project(m.x, m.z, m.h);
		const pad = 46, padBottom = 90;
		let x = p.x, y = p.y;
		const off = p.behind || x < pad || y < pad + 40 || x > p.w - pad || y > p.h - padBottom;
		const cls = 'marker ' + m.cls + (off ? ' edge' : '');
		if (el.className !== cls) el.className = cls;
		if (off && !m.edge) { el.style.display = 'none'; continue; }
		el.style.display = '';
		if (off) {
			let dx = x - p.w / 2, dy = y - p.h / 2;
			if (p.behind) { dx = -dx; dy = -dy; }
			const s = Math.min((p.w / 2 - pad) / Math.max(1, Math.abs(dx)), (p.h / 2 - padBottom) / Math.max(1, Math.abs(dy)));
			x = p.w / 2 + dx * s; y = p.h / 2 + dy * s;
			el.lastChild.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
		}
		el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
	}
	for (const [k, el] of markerEls) if (!seen.has(k)) { el.remove(); markerEls.delete(k); }
}

UI.update = function (dt) {
	const S = PG.state;
	if (S.state === 'menu') Gfx.cam.goal.yaw += dt * 0.03;
	updateHouse(dt);
	hudT -= dt;
	if (hudT <= 0 && S.state !== 'menu') { hudT = 0.1; updateHud(); }
	updateMarkers();
	const flood = $('flood');
	if (S.state === 'over') {
		flood.style.display = 'block';
		flood.style.height = Math.min(100, S.overT * 28) + '%';
	} else flood.style.display = 'none';
};
