// Rörliga figurer: partiklar, funktionärer, scouter, fordon och åkgräsklipparen (logik + 3D-synk).
import * as THREE from 'three';

const PG = window.PG;
const W = PG.World, M = PG.Mesh, L = PG.Light, A = PG.Audio, Gfx = PG.Gfx;

// ---------- Partiklar ----------
const P = (PG.Particles = { list: [] });
const PT = {
	smoke: { c: [160, 160, 160], grav: -0.6, drag: 0.6, grow: 0.9, life: 3.5, a: 0.45 },
	black: { c: [40, 40, 40], grav: -0.8, drag: 0.8, grow: 1.4, life: 1.6, a: 0.7 },
	exhaust: { c: [110, 110, 110], grav: -0.4, drag: 1.2, grow: 0.6, life: 1.0, a: 0.3 },
	spark: { c: [255, 200, 80], grav: 6, drag: 0.4, grow: 0, life: 0.8, a: 1, glow: true },
	ember: { c: [255, 140, 40], grav: -1.2, drag: 0.5, grow: 0, life: 1.6, a: 1, glow: true },
	chip: { c: [205, 165, 110], grav: 9, drag: 0.3, grow: 0, life: 0.9, a: 1 },
	grass: { c: [110, 170, 70], grav: 7, drag: 0.6, grow: 0, life: 0.8, a: 1 },
	splash: { c: [210, 230, 245], grav: 9, drag: 0.3, grow: 0, life: 0.9, a: 0.9 },
	poop: { c: [105, 68, 28], grav: 9, drag: 0.3, grow: 0, life: 1.4, a: 1 },
	fly: { c: [20, 20, 20], grav: 0, drag: 0, grow: 0, life: 3, a: 1 },
	ripple: { c: [210, 230, 245], grav: 0, drag: 0, grow: 1.5, life: 1.2, a: 0.7, ring: true },
	cold: { c: [170, 210, 255], grav: -0.8, drag: 0.5, grow: 0.2, life: 1.2, a: 0.8 },
};
P.add = function (type, x, z, h, o) {
	o = o || {};
	if (type === 'text') { if (PG.UI) PG.UI.floatText(x, z, h, o.text, o.color); return; }
	const t = PT[type];
	if (P.list.length > 850) P.list.shift();
	P.list.push({
		type, t, x, z, h,
		vx: o.vx !== undefined ? o.vx : (Math.random() - 0.5) * (o.spread || 1),
		vz: o.vz !== undefined ? o.vz : (Math.random() - 0.5) * (o.spread || 1),
		vh: o.vh !== undefined ? o.vh : Math.random() * (o.up || 1),
		size: o.size || 0.2, life: 0, max: (o.life || t.life) * (0.7 + Math.random() * 0.6),
		color: o.color, ax: x, az: z,
	});
};
P.burst = function (type, x, z, h, n, o) { for (let i = 0; i < n; i++) P.add(type, x, z, h, o); };
P.update = function (dt) {
	const list = P.list;
	for (let i = list.length - 1; i >= 0; i--) {
		const p = list[i];
		p.life += dt;
		if (p.life >= p.max) { list.splice(i, 1); continue; }
		const t = p.t;
		if (p.type === 'fly') {
			p.vx += (Math.random() - 0.5) * 30 * dt + (p.ax - p.x) * 2 * dt;
			p.vz += (Math.random() - 0.5) * 30 * dt + (p.az - p.z) * 2 * dt;
			p.vh += (Math.random() - 0.5) * 30 * dt + (1.4 - p.h) * 2 * dt;
			p.vx *= 0.95; p.vz *= 0.95; p.vh *= 0.95;
		}
		p.vh -= t.grav * dt;
		const d = Math.max(0, 1 - t.drag * dt);
		p.vx *= d; p.vz *= d;
		if (t.grav < 0) p.vx += 0.5 * dt;
		p.x += p.vx * dt; p.z += p.vz * dt; p.h += p.vh * dt;
		if (p.h < 0 && t.grav > 0) { p.h = 0; p.vh = 0; p.vx *= 0.5; p.vz *= 0.5; }
		p.size += t.grow * dt * 0.5;
	}
};
P.clear = function () { P.list.length = 0; };

// ---------- Människor ----------
const SKIN = [[240, 200, 170], [222, 180, 140], [170, 120, 85], [120, 80, 55]];
const HAIR = [[60, 40, 25], [200, 160, 90], [30, 25, 20], [150, 80, 40], [230, 210, 150]];

class Person {
	constructor(x, z) {
		this.x = x; this.z = z; this.path = null; this.s = 0;
		this.phase = Math.random() * 6; this.heading = Math.random() * 6; this.speed = 3;
		this.moving = false; this.hidden = false; this.t = 0; this.h0 = 0;
	}
	goTo(tx, tz, opt) {
		this.path = new PG.Path(W.findPath(this.x, this.z, tx, tz, opt));
		this.s = 0;
	}
	walk(dt) {
		if (!this.path) return true;
		this.s += this.speed * dt;
		const q = this.path.at(this.s);
		const dx = q.x - this.x, dz = q.z - this.z;
		if (dx * dx + dz * dz > 1e-6) this.heading = PG.angleLerp(this.heading, Math.atan2(dz, dx), Math.min(1, dt * 12));
		this.x = q.x; this.z = q.z;
		this.phase += dt * this.speed * 3.2;
		this.moving = true;
		if (this.s >= this.path.length) { this.path = null; this.moving = false; return true; }
		return false;
	}
	faceTo(x, z) { this.heading = Math.atan2(z - this.z, x - this.x); }
}
PG.Person = Person;

