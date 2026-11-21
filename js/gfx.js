// Three.js-rendering: scen, kamera, ljus, himmel, mark, sjö, skog, gräs, partiklar och hjälpfunktioner.
import * as THREE from 'three';

const PG = window.PG;
const W = PG.World, L = PG.Light;
const Gfx = (PG.Gfx = { THREE });

let renderer, scene, camera, sun, hemi, sky, skyMat, stars, waterMat;
let groundTex, grassTex, marksTex, grassVersion = -1, marksVersion = -1, grassUploadT = 0;
let tufts, tuftCells = [], tuftVersion = -1, tuftTimer = 0;
let partSys = [];
const spots = [];
Gfx.pickables = [];

// ---------- Colors and geometry from faces ----------
const tmpCol = new THREE.Color();
function lin(c) {
	tmpCol.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);
	return [tmpCol.r, tmpCol.g, tmpCol.b];
}
Gfx.lin = lin;
Gfx.color = (c) => new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);

const MAT = {
	solid: new THREE.MeshLambertMaterial({ vertexColors: true, shadowSide: THREE.DoubleSide }),
	decal: new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }),
	window: new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(1.0, 0.62, 0.25), emissiveIntensity: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -6 }),
	cloth: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
};
Gfx.MAT = MAT;

function geoBuilder() { return { pos: [], nor: [], col: [], uv: [] }; }
const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), vn = new THREE.Vector3();

// Face points are [x, z, h]; Three.js uses (x, h, z).
function pushPoly(B, pts, n, c, uvs) {
	const N = [n[0], n[2], n[1]];
	const P = pts.map((p) => [p[0], p[2], p[1]]);
	va.set(...P[0]); vb.set(...P[1]); vc.set(...P[2]);
	vn.subVectors(vb, va).cross(vc.sub(va));
	const flip = vn.x * N[0] + vn.y * N[1] + vn.z * N[2] < 0;
	const C = lin(c);
	for (let i = 1; i < P.length - 1; i++) {
		const tri = flip ? [0, i + 1, i] : [0, i, i + 1];
		for (const k of tri) {
			B.pos.push(P[k][0], P[k][1], P[k][2]);
			B.nor.push(N[0], N[1], N[2]);
			B.col.push(C[0], C[1], C[2]);
			if (uvs) B.uv.push(uvs[k][0], uvs[k][1]);
		}
	}
}
function toGeometry(B) {
	if (!B.pos.length) return null;
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3));
	if (B.col.length) g.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3));
	if (B.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
	g.computeBoundingSphere();
	return g;
}
Gfx.facesToGeometry = function (faces) {
	const B = geoBuilder();
	for (const f of faces) pushPoly(B, f.p, f.n, f.c);
	return toGeometry(B);
};

const PAINT_PPM = 160;
function paintedQuad(f) {
	const size = PG.Mesh.faceSize(f);
	const cw = Math.min(1024, Math.max(16, Math.round(size[0] * PAINT_PPM)));
	const ch = Math.min(1024, Math.max(16, Math.round(size[1] * PAINT_PPM)));
	const cv = document.createElement('canvas');
	cv.width = cw; cv.height = ch;
	const ctx = cv.getContext('2d');
	ctx.scale(cw / (size[0] * 100), ch / (size[1] * 100));
	f.paint(ctx, size[0] * 100, size[1] * 100, (c) => PG.rgbStr(c[0], c[1], c[2]));
	const tex = new THREE.CanvasTexture(cv);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 4;
	const o = 0.012;
	const pts = f.p.map((p) => [p[0] + f.n[0] * o, p[1] + f.n[1] * o, p[2] + f.n[2] * o]);
	const B = geoBuilder();
	pushPoly(B, pts, f.n, [255, 255, 255], [[0, 1], [1, 1], [1, 0], [0, 0]]);
	const geo = toGeometry(B);
	geo.deleteAttribute('color');
	const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
	const m = new THREE.Mesh(geo, mat);
	m.receiveShadow = true;
	return m;
}

// Builds a Group from faces. Decals with kind 'window' glow at night; kind 'emit' gets its own material.
Gfx.makeObject = function (faces, opt) {
	opt = opt || {};
	const solid = geoBuilder(), decal = geoBuilder(), win = geoBuilder(), emit = geoBuilder();
	const painted = [];
	for (const f of faces) {
		pushPoly(solid, f.p, f.n, f.c);
		if (f.paint) painted.push(f);
		if (f.decals) for (const d of f.decals) pushPoly(d.kind === 'window' ? win : d.kind === 'emit' ? emit : decal, d.p, d.n, d.c);
	}
	const g = new THREE.Group();
	const sg = toGeometry(solid);
	if (sg) {
		const m = new THREE.Mesh(sg, opt.material || MAT.solid);
		m.castShadow = opt.castShadow !== false;
		m.receiveShadow = true;
		g.add(m);
	}
	const dg = toGeometry(decal);
	if (dg) { const m = new THREE.Mesh(dg, MAT.decal); m.receiveShadow = true; g.add(m); }
	const wg = toGeometry(win);
	if (wg) { const m = new THREE.Mesh(wg, MAT.window); m.receiveShadow = true; g.add(m); }
	const eg = toGeometry(emit);
	if (eg) {
		const em = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(1, 0.5, 0.15), emissiveIntensity: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -6 });
		g.add(new THREE.Mesh(eg, em));
		g.userData.emitMat = em;
	}
	for (const f of painted) g.add(paintedQuad(f));
	return g;
};

