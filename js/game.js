// Spelregler: dygn, fordonsschema, sysslor, stämning, liv och poäng.
const PG = window.PG;
const W = PG.World, A = PG.Audio, Gfx = PG.Gfx, P = PG.Particles;
const Game = (PG.Game = {});

const CREW = [
	{ name: 'Olle', look: { shirt: [60, 100, 150], pants: [60, 60, 70], skin: [240, 200, 170], hair: [110, 70, 40], hat: [200, 60, 40], scarf: [250, 200, 40] } },
	{ name: 'Stina', look: { shirt: [70, 130, 90], pants: [50, 50, 70], skin: [230, 190, 160], hair: [230, 200, 120], scarf: [30, 90, 170] } },
	{ name: 'Kim', look: { shirt: [210, 120, 50], pants: [60, 60, 60], skin: [170, 120, 85], hair: [30, 25, 20], hat: [40, 40, 40], scarf: [200, 40, 40] } },
	{ name: 'Ali', look: { shirt: [150, 60, 100], pants: [40, 50, 80], skin: [150, 100, 70], hair: [25, 20, 18], scarf: [40, 140, 70] } },
];
const HOMES = [[139, 67.5], [136, 68.2], [142, 68.2], [133, 67.6]];
const DAY_SPEED = 1 / 20; // game hours per real second

function freshState() {
	return {
		state: 'menu', day: 1, time: 7.0, night: false, lives: 3, score: 0, morale: 70,
		brunn: 35, dass: 20, ved: 8, bastuTemp: 18, bastuFuel: 0,
		flagUp: false, flagFrac: 0, flagTarget: 0, chopping: false, chopProgress: 0, binLift: 0,
		vehicles: [], workers: [], scouts: [], schedule: [], called: null, ev: {},
		playTime: 0, bathOk: false, bathCold: false, grass: { avg: 0.4, max: 0.7, tallFrac: 0 }, statsT: 0, overT: 0,
		toastLog: {}, stats: { sug: 0, sop: 0, baths: 0 },
		toast: (...a) => Game.toast(...a), loseLife: (m) => Game.loseLife(m), addScore: (...a) => Game.addScore(...a),
	};
}

function cleanup() {
	const S = PG.state;
	if (!S) return;
	for (const v of S.vehicles) v.dispose();
	for (const s of S.scouts) s.dispose();
	for (const w of S.workers) { w.rig.dispose(); Gfx.removePick(w.pick); }
	A.stopLoops();
}

function addWorker(i) {
	const S = PG.state;
	const c = CREW[i];
	const w = new PG.Worker(c.name, HOMES[i][0], HOMES[i][1], c.look);
	w.home = { x: HOMES[i][0], z: HOMES[i][1] };
	S.workers.push(w);
	return w;
}
function addScouts(n) {
	const S = PG.state;
	for (let i = 0; i < n; i++) S.scouts.push(new PG.Scout(S.scouts.length));
}

Game.init = function () {
	cleanup();
	PG.state = freshState();
	PG.Portal.reset();
	PG.Mower.reset();
	P.clear();
	addWorker(0); addWorker(1); addWorker(2);
	addScouts(10);
	PG.state.time = 9.5;
};

Game.newGame = function () {
	cleanup();
	PG.state = freshState();
	const S = PG.state;
	S.state = 'play';
	PG.Portal.reset();
	PG.Mower.reset();
	PG.Ground.resetGrass();
	PG.Ground.clearMarks();
	P.clear();
	addWorker(0); addWorker(1); addWorker(2);
	addScouts(10);
	scheduleDay(1);
	S.grass = PG.Ground.stats();
	Gfx.cam.goal.pitch = 0.85;
	Gfx.cam.focus(W.portal.x - 6, W.portal.z - 14, 110);
	Game.toast('Dag 1 på Härsjösand. Sugbilen kommer snart – var redo vid portalen!', 'info', 'portal');
};