class Worker extends Person {
	constructor(name, x, z, look) {
		super(x, z);
		this.name = name;
		this.look = look;
		this.steps = [];
		this.task = null;
		this.status = 'Ledig';
		this.idleT = 0;
		this.speed = 6;
		this.carry = null;
		this.act = null;
		this.riding = false;
		this.rig = Gfx.makePerson(look, 1.8);
		this.pick = Gfx.addPick('worker', 0, 0, 0, 1.2, 2.0, 1.2, this, this.rig.root);
	}
	get busy() { return !!this.task; }
	assign(task) {
		if (this.task && this.task.onCancel) this.task.onCancel(this);
		this.task = task;
		this.steps = task.steps.slice();
		this.status = task.label;
		this.path = null;
		this.carry = null;
		this.act = null;
		this.hidden = false;
		this.stepStarted = false;
	}
	cancel() {
		if (this.task && this.task.onCancel) this.task.onCancel(this);
		this.task = null; this.steps = []; this.status = 'Ledig'; this.act = null; this.carry = null; this.path = null; this.hidden = false;
	}
	update(dt) {
		this.t += dt;
		if (this.riding) return;
		if (!this.task) {
			this.idleT += dt;
			this.moving = false;
			if (this.path) this.walk(dt);
			else if (this.idleT > 6 && Math.hypot(this.x - this.home.x, this.z - this.home.z) > 3) this.goTo(this.home.x, this.home.z);
			return;
		}
		this.idleT = 0;
		const st = this.steps[0];
		if (!st) { this.task = null; this.status = 'Ledig'; this.act = null; return; }
		if (!this.stepStarted) {
			this.stepStarted = true;
			this.stepT = 0;
			if (st.start) st.start(this);
			if (st.go) this.goTo(st.go[0], st.go[1], st.cart ? { cart: true } : null);
		}
		this.stepT += dt;
		let done = false;
		if (st.go) {
			if (st.cart && PG.Ground.grassAt(this.x, this.z) > PG.Ground.CART_LIMIT) {
				this.moving = false;
				this.act = 'stuck';
				this.stuckT = (this.stuckT || 0) + dt;
				if (Math.random() < dt * 5) P.add('grass', this.x + Math.cos(this.heading), this.z + Math.sin(this.heading), 0.4, { up: 2, spread: 2, size: 0.08 });
				if (this.stuckT > 2.2) {
					this.stuckT = 0;
					this.act = null;
					const rescue = st.onStuck ? st.onStuck(this) : null;
					this.steps = rescue || [];
					this.stepStarted = false;
				}
				return;
			}
			this.act = null;
			done = this.walk(dt);
		} else if (st.work !== undefined) {
			this.moving = false;
			this.act = st.act || null;
			if (st.face) this.faceTo(st.face[0], st.face[1]);
			if (st.tick) st.tick(this, dt);
			if (st.work >= 0 && this.stepT >= st.work) done = true;
			if (st.until && st.until(this)) done = true;
		} else {
			done = true;
		}
		if (done) {
			if (st.done) st.done(this);
			this.steps.shift();
			this.stepStarted = false;
			this.act = null;
			if (this.steps.length === 0 && this.task) {
				const t = this.task;
				this.task = null;
				this.status = 'Ledig';
				if (t.finish) t.finish(this);
			}
		}
	}
	sync() {
		if (this.riding) {
			const mw = PG.Mower;
			const hx = Math.cos(mw.heading), hz = Math.sin(mw.heading);
			this.x = mw.x - hx * 0.45; this.z = mw.z - hz * 0.45;
			this.rig.update({ x: this.x, z: this.z, h: 0.62, heading: mw.heading, act: 'sit', t: this.t, ring: null });
			return;
		}
		this.rig.update({
			x: this.x, z: this.z, h: 0, heading: this.heading, moving: this.moving, phase: this.phase,
			act: this.act, t: this.t, carry: this.carry, hidden: this.hidden, ring: this.task ? 0xffd84a : 0xffffff,
		});
	}
}
PG.Worker = Worker;

