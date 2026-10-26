/**
 * @fileoverview Servidor Backend Local (API REST + SQLite + Archivos Estáticos ES6) para HeroQuest 2.5D PC.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8081);
const ERROR_LOG = path.join(ROOT_DIR, 'server-error.log');
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_SLOT_ID = 3;

/**
 * Registra errores fatales en disco: cuando se arranca desde HeroQuest25D.exe no hay consola visible.
 */
function logFatal(label, err) {
    const line = `[${new Date().toISOString()}] ${label}: ${err && err.stack ? err.stack : err}\n`;
    console.error(line);
    try {
        fs.appendFileSync(ERROR_LOG, line);
    } catch { /* sin acceso a disco: ignorar */ }
}

process.on('uncaughtException', (err) => {
    logFatal('uncaughtException', err);
    process.exit(1);
});

// Importación dinámica: si node:sqlite no está disponible (Node < 22.5 o sin --experimental-sqlite)
// el error queda registrado en server-error.log en lugar de perderse.
let db;
try {
    const { GameDatabase } = await import('./database.mjs');
    db = new GameDatabase();
} catch (err) {
    logFatal('No se pudo inicializar la base de datos SQLite (¿Node >= 22.5?)', err);
    process.exit(1);
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav'
};

// Carpetas del proyecto que nunca deben servirse como estáticos (BBDD, código del servidor, git...)
const BLOCKED_PREFIXES = ['data', 'server', 'launcher', '.git', '.vscode', 'node_modules'];

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(data));
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        let aborted = false;
        req.on('data', (chunk) => {
            if (aborted) return;
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                aborted = true;
                chunks.length = 0; // descartar lo recibido; el resto del cuerpo se ignora
                reject(httpError(413, 'Payload demasiado grande'));
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            if (aborted) return;
            // Concatenar los Buffers antes de decodificar evita corromper caracteres UTF-8 partidos entre chunks
            const body = Buffer.concat(chunks).toString('utf8');
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                reject(httpError(400, 'JSON inválido'));
            }
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
    const pathname = parsedUrl.pathname;
    const method = req.method || 'GET';

    // =========================================================================
    // 1. ENDPOINTS API REST DE BASE DE DATOS SQLITE
    // =========================================================================
    if (pathname.startsWith('/api/')) {
        try {
            // Exigir JSON en escrituras: obliga a un preflight CORS (que nunca se aprueba) y
            // evita que otra web abierta en el navegador sobrescriba partidas (CSRF).
            if (method === 'POST') {
                const contentType = String(req.headers['content-type'] || '');
                if (!contentType.startsWith('application/json')) {
                    return sendJson(res, 415, { ok: false, error: 'Se requiere Content-Type: application/json' });
                }
            }

            if (pathname === '/api/health' && method === 'GET') {
                return sendJson(res, 200, {
                    ok: true,
                    engine: 'HeroQuest 2.5D PC Engine',
                    database: 'SQLite (node:sqlite WAL)',
                    dbPath: db.dbPath
                });
            }

            if (pathname === '/api/quests' && method === 'GET') {
                return sendJson(res, 200, { ok: true, quests: db.listQuests() });
            }

            if (pathname === '/api/saves' && method === 'GET') {
                return sendJson(res, 200, { ok: true, slots: db.listSaveSlots() });
            }

            const saveMatch = pathname.match(/^\/api\/saves\/(\d+)$/);
            if (saveMatch) {
                const slotId = Number(saveMatch[1]);
                if (slotId > MAX_SLOT_ID) {
                    return sendJson(res, 400, { ok: false, error: `Ranura fuera de rango (0-${MAX_SLOT_ID})` });
                }
                if (method === 'GET') {
                    const save = db.getSaveSlot(slotId);
                    if (!save) {
                        return sendJson(res, 404, { ok: false, error: 'Ranura vacía' });
                    }
                    return sendJson(res, 200, { ok: true, save });
                }
                if (method === 'POST') {
                    const body = await readJsonBody(req);
                    return sendJson(res, 200, db.saveGame(slotId, body));
                }
                if (method === 'DELETE') {
                    return sendJson(res, 200, db.deleteSaveSlot(slotId));
                }
            }

            if (pathname === '/api/hall-of-fame') {
                if (method === 'GET') {
                    return sendJson(res, 200, { ok: true, records: db.getHallOfFame(15) });
                }
                if (method === 'POST') {
                    const body = await readJsonBody(req);
                    return sendJson(res, 200, db.recordHallOfFame(body));
                }
            }

            return sendJson(res, 404, { ok: false, error: 'Endpoint no encontrado' });
        } catch (err) {
            const status = err.status || 500;
            if (status >= 500) console.error('[API Error]:', err);
            if (!res.headersSent) {
                if (status === 413) res.setHeader('Connection', 'close');
                sendJson(res, status, { ok: false, error: err.message });
                // Cortar la subida sobredimensionada una vez enviada la respuesta
                if (status === 413) res.on('finish', () => req.destroy());
            }
            return;
        }
    }

    // =========================================================================
    // 2. SERVIDOR DE ARCHIVOS ESTÁTICOS ES6
    // =========================================================================
    if (method !== 'GET' && method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        res.end();
        return;
    }

    let relPath;
    try {
        relPath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    } catch {
        res.writeHead(400);
        res.end('Bad Request');
        return;
    }

    const safePath = path.resolve(ROOT_DIR, '.' + relPath);
    const relFromRoot = path.relative(ROOT_DIR, safePath);
    const firstSegment = relFromRoot.split(path.sep)[0];

    if (
        relFromRoot === '' ||
        relFromRoot.startsWith('..') ||
        path.isAbsolute(relFromRoot) ||
        relPath.includes('\0') ||
        BLOCKED_PREFIXES.includes(firstSegment)
    ) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(safePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
            return;
        }
        const ext = path.extname(safePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
            'Cache-Control': 'no-cache'
        });
        res.end(method === 'HEAD' ? undefined : data);
    });
});

server.on('error', (err) => {
    logFatal(`No se pudo abrir el puerto ${PORT}`, err);
    process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[HeroQuest 2.5D PC] Servidor + BBDD SQLite activo en http://localhost:${PORT}`);
});
