// Minimal static file server for local development: `npm start` -> http://localhost:21046
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT) || 21046;
const types = {
	'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
	'.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
	try {
		const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
		let file = normalize(join(root, urlPath));
		if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end('Forbidden'); return; }
		if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
		const body = await readFile(file);
		res.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
		res.end(body);
	} catch {
		res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
	}
}).listen(port, '127.0.0.1', () => console.log(`Portalen: http://localhost:${port}/`));