// ---------- Scouter ----------
const SCARVES = [[250, 200, 40], [30, 90, 170], [200, 40, 40], [40, 140, 70], [240, 130, 30]];
class Scout extends Person {
	constructor(i) {
		super(0, 0);
		this.H = 1.3 + Math.random() * 0.3;
		this.look = {
			shirt: [70, 110, 160], pants: PG.choice([[50, 50, 60], [70, 60, 50], [40, 60, 90]]), skin: PG.choice(SKIN),
			hair: PG.choice(HAIR), scarf: SCARVES[i % SCARVES.length],
		};
		this.house = W.building(W.sleepHouses[i % W.sleepHouses.length]);
		this.speed = 2.4 + Math.random() * 1.0;
		this.baseSpeed = this.speed;
		this.state = 'inside';
		this.timer = Math.random() * 3;
		this.hidden = true;
		this.blue = false;
		this.act = null;
		this.wakeAt = 7.2 + Math.random() * 0.7;
		this.rig = Gfx.makePerson(this.look, this.H);
	}
	door() { return W.doorOf(this.house); }
	update(dt, st) {
		this.t += dt;
		const hour = st.time % 24;
		const door = this.door();
		this.timer -= dt;
		switch (this.state) {
			case 'inside':
				this.hidden = true;
				if (hour >= this.wakeAt && hour < 20.5 && !st.night) {
					this.x = door.x; this.z = door.z; this.hidden = false;
					this.state = 'idle'; this.timer = 1;
				}
				break;
			case 'idle':
				this.moving = false;
				this.act = this.blue ? 'shiver' : this.act;
				if (this.blue && Math.random() < dt * 2) P.add('cold', this.x, this.z, this.H, { up: 0.5, size: 0.12 });
				if (hour >= 20.7 && hour < 21.6 && !this.bathed) { this.act = null; this.state = 'toBastu'; this.goTo(W.bastu.x - 3.8, W.bastu.z + PG.rand(-1.8, 1.8)); break; }
				if (hour >= 22.2 || hour < 6) { this.act = null; this.state = 'toBed'; this.goTo(door.x, door.z); break; }
				if (this.timer <= 0) {
					this.act = null;
					this.state = 'walk';
					let tx, tz;
					const r = Math.random();
					if (r < 0.12) { tx = W.dass.door.x - 0.6; tz = W.dass.door.z + PG.rand(-2.5, 2.5); this.toDass = true; }
					else if (r < 0.3) { const d = W.doorOf(W.building(PG.choice(W.sleepHouses))); tx = d.x; tz = d.z; }
					else {
						for (let k = 0; k < 20; k++) {
							tx = PG.rand(60, 190); tz = PG.rand(45, 100);
							if (PG.Ground.isLawnCell(tx, tz) && W.navKind(tx, tz) === 2) break;
						}
					}
					this.goTo(tx, tz);
				} else if (!this.blue && Math.random() < dt * 0.15) this.act = 'wave';
				break;
			case 'walk':
				this.speed = this.baseSpeed * (PG.Ground.grassAt(this.x, this.z) > 1.0 ? 0.6 : 1);
				if (this.walk(dt)) {
					this.state = 'idle';
					this.timer = 2 + Math.random() * 6;
					if (this.toDass) { this.toDass = false; st.dass = Math.min(110, st.dass + 0.8); this.hidden = true; this.timer = 3; this.state = 'inDass'; }
				}
				break;
			case 'inDass':
				if (this.timer <= 0) { this.hidden = false; this.state = 'idle'; this.timer = 1; }
				break;
			case 'toBastu':
				if (this.walk(dt)) { this.state = 'waitBath'; this.faceTo(W.bastu.x, W.bastu.z); }
				break;
			case 'waitBath':
				this.moving = false;
				if (st.bathCold) this.blue = true;
				if (this.blue) { this.state = 'idle'; this.bathed = true; this.timer = 4; }
				else if (st.bathOk) { this.state = 'inBastu'; this.hidden = true; this.timer = 4 + Math.random() * 8; }
				if (hour >= 22) { this.state = 'toBed'; this.goTo(door.x, door.z); }
				break;
			case 'inBastu':
				this.hidden = true;
				if (this.timer <= 0) {
					this.hidden = false;
					this.x = W.bastu.x + 2.8; this.z = W.bastu.z + 0.5;
					this.state = 'toJetty';
					this.path = new PG.Path([[this.x, this.z], [W.jetty.x0, W.jetty.z + PG.rand(-0.5, 0.5)], [W.jetty.x1 - 0.5, W.jetty.z + PG.rand(-0.6, 0.6)]]);
					this.s = 0;
					this.speed = 3.5;
				}
				break;
			case 'toJetty':
				this.h0 = this.x > W.jetty.x0 ? 0.5 : 0;
				if (this.walk(dt)) { this.state = 'jump'; this.jt = 0; this.jx = this.x; this.heading = 0; }
				break;
			case 'jump':
				this.jt += dt;
				this.x = this.jx + this.jt * 2.5;
				this.h0 = 0.5 + Math.sin(Math.min(1, this.jt / 0.7) * Math.PI) * 1.4 - this.jt * 0.6;
				if (this.jt > 0.75) {
					this.state = 'swim'; this.timer = 3 + Math.random() * 4; this.h0 = -1.0;
					P.burst('splash', this.x, this.z, 0, 16, { up: 4, spread: 3, size: 0.1 });
					P.add('ripple', this.x, this.z, 0.08, { vx: 0, vz: 0, vh: 0, size: 0.4 });
					A.splash(Gfx.visible(this.x, this.z, 0) ? 1 : 0.2);
				}
				break;
			case 'swim':
				this.act = 'swim';
				this.h0 = -1.1 + Math.sin(this.t * 4) * 0.05;
				this.x += Math.sin(this.t * 0.7) * dt * 0.5;
				if (Math.random() < dt * 0.8) P.add('ripple', this.x, this.z, 0.08, { vx: 0, vz: 0, vh: 0, size: 0.35 });
				if (this.timer <= 0) {
					this.act = null; this.h0 = 0.5; this.x = W.jetty.x1 - 0.3; this.speed = 2;
					if (hour > 21.9) { this.state = 'toBed'; this.h0 = 0; this.goTo(door.x, door.z); }
					else {
						this.state = 'toBastu2';
						this.path = new PG.Path([[this.x, this.z], [W.jetty.x0, W.jetty.z], [W.bastu.x + 2.8, W.bastu.z + 0.5]]);
						this.s = 0;
					}
				}
				break;
			case 'toBastu2':
				this.h0 = this.x > W.jetty.x0 ? 0.5 : 0;
				if (this.walk(dt)) { this.h0 = 0; this.state = 'inBastu'; this.hidden = true; this.timer = 5 + Math.random() * 6; }
				break;
			case 'toBed':
				this.speed = 2;
				this.h0 = 0;
				if (this.walk(dt)) { this.state = 'inside'; this.hidden = true; this.bathed = false; this.blue = false; this.act = null; }
				break;
		}
	}
	sync() {
		this.rig.update({ x: this.x, z: this.z, h: this.h0 || 0, heading: this.heading, moving: this.moving, phase: this.phase, act: this.act, t: this.t, blue: this.blue, hidden: this.hidden });
	}
	dispose() { this.rig.dispose(); }
}
PG.Scout = Scout;

