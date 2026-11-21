// Startpunkt: laddar moduler i ordning, bygger världen och kör spelloopen.
import './util.js';
import './audio.js';
import './world.js';
import './ground.js';
import './mesh.js';
import './gfx.js';
import './objects.js';
import './actors.js';
import './game.js';
import './ui.js';

const PG = window.PG;

function boot() {
	PG.World.generateTrees();
	PG.World.buildNav();
	PG.Ground.init();
	PG.Gfx.init(document.getElementById('view'));
	PG.Objects.init();
	PG.Vehicles.init();
	PG.Mower.init();
	PG.Mower.reset();
	PG.Game.init();
	PG.UI.init();
	document.body.classList.add('ready');

	let last = performance.now();
	function frame(now) {
		const dt = Math.min(0.05, (now - last) / 1000);
		last = now;
		PG.Game.update(dt);
		PG.Light.setTime(PG.state.time);
		PG.Game.sync();
		PG.Objects.update(dt, now / 1000);
		PG.Gfx.update(dt, now / 1000);
		PG.Gfx.render();
		PG.UI.update(dt);
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
}

try {
	boot();
} catch (err) {
	console.error(err);
	const el = document.getElementById('loading');
	if (el) el.textContent = 'Kunde inte starta spelet: ' + err.message;
}