function scheduleDay(day) {
	const S = PG.state;
	const list = [];
	const nS = 3 + Math.floor((day - 1) * 0.7), nP = 2 + Math.floor((day - 1) * 0.9);
	const add = (kind, n) => {
		for (let i = 0; i < n; i++) {
			let t = 0;
			for (let tries = 0; tries < 40; tries++) {
				t = PG.rand(7.8, 20.3);
				if (list.every((e) => e.kind !== kind || Math.abs(e.t - t) > 0.6)) break;
			}
			list.push({ t, kind });
		}
	};
	if (day === 1) {
		list.push({ t: 7.35, kind: 'sug' }, { t: 9.3, kind: 'sop' });
		add('sug', nS - 1);
		add('sop', nP - 1);
	} else {
		add('sug', nS);
		add('sop', nP);
		for (const e of list.slice()) if (e.kind === 'sug' && Math.random() < 0.5) list.push({ t: e.t + PG.rand(0.12, 0.3), kind: 'sop' });
	}
	const base = (day - 1) * 24;
	S.schedule = list.map((e) => ({ t: base + e.t, kind: e.kind, done: false })).sort((a, b) => a.t - b.t);
}

function newDay() {
	const S = PG.state;
	S.day++;
	S.ev = {};
	S.bathOk = false;
	S.bathCold = false;
	scheduleDay(S.day);
	if (S.day === 3 && S.workers.length < 4) { addWorker(3); Game.toast('Ali har kommit till lägret och hjälper till!', 'good'); }
	if (S.scouts.length < 20) addScouts(2);
	Game.toast(`Dag ${S.day} – god morgon! Det blir mer trafik idag.`, 'info');
}

// ---------- Messages, score and lives ----------
Game.toast = function (msg, type, focus) {
	const S = PG.state;
	const now = performance.now();
	if (S.toastLog[msg] && now - S.toastLog[msg] < 3500) return;
	S.toastLog[msg] = now;
	if (PG.UI) PG.UI.toast(msg, type || 'info', focus);
	if (type === 'warn') A.bell(false);
};

Game.addScore = function (n, msg, x, z) {
	const S = PG.state;
	S.score += n;
	if (x !== undefined) P.add('text', x, z, 4, { text: '+' + n, color: '#ffe066' });
	if (msg) Game.toast(`${msg} +${n}`, 'good');
	A.success();
};

Game.loseLife = function (msg) {
	const S = PG.state;
	if (S.state !== 'play') return;
	S.lives--;
	A.lifeLost();
	Game.toast(msg, 'bad');
	if (PG.UI) PG.UI.flash();
	if (S.lives <= 0) gameOver();
};

function gameOver() {
	const S = PG.state;
	S.state = 'over';
	S.overT = 0;
	A.stopLoops();
	A.fart(true);
	for (let i = 0; i < 10; i++) PG.Ground.addStain(W.brunn.x + PG.rand(-12, 12), W.brunn.z + PG.rand(-8, 14), PG.rand(2, 5), S.playTime);
	if (PG.UI) PG.UI.gameOver();
}

// ---------- Orders ----------
function pickWorker(x, z) {
	const S = PG.state;
	let free = S.workers.filter((w) => !w.task && !w.riding);
	if (!free.length) {
		const ch = S.workers.filter((w) => w.task && w.task.kind === 'chop');
		if (ch.length) {
			ch[0].cancel();
			S.chopping = false;
			Game.toast(`${ch[0].name} slutar hugga ved.`, 'info');
			free = ch;
		}
	}
	if (!free.length) {
		Game.toast('Alla funktionärer är upptagna!', 'bad');
		A.bell(true);
		return null;
	}
	free.sort((a, b) => PG.dist(a.x, a.z, x, z) - PG.dist(b.x, b.z, x, z));
	return free[0];
}
const busyWith = (kind) => PG.state.workers.find((w) => w.task && w.task.kind === kind);