// ---------- Fordon ----------
function wheel(x, side) {
	const z0 = side > 0 ? 0.95 : -1.3, z1 = side > 0 ? 1.3 : -0.95;
	return M.box(x - 0.5, z0, 0, x + 0.5, z1, 1.0, '#1d1d1d', { top: '#2a2a2a' });
}
function cab(color) {
	const c = M.box(2.4, -1.25, 0.7, 4.4, 1.25, 3.1, color);
	for (const f of c) {
		if (f.side === 'e') M.decal(f, 0.2, 0.25, 2.3, 1.2, '#1f2a33');
		if (f.side === 's') M.decal(f, 0.2, 0.3, 1.3, 1.2, '#1f2a33');
		if (f.side === 'n') M.decal(f, 0.7, 0.3, 1.8, 1.2, '#1f2a33');
		if (f.side === 'e') { M.decal(f, 0.15, 1.9, 0.55, 2.2, '#fff6c0'); M.decal(f, 1.95, 1.9, 2.35, 2.2, '#fff6c0'); }
	}
	return c;
}
function sugbilFaces() {
	const m = [];
	m.push(...wheel(3.4, 1), ...wheel(3.4, -1), ...wheel(-1.6, 1), ...wheel(-1.6, -1), ...wheel(-2.9, 1), ...wheel(-2.9, -1));
	m.push(...M.box(-4.3, -1.0, 0.6, 2.4, 1.0, 1.0, '#2b2b2b'));
	m.push(...cab('#e9e7df'));
	const tank = M.hcylinder(-4.2, 2.2, 0, 2.05, 1.12, 14, '#3f7d4a', '#356b3f');
	m.push(...tank);
	m.push(...M.box(3.2, -0.2, 3.1, 3.6, 0.2, 3.35, '#f39a1e'));
	m.push(...M.cylinder(-4.5, 0, 0.9, 1.6, 0.45, 10, '#1a1a1a'));
	return m;
}
function sopbilFaces() {
	const m = [];
	m.push(...wheel(3.4, 1), ...wheel(3.4, -1), ...wheel(-1.8, 1), ...wheel(-1.8, -1), ...wheel(-3.1, 1), ...wheel(-3.1, -1));
	m.push(...M.box(-4.5, -1.0, 0.6, 2.4, 1.0, 1.0, '#2b2b2b'));
	m.push(...cab('#f1f1ea'));
	const body = M.box(-4.3, -1.25, 0.9, 2.2, 1.25, 3.5, '#4d8f3a', { top: '#3f7a30' });
	for (const f of body) {
		if (f.side === 's' || f.side === 'n') {
			M.decal(f, 0.3, 1.5, 6.2, 1.85, '#f1f1ea');
			f.paint = (ctx, w, h, shade) => {
				ctx.fillStyle = shade([245, 245, 235]);
				ctx.font = 'bold 60px system-ui, sans-serif';
				ctx.textAlign = 'center';
				ctx.fillText('SOPOR', w / 2, 120);
			};
		}
	}
	m.push(...body);
	m.push(...M.box(-4.9, -1.15, 0.8, -4.3, 1.15, 2.6, '#2f5f26'));
	m.push(...M.box(1.2, -0.2, 3.5, 1.6, 0.2, 3.7, '#f39a1e'));
	return m;
}
const PROTO = {};