// World position helper (world x,z,h -> Three x,y,z).
Gfx.place = function (obj, x, z, h, heading) {
	obj.position.set(x, h || 0, z);
	if (heading !== undefined) obj.rotation.y = -heading;
	return obj;
};

Gfx.add = (o) => { scene.add(o); return o; };
Gfx.remove = (o) => { scene.remove(o); };

Gfx.addPick = function (id, x, z, h, sx, sy, sz, ref, parent) {
	const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial({ visible: false }));
	m.position.set(x, h + sy / 2, z);
	m.userData.pickId = id;
	m.userData.ref = ref;
	(parent || scene).add(m);
	Gfx.pickables.push(m);
	return m;
};
Gfx.removePick = function (m) {
	const i = Gfx.pickables.indexOf(m);
	if (i >= 0) Gfx.pickables.splice(i, 1);
	if (m.parent) m.parent.remove(m);
};

// ---------- Glow sprites and lights ----------
let glowTex;
function makeGlowTex() {
	const c = document.createElement('canvas');
	c.width = c.height = 64;
	const g = c.getContext('2d');
	const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
	grd.addColorStop(0, 'rgba(255,255,255,1)');
	grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
	grd.addColorStop(1, 'rgba(255,255,255,0)');
	g.fillStyle = grd;
	g.fillRect(0, 0, 64, 64);
	glowTex = new THREE.CanvasTexture(c);
}
Gfx.makeGlow = function (color, size) {
	const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
	s.scale.set(size, size, 1);
	s.material.opacity = 0;
	return s;
};
Gfx.addPointLight = function (x, z, h, color, distance) {
	const l = new THREE.PointLight(color, 0, distance, 2);
	l.position.set(x, h, z);
	scene.add(l);
	return l;
};
Gfx.acquireSpot = function () {
	const s = spots.find((s) => !s.userData.used);
	if (s) s.userData.used = true;
	return s || null;
};
Gfx.releaseSpot = function (s) {
	if (!s) return;
	s.userData.used = false;
	s.intensity = 0;
};
Gfx.aimSpot = function (s, x, z, h, tx, tz, intensity) {
	s.position.set(x, h, z);
	s.target.position.set(tx, 0, tz);
	s.intensity = intensity;
};

// ---------- Camera rig ----------
const cam = (Gfx.cam = {
	tx: 160, tz: 88, dist: 140, yaw: 0.35, pitch: 0.95,
	goal: { tx: 160, tz: 88, dist: 140, yaw: 0.35, pitch: 0.95 },
	clamp() {
		const g = this.goal;
		g.dist = PG.clamp(g.dist, 18, 280);
		g.pitch = PG.clamp(g.pitch, 0.38, 1.4);
		g.tx = PG.clamp(g.tx, 40, 260);
		g.tz = PG.clamp(g.tz, 0, 190);
	},
	update(dt) {
		const k = 1 - Math.exp(-dt * 10);
		const g = this.goal;
		this.tx += (g.tx - this.tx) * k;
		this.tz += (g.tz - this.tz) * k;
		this.dist += (g.dist - this.dist) * k;
		this.yaw += (g.yaw - this.yaw) * k;
		this.pitch += (g.pitch - this.pitch) * k;
		const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
		camera.position.set(this.tx + Math.sin(this.yaw) * cp * this.dist, sp * this.dist, this.tz + Math.cos(this.yaw) * cp * this.dist);
		camera.lookAt(this.tx, 0, this.tz);
	},
	focus(x, z, dist) {
		this.goal.tx = x; this.goal.tz = z;
		if (dist) this.goal.dist = dist;
		this.clamp();
	},
	snap() { Object.assign(this, { tx: this.goal.tx, tz: this.goal.tz, dist: this.goal.dist, yaw: this.goal.yaw, pitch: this.goal.pitch }); },
});

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function setNdc(cx, cy) {
	const r = renderer.domElement.getBoundingClientRect();
	ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
	ray.setFromCamera(ndc, camera);
}
Gfx.groundAt = function (cx, cy) {
	setNdc(cx, cy);
	const p = new THREE.Vector3();
	if (!ray.ray.intersectPlane(groundPlane, p)) return null;
	return { x: p.x, z: p.z };
};
Gfx.pick = function (cx, cy) {
	setNdc(cx, cy);
	const hits = ray.intersectObjects(Gfx.pickables, false);
	if (!hits.length) return null;
	const h = hits[0].object;
	return { id: h.userData.pickId, ref: h.userData.ref };
};
const pv = new THREE.Vector3();
Gfx.project = function (x, z, h) {
	pv.set(x, h || 0, z).project(camera);
	const r = renderer.domElement.getBoundingClientRect();
	return { x: (pv.x * 0.5 + 0.5) * r.width, y: (-pv.y * 0.5 + 0.5) * r.height, behind: pv.z > 1, w: r.width, h: r.height };
};
Gfx.visible = function (x, z, margin) {
	const p = Gfx.project(x, z, 0);
	const m = margin || 0;
	return !p.behind && p.x > -m && p.y > -m && p.x < p.w + m && p.y < p.h + m;
};