Game.order = function (kind) {
	const S = PG.state;
	if (S.state !== 'play') return;
	const hour = S.time % 24;
	switch (kind) {
		case 'portal':
			PG.Portal.toggle();
			break;
		case 'flag': {
			if (busyWith('flag')) { Game.toast('Någon är redan på väg till flaggstången.'); return; }
			const up = !S.flagUp;
			if (up && (hour < 7.5 || hour > 20.5)) { Game.toast('Flaggan hissas på morgonen kl 08:00.'); return; }
			const F = W.flag;
			const w = pickWorker(F.x, F.z);
			if (!w) return;
			w.assign({
				kind: 'flag', label: up ? 'Hissar flaggan' : 'Halar flaggan',
				onCancel: () => { S.flagTarget = S.flagUp ? 1 : 0; },
				steps: [
					{ go: [F.x + 0.9, F.z + 0.9] },
					{
						work: -1, act: 'pull', face: [F.x, F.z],
						start: () => { S.flagTarget = up ? 1 : 0; A.flagRope(); },
						until: () => Math.abs(S.flagFrac - S.flagTarget) < 0.01,
						done: () => {
							S.flagUp = up;
							const h = S.time % 24;
							if (up && h >= 7.9 && h <= 9.05) Game.addScore(5, 'Flaggan i topp i tid!', F.x, F.z);
							else if (!up && h >= 19.5 && h <= 21.0) Game.addScore(5, 'Flaggan halad i tid!', F.x, F.z);
							else Game.toast(up ? 'Flaggan är hissad.' : 'Flaggan är halad.');
						},
					},
				],
			});
			break;
		}
		case 'dass': {
			if (busyWith('dass')) { Game.toast('Någon tömmer redan dasset.'); return; }
			if (S.dass < 12) { Game.toast('Dasset är nästan tomt.'); return; }
			const D = W.dass;
			const w = pickWorker(D.door.x, D.door.z);
			if (!w) return;
			let amount = 0;
			w.assign({
				kind: 'dass', label: 'Tömmer dasset',
				steps: [
					{ go: [D.door.x - 0.6, D.door.z] },
					{ work: 1.6, act: 'pull', face: [D.x, D.z], done: (w) => { amount = S.dass; S.dass = 0; w.carry = 'tunna'; P.burst('fly', D.door.x, D.door.z, 1.2, 6, { life: 2 }); } },
					{ go: [W.brunn.x + 3.9, W.brunn.z + 0.3] },
					{
						work: 2.0, act: 'pull', face: [W.brunn.x, W.brunn.z], start: () => A.flush(),
						done: (w) => {
							w.carry = null;
							S.brunn += amount * 0.12;
							P.burst('poop', W.brunn.x + 2, W.brunn.z, 0.6, 10, { up: 1.5, spread: 1, size: 0.1 });
							Game.toast('Dasstunnan är tömd i trekammarbrunnen.', 'good', 'dass');
						},
					},
				],
			});
			break;
		}
		case 'chop': {
			const chopper = busyWith('chop');
			if (chopper) { chopper.cancel(); S.chopping = false; Game.toast(`${chopper.name} slutar hugga ved.`); return; }
			if (S.ved >= 30) { Game.toast('Vedboden är full.'); return; }
			const C = W.chopBlock;
			const w = pickWorker(C.x, C.z);
			if (!w) return;
			w.chopT = 0;
			w.assign({
				kind: 'chop', label: 'Hugger ved',
				onCancel: () => { S.chopping = false; },
				finish: () => { S.chopping = false; Game.toast('Vedboden är full!', 'good', 'vedbod'); },
				steps: [
					{ go: [C.x + 0.95, C.z + 0.35] },
					{
						work: -1, act: 'chop', face: [C.x, C.z],
						tick: (w, dt) => {
							S.chopping = true;
							w.chopT += dt;
							if (w.chopT > 0.9) {
								w.chopT -= 0.9;
								A.chop(Gfx.visible(C.x, C.z, 50) ? 1 : 0.15);
								P.burst('chip', C.x, C.z, 0.7, 5, { up: 3, spread: 2.5, size: 0.06 });
							}
							S.chopProgress += (dt * DAY_SPEED) / 0.2;
							if (S.chopProgress >= 1) { S.chopProgress -= 1; S.ved = Math.min(30, S.ved + 1); }
						},
						until: () => S.ved >= 30,
					},
				],
			});
			break;
		}
		case 'bastu': {
			if (busyWith('bastu')) { Game.toast('Någon kör redan ved till bastun.'); return; }
			if (S.ved < 2) { Game.toast('Ingen ved i vedboden! Hugg ved först.', 'warn', 'vedbod'); return; }
			const V = W.vedbod, B = W.bastu;
			const w = pickWorker(V.x + 3.6, V.z);
			if (!w) return;
			let load = 0;
			const fetch = [V.x + 3.9, V.z];
			w.assign({
				kind: 'bastu', label: 'Kör ved till bastun',
				onCancel: (w) => { if (w.carry === 'karra') S.ved += load; },
				steps: [
					{ go: fetch },
					{ work: 1.5, act: 'pull', face: [V.x, V.z], done: (w) => { load = Math.min(6, Math.floor(S.ved)); S.ved -= load; w.carry = 'karra'; } },
					{
						go: [B.x - B.w / 2 - 1.9, B.z + 0.4], cart: true,
						onStuck: () => {
							Game.toast('Skottkärran fastnade i det långa gräset! Klipp gräsmattan först.', 'bad', 'mower');
							A.bell(true);
							return [{ go: fetch, done: (w) => { S.ved += load; load = 0; w.carry = null; } }];
						},
					},
					{
						work: 2.2, act: 'pull', face: [B.x, B.z],
						done: (w) => {
							w.carry = null;
							const was = S.bastuFuel > 0;
							S.bastuFuel += load / 6;
							load = 0;
							A.crackle(1);
							Game.toast(was ? 'Mer ved i bastukaminen.' : 'Elden i bastun är tänd!', 'good', 'bastu');
						},
					},
				],
			});
			break;
		}
		case 'mow': {
			const MW = PG.Mower;
			if (MW.driver) {
				if (MW.state === 'waitStart' || MW.state === 'stalled') { MW.tryStart(S, true); return; }
				MW.stop();
				Game.toast('Gräsklipparen kör hem.');
				return;
			}
			if (MW.state !== 'parked') return;
			const walker = busyWith('mow');
			if (walker) { Game.toast(`${walker.name} är på väg till gräsklipparen.`); return; }
			if (S.grass.avg < 0.18) { Game.toast('Gräset är redan kort.'); return; }
			const w = pickWorker(MW.x, MW.z);
			if (!w) return;
			w.assign({
				kind: 'mow', label: 'Klipper gräset',
				steps: [
					{ go: [MW.x + 1.2, MW.z + 0.6] },
					{
						work: 0.6, act: 'pull', face: [MW.x, MW.z],
						done: (w) => {
							if (MW.driver) return;
							MW.board(w);
							Game.toast('Dra igång gräsklipparen – klicka på den!', 'info', 'mower');
						},
					},
					{ work: -1, until: (w) => !w.riding },
				],
			});
			break;
		}
		case 'call': {
			if (S.called || S.vehicles.some((v) => v.kind === 'sug' && !v.dead) || S.schedule.some((e) => e.kind === 'sug' && !e.done && e.t - S.time < 1)) { Game.toast('Sugbilen är redan på väg.'); return; }
			if (hour > 20.5 || S.night) { Game.toast('Sugbilen kör inte på kvällen. Ring imorgon bitti.'); return; }
			S.called = { t: S.time + PG.rand(0.8, 1.4) };
			Game.toast(`Sugbilen är beställd och kommer ca ${PG.fmtTime(S.called.t)}.`, 'good', 'brunn');
			break;
		}
	}
};