const HALF = 4.4;
let vehId = 0;
class Vehicle {
	constructor(kind) {
		this.id = ++vehId;
		this.kind = kind;
		PROTO.sug = PROTO.sug || Gfx.makeObject(sugbilFaces());
		PROTO.sop = PROTO.sop || Gfx.makeObject(sopbilFaces());
		this.group = PROTO[kind].clone();
		Gfx.add(this.group);
		this.pick = Gfx.addPick('vehicle', 0, 0, 0, 9.2, 3.6, 2.8, this, this.group);
		this.heads = [-0.85, 0.85].map((s) => {
			const g = Gfx.makeGlow(0xfff2c8, 1.6);
			g.position.set(HALF + 0.1, 1.05, s);
			this.group.add(g);
			return g;
		});
		this.beacon = Gfx.makeGlow(0xffa030, 1.8);
		this.beacon.position.set(kind === 'sug' ? 3.4 : 1.4, kind === 'sug' ? 3.4 : 3.7, 0);
		this.group.add(this.beacon);
		this.spot = null;
		this.label = kind === 'sug' ? 'Sugbilen' : 'Sopbilen';
		this.path = kind === 'sug' ? PG.Vehicles.pathIn : PG.Vehicles.pathOut;
		this.gateS = PG.Vehicles.gateS;
		this.s = 0; this.v = 7; this.maxV = 7.5;
		this.state = 'in';
		this.timer = 0;
		this.passed = false;
		this.honked = false;
		this.honkT = 0;
		this.lane = 1.1;
		this.turn = null;
		this.rutS = 0;
		this.dead = false;
		this.place();
	}
	place() {
		const q = this.path.at(this.s);
		let hd = q.heading;
		if (this.turn) hd = this.turn.h;
		this.heading = hd;
		const rx = -Math.sin(hd), rz = Math.cos(hd);
		this.x = q.x + rx * this.lane;
		this.z = q.z + rz * this.lane;
	}
	front() { return this.s + HALF; }
	blockedByTraffic(list) {
		const hx = Math.cos(this.heading), hz = Math.sin(this.heading);
		for (const o of list) {
			if (o === this || o.dead) continue;
			const rx = o.x - this.x, rz = o.z - this.z;
			const ahead = rx * hx + rz * hz;
			const lat = Math.abs(-rx * hz + rz * hx);
			if (ahead > 0 && ahead < 11 && lat < 1.8) return true;
		}
		return false;
	}
	update(dt, G, list) {
		this.timer += dt;
		this.honkT -= dt;
		let limit = this.maxV;
		const stopFor = (s) => { limit = Math.min(limit, Math.sqrt(2 * 7 * Math.max(0, s - this.s))); };
		if (this.turn) {
			this.turn.t += dt;
			const k = PG.smooth(Math.min(1, this.turn.t / this.turn.dur));
			this.turn.h = this.turn.h0 + Math.PI * k;
			this.place();
			if (this.turn.t >= this.turn.dur) {
				this.path = this.path.reversed();
				this.s = this.path.length - this.s;
				this.turn = null;
				if (this.turnDone) this.turnDone();
				this.place();
			}
			return;
		}
		if (this.blockedByTraffic(list)) limit = 0;
		const gateDist = this.gateS - this.front();
		const Pt = PG.Portal;
		const st = this.state;
		if (this.kind === 'sug') this.updateSug(dt, G, gateDist, Pt);
		else this.updateSop(dt, G, gateDist, Pt);
		if (this.state !== st || this.turn) return;
		if (this.hold) limit = 0;
		if (this.stopS !== undefined) stopFor(this.stopS);
		const target = Math.min(this.maxV, limit);
		if (this.v < target) this.v = Math.min(target, this.v + 3.5 * dt);
		else this.v = Math.max(target, this.v - 9 * dt);
		this.s += this.v * dt;
		this.place();
		if (this.v > 1 && Math.random() < dt * 6) {
			const bx = this.x - Math.cos(this.heading) * HALF, bz = this.z - Math.sin(this.heading) * HALF;
			P.add('exhaust', bx, bz, 0.6, { up: 0.5, size: 0.25 });
		}
		if (this.state === 'joy') {
			this.rutS += this.v * dt;
			if (this.rutS > 0.8) {
				this.rutS = 0;
				const bx = this.x - Math.cos(this.heading) * 2.5, bz = this.z - Math.sin(this.heading) * 2.5;
				if (PG.Ground.isLawnCell(bx, bz)) {
					PG.Ground.addRut(bx, bz, this.heading, G.playTime);
					if (Math.random() < 0.5) P.add('grass', bx, bz, 0.3, { up: 2, spread: 2, size: 0.08 });
				}
			}
		}
		if (this.s >= this.path.length - 0.05 && this.onEnd) this.onEnd();
	}
	gatePassCheck(gateDist, Pt, outsideBlock) {
		// Returns 'go', 'wait' or 'crash'.
		if (this.passed) return 'go';
		if (gateDist > 1.0) {
			if (Pt.isOpen() && !outsideBlock) return 'go';
			if (Pt.isOpening() || outsideBlock) return 'wait';
			return 'go';
		}
		if (Pt.isOpen() && !outsideBlock) { this.passed = true; return 'go'; }
		if (Pt.isOpening() || outsideBlock || this.noCrash) return 'wait';
		return 'crash';
	}
	updateSug(dt, G, gateDist, Pt) {
		this.stopS = undefined;
		this.hold = false;
		if (this.state === 'in' || this.state === 'out') {
			if (!this.honked && gateDist < 32) {
				this.honked = true;
				A.horn('sug');
				if (this.state === 'in') G.toast('Sugbilen kommer – öppna portalen!', 'info', 'portal');
			}
			const outsideBlock = this.state === 'out' && PG.Vehicles.outsideAtGate(this);
			const r = this.gatePassCheck(gateDist, Pt, outsideBlock);
			if (r === 'wait') {
				this.stopS = this.gateS - HALF - 1.2;
				this.waiting = true;
				if (this.v < 0.3 && this.honkT <= 0) { this.honkT = 4; A.horn('sug'); }
			} else if (r === 'crash') {
				this.crash(G);
				return;
			} else this.waiting = false;
			if (this.state === 'in' && this.passed) {
				this.stopS = this.path.length;
				if (this.s >= this.path.length - 0.2) {
					this.state = 'pump';
					this.timer = 0;
					this.v = 0;
					this.startLevel = G.brunn;
					this.makeHose();
					G.toast('Sugbilen pumpar trekammarbrunnen…', 'info');
				}
			}
		} else if (this.state === 'pump') {
			this.hold = true;
			this.v = 0;
			const dur = 6;
			G.brunn = Math.max(0, G.brunn - (this.startLevel / dur) * dt);
			A.loop('pump', Gfx.visible(this.x, this.z, 100) ? 0.35 : 0.1);
			if (Math.random() < dt * 3) P.add('poop', W.brunn.x + PG.rand(-2, 2), W.brunn.z, 0.5, { up: 1, spread: 0.5, size: 0.1 });
			if (this.timer > dur) {
				A.loop('pump', 0);
				this.removeHose();
				this.serviced = true;
				this.turn = { t: 0, dur: 2.4, h0: this.heading, h: this.heading };
				this.turnDone = () => {
					this.state = 'out';
					this.passed = false;
					this.honked = true;
					this.gateS = this.path.length - PG.Vehicles.gateS;
					A.horn('sug');
					G.toast('Sugbilen är klar och vill ut – öppna portalen!', 'warn', 'portal');
				};
			}
		} else if (this.state === 'crashed') {
			this.hold = true;
			this.v = 0;
			if (this.timer > 2.2) {
				if (this.crashOut) {
					this.state = 'out';
					this.noCrash = true;
				} else {
					this.turn = { t: 0, dur: 2.4, h0: this.heading, h: this.heading };
					this.turnDone = () => { this.state = 'leave'; this.passed = true; };
				}
			}
		}
		if (this.state === 'out' && this.passed && this.s > this.gateS + 6) this.state = 'leave';
		this.onEnd = () => {
			if (this.state === 'leave' || this.state === 'out') {
				this.dead = true;
				if (this.serviced) G.addScore(10, 'Sugbilen tömde brunnen', this.x, this.z);
			}
		};
	}
	crash(G) {
		this.v = 0;
		this.crashOut = this.state === 'out';
		this.state = 'crashed';
		this.timer = 0;
		PG.Portal.shake = 1.5;
		const fx = this.x + Math.cos(this.heading) * HALF, fz = this.z + Math.sin(this.heading) * HALF;
		P.burst('spark', fx, fz, 1.5, 30, { up: 5, spread: 6, size: 0.12 });
		P.burst('black', fx, fz, 1.5, 8, { up: 1, spread: 1, size: 0.6 });
		A.crash();
		G.loseLife('Sugbilen krockade med portalen!');
	}
	updateSop(dt, G, gateDist, Pt) {
		this.stopS = undefined;
		this.hold = false;
		if (this.state === 'in') {
			if (!this.honked && gateDist < 32) {
				this.honked = true;
				A.horn('sop');
				G.toast('Sopbilen kommer – håll portalen stängd!', 'info', 'portal');
			}
			if (gateDist < 2.5 && Pt.passable()) { this.intrude(G); return; }
			this.stopS = this.gateS - HALF - 1.2;
			if (this.s >= this.stopS - 0.3 && this.v < 0.5) {
				this.state = 'empty';
				this.timer = 0;
			}
		} else if (this.state === 'empty') {
			this.hold = true;
			G.binLift = Math.sin(Math.min(1, this.timer / 4.5) * Math.PI);
			if (Pt.passable()) { G.binLift = 0; this.intrude(G); return; }
			if (this.timer > 4.5) {
				G.binLift = 0;
				this.state = 'turning';
				this.turn = { t: 0, dur: 2.6, h0: this.heading, h: this.heading };
				this.turnDone = () => { this.state = 'leave'; this.served = true; };
			}
		} else if (this.state === 'joy') {
			const exitDist = this.exitS - this.front();
			this.waiting = false;
			if (!this.exited) {
				if (exitDist < 1.2 && !(Pt.frac >= 0.6)) {
					this.stopS = this.exitS - HALF - 1.2;
					this.waiting = true;
					if (this.v < 0.3 && this.honkT <= 0) { this.honkT = 3; A.horn('sop'); G.toast('Släpp ut sopbilen – öppna portalen!', 'warn', 'portal'); }
				} else if (exitDist < 0) this.exited = true;
			}
		}
		this.onEnd = () => {
			this.dead = true;
			if (this.served) G.addScore(5, 'Sopbilen tömde soptunnorna', this.x, this.z);
		};
	}
	intrude(G) {
		this.state = 'joy';
		this.path = PG.Vehicles.pathJoy;
		this.exitS = PG.Vehicles.joyExitS;
		this.exited = false;
		this.lane = 0.4;
		A.honkTune();
		G.morale = Math.max(0, G.morale - 10);
		G.loseLife('Sopbilen körde in på gräsmattan – hey gang!');
	}
	makeHose() {
		const hx = Math.cos(this.heading), hz = Math.sin(this.heading);
		const a = new THREE.Vector3(this.x - hx * HALF, 1.2, this.z - hz * HALF);
		const b = new THREE.Vector3(W.brunn.x - 2, 0.5, W.brunn.z);
		const m = a.clone().lerp(b, 0.5); m.y = 0.1;
		const curve = new THREE.CatmullRomCurve3([a, m, b]);
		this.hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.09, 6), Gfx.mat([30, 35, 30]));
		this.hose.castShadow = true;
		Gfx.add(this.hose);
	}
	removeHose() {
		if (this.hose) { Gfx.remove(this.hose); this.hose.geometry.dispose(); this.hose = null; }
	}
	sync() {
		Gfx.place(this.group, this.x, this.z, 0, this.heading);
		const night = 1 - L.day;
		for (const h of this.heads) h.material.opacity = night > 0.2 ? 0.9 * night : 0;
		const active = this.v > 0.5 || this.state === 'pump' || this.state === 'empty';
		this.beacon.material.opacity = active && Math.floor(performance.now() / 250) % 2 === 0 ? 0.9 : 0;
		if (night > 0.25) {
			if (!this.spot) this.spot = Gfx.acquireSpot();
			if (this.spot) {
				const hx = Math.cos(this.heading), hz = Math.sin(this.heading);
				Gfx.aimSpot(this.spot, this.x + hx * (HALF + 0.3), this.z + hz * (HALF + 0.3), 1.2, this.x + hx * 18, this.z + hz * 18, 60 * night);
			}
		} else if (this.spot) { Gfx.releaseSpot(this.spot); this.spot = null; }
	}
	dispose() {
		this.removeHose();
		Gfx.releaseSpot(this.spot);
		Gfx.removePick(this.pick);
		Gfx.remove(this.group);
		A.loop('pump', 0);
	}
}
PG.Vehicle = Vehicle;