// ---------- Init ----------
Gfx.init = function (canvas) {
	renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.1;
	scene = new THREE.Scene();
	scene.fog = new THREE.Fog(0xbfd4e6, 260, 900);
	camera = new THREE.PerspectiveCamera(38, 1, 0.5, 3000);
	Gfx.scene = scene;
	Gfx.camera = camera;
	Gfx.renderer = renderer;

	hemi = new THREE.HemisphereLight(0xbcd0ff, 0x443322, 1);
	scene.add(hemi);
	sun = new THREE.DirectionalLight(0xffffff, 2.5);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	sun.shadow.bias = -0.0003;
	sun.shadow.normalBias = 0.05;
	sun.shadow.camera.near = 1;
	sun.shadow.camera.far = 600;
	scene.add(sun, sun.target);
	for (let i = 0; i < 3; i++) {
		const s = new THREE.SpotLight(0xfff2d0, 0, 45, 0.5, 0.6, 1.6);
		s.userData.used = false;
		scene.add(s, s.target);
		spots.push(s);
	}

	makeGlowTex();
	makeSky();
	makeGround();
	makeWater();
	makeTrees();
	makeTufts();
	makeParticles();
	resize();
	window.addEventListener('resize', resize);
};

function resize() {
	const w = window.innerWidth, h = window.innerHeight;
	renderer.setSize(w, h, false);
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
	for (const p of partSys) p.mat.uniforms.scale.value = (h * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
}
Gfx.resize = resize;

// ---------- Sky ----------
function makeSky() {
	skyMat = new THREE.ShaderMaterial({
		side: THREE.BackSide, depthWrite: false, fog: false,
		uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, sunVis: { value: 1 } },
		vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
		fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunVis; varying vec3 vDir;
			void main(){ vec3 d = normalize(vDir); float h = clamp(d.y, 0.0, 1.0); vec3 c = mix(horizon, top, pow(h, 0.55));
			float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.35) * sunVis;
			gl_FragColor = vec4(c, 1.0);
			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			}`,
	});
	sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), skyMat);
	sky.renderOrder = -10;
	sky.frustumCulled = false;
	scene.add(sky);
	const n = 900, pos = [];
	const r = PG.mulberry32(99);
	for (let i = 0; i < n; i++) {
		const th = r() * Math.PI * 2, y = 0.08 + r() * 0.92;
		const rr = Math.sqrt(1 - y * y);
		pos.push(Math.cos(th) * rr * 1400, y * 1400, Math.sin(th) * rr * 1400);
	}
	const sg = new THREE.BufferGeometry();
	sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
	stars.frustumCulled = false;
	scene.add(stars);
}

// ---------- Ground ----------
function canvasTex(cv) {
	const t = new THREE.CanvasTexture(cv);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = renderer.capabilities.getMaxAnisotropy();
	return t;
}
function makeGround() {
	const cv = PG.Ground.canvases;
	const w = W.size.w, h = W.size.h;
	const outer = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: Gfx.color([58, 74, 44]) }));
	outer.position.set(w / 2, -0.08, h / 2);
	outer.receiveShadow = true;
	scene.add(outer);
	groundTex = canvasTex(cv.ground);
	const ground = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: groundTex }));
	ground.position.set(w / 2, 0, h / 2);
	ground.receiveShadow = true;
	scene.add(ground);
	const gi = PG.Ground.grassInfo;
	grassTex = canvasTex(cv.grass);
	const gw = gi.gw * gi.GC, gh = gi.gh * gi.GC;
	const grass = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: grassTex, alphaTest: 0.5 }));
	grass.position.set(gi.gx0 + gw / 2, 0.03, gi.gz0 + gh / 2);
	grass.receiveShadow = true;
	scene.add(grass);
	marksTex = canvasTex(cv.marks);
	const marks = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: marksTex, transparent: true, depthWrite: false }));
	marks.position.set(w / 2, 0.07, h / 2);
	marks.receiveShadow = true;
	scene.add(marks);
}

// ---------- Water ----------
Gfx.lakeFar = [[900, -300], [330, -300], [300, 38]].concat(W.lake.slice(1, 14), [[232, 600], [900, 600]]);
function makeWater() {
	const shape = new THREE.Shape(Gfx.lakeFar.map((p) => new THREE.Vector2(p[0], -p[1])));
	const geo = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
	waterMat = new THREE.ShaderMaterial({
		fog: true,
		uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
			time: { value: 0 }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() },
			skyCol: { value: new THREE.Color() }, deepCol: { value: new THREE.Color() }, sunAmt: { value: 1 },
		}]),
		vertexShader: `varying vec3 vWorld;
			#include <fog_pars_vertex>
			void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWorld = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
			#include <fog_vertex>
			}`,
		fragmentShader: `uniform float time; uniform vec3 sunDir; uniform vec3 sunCol; uniform vec3 skyCol; uniform vec3 deepCol; uniform float sunAmt; varying vec3 vWorld;
			#include <fog_pars_fragment>
			void main(){
				vec2 p = vWorld.xz; float t = time; vec2 g = vec2(0.0);
				g += vec2(cos(p.x*0.21 + t*0.9), sin(p.y*0.19 - t*0.7)) * 0.05;
				g += vec2(cos(p.x*0.83 + p.y*0.61 + t*1.6), sin(p.x*0.72 - p.y*1.05 + t*1.3)) * 0.03;
				g += vec2(cos(p.x*2.7 - p.y*2.1 + t*2.8), sin(p.x*2.3 + p.y*2.9 - t*2.4)) * 0.012;
				vec3 n = normalize(vec3(g.x, 1.0, g.y));
				vec3 v = normalize(cameraPosition - vWorld);
				float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
				vec3 r = reflect(-v, n);
				float spec = pow(max(dot(r, sunDir), 0.0), 180.0) * sunAmt;
				vec3 c = mix(deepCol, skyCol, 0.12 + 0.8 * fres) + sunCol * spec * 2.5;
				gl_FragColor = vec4(c, 1.0);
				#include <tonemapping_fragment>
				#include <colorspace_fragment>
				#include <fog_fragment>
			}`,
	});
	const water = new THREE.Mesh(geo, waterMat);
	water.position.y = 0.04;
	scene.add(water);
}

// ---------- Trees ----------
function mergeGeos(list) {
	const pos = [], nor = [], col = [];
	for (const g of list) {
		const ng = g.index ? g.toNonIndexed() : g;
		pos.push(...ng.attributes.position.array);
		nor.push(...ng.attributes.normal.array);
		col.push(...ng.attributes.color.array);
	}
	const out = new THREE.BufferGeometry();
	out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
	out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
	out.computeBoundingSphere();
	return out;
}
function blob(x, y, z, r, c, sx, sy) {
	const g = new THREE.IcosahedronGeometry(r, 0);
	g.scale(sx || 1, sy || 0.8, sx || 1);
	g.translate(x, y, z);
	g.computeVertexNormals();
	const C = lin(PG.hex2rgb(c));
	const n = g.attributes.position.count, col = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) { col[i * 3] = C[0]; col[i * 3 + 1] = C[1]; col[i * 3 + 2] = C[2]; }
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	return g;
}
function treeGeometries() {
	const M = PG.Mesh;
	const spruce = Gfx.facesToGeometry([].concat(
		M.cylinder(0, 0, 0, 3, 0.25, 6, '#4a3322'),
		M.cone(0, 0, 2.0, 9.0, 3.1, 8, '#21482a', 0),
		M.cone(0, 0, 4.8, 12.0, 2.5, 8, '#285530', 0.3),
		M.cone(0, 0, 7.8, 15.0, 1.85, 8, '#2f6136', 0.1),
		M.cone(0, 0, 10.8, 18.0, 1.15, 7, '#386c3e', 0.5)
	));
	const pine = mergeGeos([
		Gfx.facesToGeometry(M.cylinder(0, 0, 0, 13, 0.3, 6, '#8a4b2a')),
		blob(0, 14.5, 0, 2.6, '#2f5a2c', 1.2, 0.6), blob(1.6, 12.8, 0.6, 2.0, '#3b6b33', 1.1, 0.6), blob(-1.4, 13.2, -0.8, 2.1, '#27492a', 1.1, 0.6), blob(0.2, 16.2, -0.4, 1.6, '#3b6b33', 1, 0.7),
	]);
	const birch = mergeGeos([
		Gfx.facesToGeometry(M.cylinder(0, 0, 0, 10, 0.2, 6, '#e8e6dc')),
		blob(0, 9.5, 0, 2.6, '#6f9a3c'), blob(1.3, 8.2, 0.7, 1.9, '#86b04a'), blob(-1.2, 8.6, -0.6, 2.0, '#5b8733'), blob(0.3, 11.2, 0.2, 1.7, '#9cc25a'), blob(-0.5, 7.2, 1.0, 1.5, '#7aa645'),
	]);
	const far = Gfx.facesToGeometry([].concat(M.cylinder(0, 0, 0, 2.5, 0.25, 5, '#4a3322'), M.cone(0, 0, 2, 17, 3.0, 7, '#244c2c')));
	return { spruce, pine, birch, far };
}
function makeTrees() {
	const geos = treeGeometries();
	const groups = { spruce: [], pine: [], birch: [] };
	for (const t of W.trees) groups[t.v < 6 ? 'spruce' : t.v < 8 ? 'pine' : 'birch'].push(t);
	const r = PG.mulberry32(17);
	const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
	const c = new THREE.Color();
	const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
	const sizeK = { spruce: 0.72, pine: 0.75, birch: 0.85 };
	for (const k of Object.keys(groups)) {
		const list = groups[k];
		const im = new THREE.InstancedMesh(geos[k], mat, list.length);
		list.forEach((t, i) => {
			const sk = t.s * sizeK[k];
			const hs = sk * (0.85 + (t.v % 6) * 0.06 + r() * 0.1);
			q.setFromAxisAngle(up, r() * Math.PI * 2);
			m4.compose(p.set(t.x, 0, t.z), q, s.set(sk, hs, sk));
			im.setMatrixAt(i, m4);
			const v = 0.82 + r() * 0.3;
			im.setColorAt(i, c.setRGB(v, v * (0.95 + r() * 0.1), v));
		});
		im.castShadow = true;
		im.receiveShadow = false;
		scene.add(im);
	}
	// Distant forest outside the camp map.
	const farList = [];
	const inner = (x, z) => x > -22 && x < 312 && z > -22 && z < 207;
	for (let z = -200; z < 420; z += 8) {
		for (let x = -220; x < 520; x += 8) {
			const fx = x + (r() - 0.5) * 6, fz = z + (r() - 0.5) * 6;
			if (inner(fx, fz) || PG.pointInPoly(fx, fz, Gfx.lakeFar)) continue;
			if (Math.abs(fx - 162) < 6 && fz > 190) continue;
			farList.push([fx, fz, 0.8 + r() * 0.5]);
		}
	}
	const fm = new THREE.InstancedMesh(geos.far, mat, farList.length);
	farList.forEach((t, i) => {
		q.setFromAxisAngle(up, r() * 6.28);
		m4.compose(p.set(t[0], 0, t[1]), q, s.set(t[2], t[2] * (0.9 + r() * 0.3), t[2]));
		fm.setMatrixAt(i, m4);
		const v = 0.75 + r() * 0.3;
		fm.setColorAt(i, c.setRGB(v, v, v));
	});
	scene.add(fm);
}

// ---------- Grass tufts (3D blades on tall grass) ----------
function makeTufts() {
	const pos = [], nor = [], col = [];
	const base = lin([84, 128, 52]), tip = lin([178, 196, 104]);
	for (let b = 0; b < 5; b++) {
		const a = (b / 5) * Math.PI + 0.3, ca = Math.cos(a) * 0.16, sa = Math.sin(a) * 0.16;
		const lean = (b % 2 ? 0.12 : -0.1);
		const tx = Math.cos(a + 1.5) * lean, tz = Math.sin(a + 1.5) * lean;
		// Both windings so each side is front-facing with an upward normal (evenly lit).
		pos.push(-ca, 0, -sa, ca, 0, sa, tx, 1, tz, ca, 0, sa, -ca, 0, -sa, tx, 1, tz);
		for (let k = 0; k < 6; k++) nor.push(0, 1, 0);
		col.push(...base, ...base, ...tip, ...base, ...base, ...tip);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
	g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
	const gi = PG.Ground.grassInfo, ga = PG.Ground.grassArrays;
	const r = PG.mulberry32(23);
	for (let j = 0; j < gi.gh; j++) for (let i = 0; i < gi.gw; i++) {
		const k = j * gi.gw + i;
		if (!ga.mask[k]) continue;
		for (let n = 0; n < 3; n++) tuftCells.push({ k, x: gi.gx0 + (i + 0.15 + r() * 0.7) * gi.GC, z: gi.gz0 + (j + 0.15 + r() * 0.7) * gi.GC, a: r() * 6.28, s: 0.7 + r() * 0.6 });
	}
	tufts = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }), tuftCells.length);
	tufts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
	tufts.receiveShadow = true;
	tufts.frustumCulled = false;
	scene.add(tufts);
	updateTufts();
}
function updateTufts() {
	const len = PG.Ground.grassArrays.len;
	const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
	for (let i = 0; i < tuftCells.length; i++) {
		const t = tuftCells[i];
		const L = len[t.k];
		const h = Math.max(0, L - 0.55) * 0.9 * t.s;
		q.setFromAxisAngle(up, t.a);
		m4.compose(p.set(t.x, 0.02, t.z), q, s.set(h > 0 ? 1.4 * t.s : 0, h, h > 0 ? 1.4 * t.s : 0));
		tufts.setMatrixAt(i, m4);
	}
	tufts.instanceMatrix.needsUpdate = true;
}

// ---------- Particles ----------
const PMAX = 900;
function makeParticleSystem(additive) {
	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PMAX * 3), 3).setUsage(THREE.DynamicDrawUsage));
	geo.setAttribute('pcolor', new THREE.BufferAttribute(new Float32Array(PMAX * 4), 4).setUsage(THREE.DynamicDrawUsage));
	geo.setAttribute('psize', new THREE.BufferAttribute(new Float32Array(PMAX), 1).setUsage(THREE.DynamicDrawUsage));
	geo.setAttribute('pring', new THREE.BufferAttribute(new Float32Array(PMAX), 1).setUsage(THREE.DynamicDrawUsage));
	const mat = new THREE.ShaderMaterial({
		transparent: true, depthWrite: false, fog: true,
		blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
		uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { scale: { value: 500 } }]),
		vertexShader: `attribute vec4 pcolor; attribute float psize; attribute float pring; uniform float scale; varying vec4 vColor; varying float vRing;
			#include <fog_pars_vertex>
			void main(){ vColor = pcolor; vRing = pring; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_PointSize = psize * scale / -mvPosition.z; gl_Position = projectionMatrix * mvPosition;
			#include <fog_vertex>
			}`,
		fragmentShader: `varying vec4 vColor; varying float vRing;
			#include <fog_pars_fragment>
			void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; float a;
			if (vRing > 0.5) a = smoothstep(0.65, 0.82, r) * (1.0 - smoothstep(0.9, 1.0, r)); else a = 1.0 - smoothstep(0.45, 1.0, r);
			if (a < 0.01) discard; gl_FragColor = vec4(vColor.rgb, vColor.a * a);
			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			}`,
	});
	const pts = new THREE.Points(geo, mat);
	pts.frustumCulled = false;
	scene.add(pts);
	return { pts, geo, mat, additive };
}
function makeParticles() {
	partSys = [makeParticleSystem(false), makeParticleSystem(true)];
}
function updateParticles() {
	const list = PG.Particles.list;
	const light = [L.hemiSky[0] * L.hemiIntensity * 0.55 + L.sunColor[0] * L.sunIntensity * 0.22, L.hemiSky[1] * L.hemiIntensity * 0.55 + L.sunColor[1] * L.sunIntensity * 0.22, L.hemiSky[2] * L.hemiIntensity * 0.55 + L.sunColor[2] * L.sunIntensity * 0.22];
	const n = [0, 0];
	for (const p of list) {
		const t = p.t;
		const sys = t.glow ? 1 : 0;
		const S = partSys[sys];
		const i = n[sys]++;
		if (i >= PMAX) continue;
		S.geo.attributes.position.array.set([p.x, p.h, p.z], i * 3);
		const C = lin(p.color || t.c);
		const fade = 1 - p.life / p.max;
		const a = t.a * (t.grav < 0 ? fade : Math.min(1, fade * 3));
		const k = t.glow ? [1, 1, 1] : light;
		S.geo.attributes.pcolor.array.set([C[0] * k[0], C[1] * k[1], C[2] * k[2], t.ring ? a * fade : a], i * 4);
		S.geo.attributes.psize.array[i] = Math.max(0.05, p.size) * 2;
		S.geo.attributes.pring.array[i] = t.ring ? 1 : 0;
	}
	for (let s = 0; s < 2; s++) {
		const S = partSys[s];
		S.geo.setDrawRange(0, Math.min(PMAX, n[s]));
		for (const k of ['position', 'pcolor', 'psize', 'pring']) S.geo.attributes[k].needsUpdate = true;
	}
}

// ---------- People ----------
const matCache = new Map();
function mat(c) {
	const key = c.join(',');
	let m = matCache.get(key);
	if (!m) { m = new THREE.MeshLambertMaterial({ color: Gfx.color(c) }); matCache.set(key, m); }
	return m;
}
Gfx.mat = mat;
const BOX = new THREE.BoxGeometry(1, 1, 1);
const BALL = new THREE.IcosahedronGeometry(1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10);

function part(geo, material, sx, sy, sz, x, y, z) {
	const m = new THREE.Mesh(geo, material);
	m.scale.set(sx, sy, sz);
	m.position.set(x, y, z);
	m.castShadow = true;
	return m;
}

Gfx.makePerson = function (look, H) {
	const root = new THREE.Group();
	const body = new THREE.Group();
	root.add(body);
	const skinMat = new THREE.MeshLambertMaterial({ color: Gfx.color(look.skin) });
	const shirt = mat(look.shirt), pants = mat(look.pants);
	const legs = [], arms = [];
	for (const side of [-1, 1]) {
		const pivot = new THREE.Group();
		pivot.position.set(0, 0.5 * H, side * 0.075 * H);
		pivot.add(part(BOX, pants, 0.12 * H, 0.5 * H, 0.11 * H, 0, -0.25 * H, 0));
		body.add(pivot);
		legs.push(pivot);
		const ap = new THREE.Group();
		ap.position.set(0, 0.8 * H, side * 0.19 * H);
		ap.add(part(BOX, shirt, 0.085 * H, 0.34 * H, 0.085 * H, 0, -0.17 * H, 0));
		const hand = part(BALL, skinMat, 0.045 * H, 0.045 * H, 0.045 * H, 0, -0.35 * H, 0);
		ap.add(hand);
		body.add(ap);
		arms.push(ap);
	}
	body.add(part(BOX, shirt, 0.2 * H, 0.34 * H, 0.32 * H, 0, 0.66 * H, 0));
	if (look.scarf) body.add(part(BOX, mat(look.scarf), 0.05 * H, 0.12 * H, 0.14 * H, 0.1 * H, 0.77 * H, 0));
	const head = part(BALL, skinMat, 0.1 * H, 0.11 * H, 0.1 * H, 0, 0.92 * H, 0);
	body.add(head);
	body.add(part(BALL, mat(look.hair), 0.105 * H, 0.07 * H, 0.105 * H, -0.01 * H, 0.97 * H, 0));
	if (look.hat) {
		body.add(part(CYL, mat(look.hat), 0.1 * H, 0.05 * H, 0.1 * H, 0, 1.0 * H, 0));
		body.add(part(BOX, mat(look.hat), 0.1 * H, 0.01 * H, 0.16 * H, 0.08 * H, 0.98 * H, 0));
	}
	// Props
	const axe = new THREE.Group();
	axe.add(part(BOX, mat([150, 110, 70]), 0.03, 0.75, 0.03, 0, -0.35, 0));
	axe.add(part(BOX, mat([140, 140, 145]), 0.22, 0.12, 0.04, 0.08, -0.7, 0));
	axe.position.set(0, -0.34 * H, 0);
	axe.visible = false;
	arms[1].add(axe);
	const barrel = part(CYL, mat([60, 90, 120]), 0.25, 0.45, 0.25, 0.38, 0.55 * H, 0);
	barrel.visible = false;
	root.add(barrel);
	const cart = new THREE.Group();
	cart.add(part(BOX, mat([40, 110, 60]), 0.9, 0.3, 0.6, 0.85, 0.45, 0));
	cart.add(part(CYL, mat([30, 30, 30]), 0.18, 0.08, 0.18, 1.35, 0.18, 0).rotateX(Math.PI / 2));
	const logs = new THREE.Group();
	for (let i = 0; i < 4; i++) logs.add(part(CYL, mat([170, 125, 80]), 0.08, 0.7, 0.08, 0.85, 0.65 + (i % 2) * 0.12, -0.18 + i * 0.12).rotateZ(Math.PI / 2));
	cart.add(logs);
	cart.visible = false;
	root.add(cart);
	const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }));
	ring.position.y = 0.06;
	ring.visible = false;
	root.add(ring);
	scene.add(root);
	const skinBase = Gfx.color(look.skin), blueC = Gfx.color([120, 170, 255]);
	return {
		root, ring,
		update(o) {
			root.visible = !o.hidden;
			if (o.hidden) return;
			root.position.set(o.x, o.h || 0, o.z);
			root.rotation.y = -(o.heading || 0);
			const sw = o.moving ? Math.sin(o.phase) * 0.6 : 0;
			legs[0].rotation.z = sw; legs[1].rotation.z = -sw;
			arms[0].rotation.z = -sw * 0.8; arms[1].rotation.z = sw * 0.8;
			arms[0].rotation.x = arms[1].rotation.x = 0;
			legs[0].rotation.x = legs[1].rotation.x = 0;
			body.position.set(0, o.moving ? Math.abs(Math.cos(o.phase)) * 0.04 * H : 0, 0);
			body.rotation.set(0, 0, 0);
			axe.visible = false;
			const t = o.t || 0;
			if (o.act === 'chop') {
				const k = (Math.sin(t * 7) + 1) / 2;
				arms[0].rotation.z = arms[1].rotation.z = 2.6 - k * 2.4;
				axe.visible = true;
				body.rotation.z = -0.1 * k;
			} else if (o.act === 'pull' || o.act === 'work') {
				arms[0].rotation.z = arms[1].rotation.z = 1.1 + Math.sin(t * 9) * 0.35;
			} else if (o.act === 'stuck') {
				arms[0].rotation.z = arms[1].rotation.z = 0.9;
				body.rotation.z = -0.25 + Math.sin(t * 14) * 0.08;
			} else if (o.act === 'wave') {
				arms[1].rotation.x = -2.6 + Math.sin(t * 10) * 0.3;
			} else if (o.act === 'shiver') {
				body.position.z = Math.sin(t * 60) * 0.02;
				arms[0].rotation.x = 0.5; arms[1].rotation.x = -0.5;
			} else if (o.act === 'sit') {
				legs[0].rotation.z = legs[1].rotation.z = 1.45;
				arms[0].rotation.z = arms[1].rotation.z = 0.9;
			}
			if (o.carry === 'tunna') { arms[0].rotation.z = arms[1].rotation.z = 0.9; }
			if (o.carry === 'karra' || o.carry === 'karraTom') { arms[0].rotation.z = arms[1].rotation.z = 0.45; }
			barrel.visible = o.carry === 'tunna';
			cart.visible = o.carry === 'karra' || o.carry === 'karraTom';
			logs.visible = o.carry === 'karra';
			skinMat.color.copy(o.blue ? blueC : skinBase);
			ring.visible = !!o.ring;
			if (o.ring) ring.material.color.set(o.ring);
		},
		dispose() { scene.remove(root); },
	};
};

// ---------- Per-frame ----------
const v3 = new THREE.Vector3();
Gfx.update = function (dt, time) {
	cam.update(dt);
	// Lighting
	const ld = L.lightDir;
	v3.set(ld[0], ld[2], ld[1]).normalize();
	const S = PG.clamp(cam.dist * 0.85, 50, 190);
	const sc = sun.shadow.camera;
	if (sc.right !== S) { sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S; sc.updateProjectionMatrix(); }
	// Snap shadow center to texels to reduce shimmering.
	const step = (2 * S) / 2048;
	const cx = Math.round(cam.tx / step) * step, cz = Math.round(cam.tz / step) * step;
	sun.target.position.set(cx, 0, cz);
	sun.position.set(cx + v3.x * 250, v3.y * 250, cz + v3.z * 250);
	sun.color.setRGB(L.sunColor[0], L.sunColor[1], L.sunColor[2], THREE.SRGBColorSpace);
	sun.intensity = L.sunIntensity;
	hemi.color.setRGB(L.hemiSky[0], L.hemiSky[1], L.hemiSky[2], THREE.SRGBColorSpace);
	hemi.groundColor.setRGB(L.hemiGround[0], L.hemiGround[1], L.hemiGround[2], THREE.SRGBColorSpace);
	hemi.intensity = L.hemiIntensity;
	MAT.window.emissiveIntensity = L.windows * 1.6;
	const u = skyMat.uniforms;
	u.top.value.setRGB(L.skyTop[0], L.skyTop[1], L.skyTop[2], THREE.SRGBColorSpace);
	u.horizon.value.setRGB(L.skyHorizon[0], L.skyHorizon[1], L.skyHorizon[2], THREE.SRGBColorSpace);
	u.sunDir.value.set(L.sun[0], L.sun[2], L.sun[1]).normalize();
	u.sunCol.value.setRGB(L.sunColor[0], L.sunColor[1], L.sunColor[2], THREE.SRGBColorSpace);
	u.sunVis.value = L.sun[2] > -0.05 ? 1 : 0;
	scene.fog.color.copy(u.horizon.value);
	sky.position.copy(camera.position);
	stars.position.copy(camera.position);
	stars.material.opacity = PG.clamp(1 - L.day * 1.6, 0, 1) * 0.9;
	const wu = waterMat.uniforms;
	wu.time.value = time;
	wu.sunDir.value.copy(v3);
	wu.sunCol.value.setRGB(L.sunColor[0], L.sunColor[1], L.sunColor[2], THREE.SRGBColorSpace).multiplyScalar(Math.min(1, L.sunIntensity));
	wu.skyCol.value.copy(u.horizon.value).lerp(u.top.value, 0.3);
	wu.deepCol.value.setRGB(0.05, 0.13, 0.18).multiplyScalar(0.3 + 0.7 * L.day);
	wu.sunAmt.value = L.sun[2] > 0 ? 1 : 0.35;
	// Ground textures
	const G = PG.Ground;
	grassUploadT -= dt;
	if (G.grassVersion !== grassVersion && grassUploadT <= 0) {
		grassVersion = G.grassVersion;
		grassTex.needsUpdate = true;
		grassUploadT = 0.12;
	}
	if (G.marksVersion !== marksVersion) {
		marksVersion = G.marksVersion;
		marksTex.needsUpdate = true;
	}
	tuftTimer -= dt;
	if (G.grassVersion !== tuftVersion && tuftTimer <= 0) {
		tuftVersion = G.grassVersion;
		tuftTimer = 0.15;
		updateTufts();
	}
	updateParticles();
};

Gfx.render = function () {
	renderer.render(scene, camera);
};