Game.click = function (hit, ground) {
	const S = PG.state;
	if (S.state !== 'play') return;
	if (hit) {
		switch (hit.id) {
			case 'portal': return Game.order('portal');
			case 'flag': return Game.order('flag');
			case 'brunn': return Game.order('call');
			case 'vedbod': return Game.order('chop');
			case 'mower': return Game.order('mow');
			case 'worker': return Game.toast(`${hit.ref.name}: ${hit.ref.status}`);
			case 'vehicle': return Game.toast(`${hit.ref.label}: ${vehicleStatus(hit.ref)}`);
			case 'house': return PG.UI.showHouse(hit.ref);
		}
	}
	if (ground && PG.Mower.driver && PG.Mower.running() && PG.Ground.isLawnCell(ground.x, ground.z)) {
		PG.Mower.setPriority(ground.x, ground.z);
		Game.toast('Gräsklipparen kör dit härnäst.');
	}
};

function vehicleStatus(v) {
	switch (v.state) {
		case 'in': return v.waiting ? 'väntar vid portalen' : 'på väg in';
		case 'pump': return 'pumpar brunnen';
		case 'out': return v.waiting ? 'väntar på att få köra ut' : 'kör ut';
		case 'empty': return 'tömmer soptunnorna';
		case 'joy': return 'kör runt på gräsmattan!';
		case 'crashed': return 'har krockat';
		default: return 'kör iväg';
	}
}
Game.vehicleStatus = vehicleStatus;

Game.positionOf = function (id) {
	switch (id) {
		case 'portal': return { x: W.portal.x, z: W.portal.z };
		case 'flag': return W.flag;
		case 'brunn': return W.brunn;
		case 'dass': return W.dass;
		case 'vedbod': return W.vedbod;
		case 'bastu': return W.bastu;
		case 'mower': return { x: PG.Mower.x, z: PG.Mower.z };
	}
	return null;
};