const V = (PG.Vehicles = {});
V.init = function () {
	const inner = W.roadInner.slice(1);
	V.pathOut = new PG.Path(W.roadOuter);
	V.gateS = V.pathOut.length;
	V.pathIn = new PG.Path(W.roadOuter.concat(inner));
	const joy = W.joyride.slice(1);
	const back = W.roadOuter.slice().reverse().slice(1);
	V.pathJoy = new PG.Path(W.roadOuter.concat(joy, back));
	V.joyExitS = V.gateS + new PG.Path(W.joyride).length;
};
V.outsideAtGate = function (me) {
	for (const v of PG.state.vehicles) {
		if (v === me || v.dead || v.kind !== 'sop') continue;
		if ((v.state === 'in' || v.state === 'empty' || v.state === 'turning') && Math.hypot(v.x - W.portal.x, v.z - W.portal.z) < 22) return true;
	}
	return false;
};

// ---------- Åkgräsklipparen ----------
const MW = (PG.Mower = { x: W.mowerHome.x, z: W.mowerHome.z, heading: -Math.PI / 2, state: 'parked', driver: null, attemptT: 0, autoT: 0, rows: null, path: null, s: 0, seg: null, prio: null });
function mowerFaces() {
	const m = [];
	m.push(...M.box(-0.85, -0.62, 0, -0.35, -0.42, 0.62, '#1b1b1b'), ...M.box(-0.85, 0.42, 0, -0.35, 0.62, 0.62, '#1b1b1b'));
	m.push(...M.box(0.45, -0.55, 0, 0.8, -0.4, 0.38, '#1b1b1b'), ...M.box(0.45, 0.4, 0, 0.8, 0.55, 0.38, '#1b1b1b'));
	m.push(...M.box(-0.2, -0.62, 0.08, 0.55, 0.62, 0.25, '#3a3a3a'));
	m.push(...M.box(-0.9, -0.42, 0.25, 0.95, 0.42, 0.62, '#c81e1e', { top: '#d83030' }));
	m.push(...M.box(0.3, -0.36, 0.62, 0.95, 0.36, 0.78, '#c81e1e', { top: '#e04040' }));
	m.push(...M.box(-0.7, -0.3, 0.62, -0.25, 0.3, 0.8, '#151515'));
	m.push(...M.box(-0.75, -0.3, 0.8, -0.65, 0.3, 1.15, '#151515'));
	m.push(...M.box(0.15, -0.04, 0.78, 0.22, 0.04, 1.15, '#222'));
	m.push(...M.box(0.08, -0.2, 1.12, 0.28, 0.2, 1.18, '#222'));
	return m;
}
MW.init = function () {
	MW.group = Gfx.makeObject(mowerFaces());
	Gfx.add(MW.group);
	MW.pick = Gfx.addPick('mower', 0, 0, 0, 2.6, 2.0, 2.0, MW, MW.group);
};
MW.reset = function () {
	MW.x = W.mowerHome.x; MW.z = W.mowerHome.z; MW.heading = -Math.PI / 2;
	MW.state = 'parked'; MW.driver = null; MW.path = null; MW.seg = null; MW.prio = null;
	MW.rows = PG.Ground.mowRows();
};
MW.running = () => MW.state === 'transit' || MW.state === 'mowing' || MW.state === 'returning' || MW.state === 'pick';
MW.board = function (worker) {
	MW.driver = worker;
	worker.riding = true;
	MW.state = 'waitStart';
	MW.autoT = 0;
	MW.attempts = 0;
};
MW.release = function () {
	const d = MW.driver;
	MW.driver = null;
	MW.state = 'parked';
	if (d) {
		d.riding = false;
		d.x = MW.x + 1.2; d.z = MW.z + 0.5;
		d.task = null; d.steps = []; d.status = 'Ledig'; d.act = null;
	}
};
MW.tryStart = function (G, byPlayer) {
	if (MW.state !== 'waitStart' && MW.state !== 'stalled') return;
	if (byPlayer && MW.attemptT > 0) return;
	MW.attemptT = 0.6;
	MW.autoT = 0;
	MW.attempts = (MW.attempts || 0) + 1;
	const chance = (byPlayer ? 0.33 : 0.22) + Math.min(0.3, MW.attempts * 0.04);
	if (Math.random() < chance) {
		MW.state = 'pick';
		MW.attempts = 0;
		P.burst('black', MW.x, MW.z, 0.9, 4, { up: 1, size: 0.3 });
		P.add('text', MW.x, MW.z, 2, { text: 'Brrrum!', color: '#8f8' });
		A.success();
	} else {
		A.sputter();
		P.burst('black', MW.x - Math.cos(MW.heading) * 0.8, MW.z - Math.sin(MW.heading) * 0.8, 0.8, 5, { up: 1.2, spread: 1.2, size: 0.25 });
		P.add('text', MW.x, MW.z, 2, { text: PG.choice(['Puff!', 'Hosta…', 'Pff-pff', 'Nej!']), color: '#fc8' });
	}
};
MW.stop = function () {
	if (!MW.driver) return;
	if (MW.state === 'waitStart' || MW.state === 'stalled') { MW.release(); return; }
	MW.state = 'returning';
	MW.path = new PG.Path(W.findPath(MW.x, MW.z, W.mowerHome.x, W.mowerHome.z));
	MW.s = 0;
};
MW.setPriority = function (x, z) {
	MW.prio = { x, z };
	MW.seg = null;
	if (MW.state === 'mowing' || MW.state === 'transit') MW.state = 'pick';
};

function pickSegment() {
	let best = null, bestScore = -1e9;
	for (const s of MW.rows) {
		const avg = PG.Ground.segmentAvg(s);
		if (avg < 0.22) continue;
		const d = Math.min(PG.dist(MW.x, MW.z, s.x0, s.z), PG.dist(MW.x, MW.z, s.x1, s.z));
		let score = avg - d / 140;
		if (MW.prio) score = -Math.hypot(PG.clamp(MW.prio.x, s.x0, s.x1) - MW.prio.x, s.z - MW.prio.z) / 10 + avg * 0.2;
		if (score > bestScore) { bestScore = score; best = s; }
	}
	return best;
}

MW.update = function (dt, G) {
	MW.attemptT -= dt;
	const loud = Gfx.visible(MW.x, MW.z, 100) ? 0.25 : 0.06;
	A.loop('mower', MW.running() ? loud : 0);
	if (MW.state === 'waitStart' || MW.state === 'stalled') {
		MW.autoT += dt;
		if (MW.autoT > 3.2) MW.tryStart(G, false);
		return;
	}
	if (MW.state === 'pick') {
		const s = pickSegment();
		if (MW.prio && s) MW.prio = null;
		if (!s) { MW.stop(); return; }
		MW.seg = s;
		const dA = PG.dist(MW.x, MW.z, s.x0, s.z), dB = PG.dist(MW.x, MW.z, s.x1, s.z);
		MW.segFrom = dA < dB ? [s.x0, s.z] : [s.x1, s.z];
		MW.segTo = dA < dB ? [s.x1, s.z] : [s.x0, s.z];
		MW.path = new PG.Path(W.findPath(MW.x, MW.z, MW.segFrom[0], MW.segFrom[1]));
		MW.s = 0;
		MW.state = 'transit';
		return;
	}
	if (MW.state === 'transit' || MW.state === 'mowing' || MW.state === 'returning') {
		const speed = MW.state === 'mowing' ? 5.5 : 6.5;
		MW.s += speed * dt;
		const q = MW.path.at(MW.s);
		MW.heading = PG.angleLerp(MW.heading, q.heading, Math.min(1, dt * 8));
		MW.x = q.x; MW.z = q.z;
		if (Math.random() < dt * 5) P.add('exhaust', MW.x - Math.cos(MW.heading), MW.z - Math.sin(MW.heading), 0.6, { up: 0.4, size: 0.15 });
		if (MW.state !== 'returning') {
			const cut = PG.Ground.cut(MW.x, MW.z, 2.1, MW.seg ? (MW.seg.row % 2 ? 1 : -1) : 1);
			if (cut > 0 && Math.random() < dt * 25) P.add('grass', MW.x + PG.rand(-1, 1), MW.z + PG.rand(-1, 1), 0.3, { up: 2.5, spread: 3, size: 0.07 });
			if (Math.random() < dt * 0.012 * (G.day > 1 ? 1.4 : 1)) {
				MW.state = 'stalled';
				MW.autoT = 0;
				A.sputter();
				P.burst('black', MW.x, MW.z, 1, 8, { up: 1.5, size: 0.35 });
				G.toast('Gräsklipparen tjuvstannade! Klicka på den för att dra igång.', 'warn', 'mower');
				return;
			}
		}
		if (MW.s >= MW.path.length) {
			if (MW.state === 'transit') {
				MW.path = new PG.Path([MW.segFrom, MW.segTo]);
				MW.s = 0;
				MW.state = 'mowing';
			} else if (MW.state === 'mowing') {
				MW.state = 'pick';
			} else {
				MW.heading = -Math.PI / 2;
				MW.release();
			}
		}
	}
};
MW.sync = function () {
	const shake = MW.running() ? Math.sin(performance.now() * 0.09) * 0.02 : 0;
	Gfx.place(MW.group, MW.x, MW.z + shake, 0, MW.heading);
};