// ---------- Simulation ----------
function overflow() {
	const S = PG.state;
	S.brunn = 84;
	S.morale = Math.max(0, S.morale - 15);
	for (let i = 0; i < 6; i++) PG.Ground.addStain(W.brunn.x + PG.rand(-5, 5), W.brunn.z + PG.rand(-3, 5), PG.rand(1.5, 3.5), S.playTime);
	P.burst('poop', W.brunn.x, W.brunn.z, 0.5, 40, { up: 4, spread: 5, size: 0.14 });
	A.fart(false);
	Game.loseLife('Trekammarbrunnen svämmade över!');
	if (!S.called && !S.vehicles.some((v) => v.kind === 'sug' && !v.dead)) {
		S.called = { t: S.time + 0.8 };
		Game.toast('Grannarna ringde efter sugbilen.', 'info');
	}
}

// Only one vehicle on the road at a time, and a pause after it has left the map,
// so there is always time to close the portal after the sugbil before the next sopbil arrives.
const VEHICLE_GAP = 6; // real seconds
function spawn(kind) {
	const S = PG.state;
	if (S.vehicles.length) return false;
	if (S.playTime < (S.nextVehicleAt || 0)) return false;
	S.vehicles.push(new PG.Vehicle(kind));
	return true;
}

Game.update = function (dt) {
	const S = PG.state;
	if (S.state === 'menu') {
		S.time += dt * 0.12;
		for (const s of S.scouts) s.update(dt, S);
		for (const w of S.workers) w.update(dt);
		P.update(dt);
		return;
	}
	if (S.state === 'over') {
		S.overT += dt;
		P.update(dt);
		PG.Ground.update(dt, S.playTime);
		return;
	}
	if (S.state !== 'play') return;
	S.playTime += dt;
	const speed = S.night ? 14 : 1;
	const dh = dt * speed * DAY_SPEED;
	S.time += dh;
	const hour = S.time % 24;

	if (!S.night && hour >= 22.75) {
		S.night = true;
		Game.toast('Natten faller över Härsjösand… zzz', 'info');
	}
	if (S.night && hour >= 6.75 && hour < 12) {
		S.night = false;
		newDay();
	}

	// Rates
	const diff = 1 + 0.12 * (S.day - 1);
	const active = hour >= 7 && hour < 22.5;
	S.brunn += dh * (active ? 4.6 : 1.4) * diff;
	S.dass = Math.min(110, S.dass + dh * (active ? 4.2 : 0.6) * diff);
	PG.Ground.grow(dh * 0.026 * (0.92 + 0.08 * S.day));
	const B = W.bastu;
	if (S.bastuFuel > 0) {
		S.bastuFuel = Math.max(0, S.bastuFuel - dh);
		S.bastuTemp = Math.min(95, S.bastuTemp + dh * 110);
		if (Math.random() < dt * 5) P.add('smoke', B.x - 1.2, B.z, 5.2, { up: 1.2, spread: 0.4, size: 0.45 });
		if (PG.Light.day < 0.5 && Math.random() < dt * 3) P.add('ember', B.x - 1.2, B.z, 5.2, { up: 2.5, spread: 0.8, size: 0.06 });
		if (Gfx.visible(B.x, B.z, 0) && Math.random() < dt * 5) A.crackle(0.4);
	} else S.bastuTemp = Math.max(16, S.bastuTemp - dh * 22);
	if (S.flagFrac !== S.flagTarget) {
		const d = S.flagTarget - S.flagFrac;
		S.flagFrac += Math.sign(d) * Math.min(Math.abs(d), dt * 0.28);
	}
	if (S.brunn >= 100) overflow();
	if (S.dass > 70 && Math.random() < dt * (S.dass > 100 ? 4 : 1.5)) P.add('fly', W.dass.door.x, W.dass.door.z + PG.rand(-3, 3), 1.3, { life: 3 });
	if (S.brunn > 85 && Math.random() < dt * 3) P.add('poop', W.brunn.x + PG.rand(-2, 2), W.brunn.z, 0.5, { up: 0.8, spread: 0.3, size: 0.08 });

	// Morale
	S.statsT -= dt;
	if (S.statsT <= 0) { S.statsT = 1; S.grass = PG.Ground.stats(); }
	let dm = 0;
	if (S.dass >= 100) dm -= 8;
	if (S.grass.avg > 0.9) dm -= 3;
	if (S.brunn > 90) dm -= 3;
	if (S.dass < 80 && S.grass.avg < 0.7 && S.brunn < 85) dm += 1.5;
	S.morale = PG.clamp(S.morale + dm * dh, 0, 100);
	if (S.morale <= 0) { Game.loseLife('Stämningen är i botten – scouterna vill åka hem!'); S.morale = 45; }

	// Timed events
	const ev = S.ev;
	if (!ev.flagHint && hour >= 7.75 && hour < 9 && !S.flagUp) { ev.flagHint = true; Game.toast('Dags att hissa flaggan kl 08:00 – klicka på flaggstången.', 'warn', 'flag'); }
	if (!ev.flagMorning && hour >= 9 && hour < 12) {
		ev.flagMorning = true;
		if (!S.flagUp) { S.morale -= 10; Game.toast('Flaggan hissades aldrig i morse!', 'bad', 'flag'); }
	}
	if (!ev.bastuHint && hour >= 18 && hour < 21) { ev.bastuHint = true; if (S.bastuFuel <= 0) Game.toast('Dags att elda bastun inför kvällsdoppet kl 21:00!', 'warn', 'bastu'); }
	if (!ev.flagEveHint && hour >= 20 && hour < 21 && S.flagUp) { ev.flagEveHint = true; Game.toast('Hala flaggan senast kl 21:00.', 'warn', 'flag'); }
	if (!ev.flagEvening && hour >= 21 && hour < 23) {
		ev.flagEvening = true;
		if (S.flagUp) { S.morale -= 10; Game.toast('Flaggan är fortfarande uppe efter 21:00!', 'bad', 'flag'); }
	}
	if (!ev.bath && hour >= 21.2 && hour < 23) {
		ev.bath = true;
		if (S.bastuTemp >= 65) {
			S.bathOk = true;
			S.stats.baths++;
			S.morale = Math.min(100, S.morale + 15);
			Game.addScore(20, `Bastun är ${Math.round(S.bastuTemp)}° – scouterna badar glatt i Stora Härsjön!`, B.x, B.z);
		} else {
			S.bathCold = true;
			S.morale -= 25;
			A.bell(true);
			Game.toast(`Bastun är bara ${Math.round(S.bastuTemp)}°! Scouterna blev blåa av kylan.`, 'bad', 'bastu');
		}
	}
	if (!ev.dayEnd && hour >= 22.5 && hour < 23) { ev.dayEnd = true; Game.addScore(25 * S.day, `Dag ${S.day} klar!`); }

	// Vehicles
	if (!S.night) {
		// Vehicles come one at a time, in schedule order, so the day's list slides. A visit that is
		// more than 1.5 hours late is skipped so the list doesn't pile up into the evening.
		const due = S.schedule.filter((e) => !e.done && S.time >= e.t);
		for (const e of due) if (S.time - e.t > 1.5) e.done = true;
		const next = due.find((e) => !e.done);
		if (next && spawn(next.kind)) next.done = true;
		if (S.called && S.time >= S.called.t) {
			if (spawn('sug')) S.called = null;
			else S.called.t += 0.1;
		}
	}
	PG.Portal.blocked = S.vehicles.some((v) => !v.dead && Math.abs(v.z - W.portal.z) < 5.6 && Math.abs(v.x - W.portal.x) < 4.5);
	PG.Portal.update(dt);
	for (const v of S.vehicles) v.update(dt, S, S.vehicles);
	for (let i = S.vehicles.length - 1; i >= 0; i--) {
		const v = S.vehicles[i];
		if (v.dead) {
			if (v.kind === 'sug' && v.serviced) S.stats.sug++;
			if (v.kind === 'sop' && v.served) S.stats.sop++;
			v.dispose();
			S.vehicles.splice(i, 1);
			S.nextVehicleAt = S.playTime + VEHICLE_GAP;
		}
	}

	for (const w of S.workers) w.update(dt);
	for (const s of S.scouts) s.update(dt, S);
	PG.Mower.update(dt, S);
	P.update(dt);
	PG.Ground.update(dt, S.playTime);

	// Ambience
	if (PG.Light.day > 0.5 && hour < 20 && Math.random() < dt * 0.3) A.chirp(0.7);
	if (PG.Light.day < 0.3 && Math.random() < dt * 0.8) A.cricket(0.8);
};

Game.sync = function () {
	const S = PG.state;
	for (const w of S.workers) w.sync();
	for (const s of S.scouts) s.sync();
	for (const v of S.vehicles) v.sync();
	PG.Mower.sync();
};

Game.togglePause = function () {
	const S = PG.state;
	if (S.state === 'play') { S.state = 'paused'; A.stopLoops(); }
	else if (S.state === 'paused') S.state = 'play';
	return S.state;
};
