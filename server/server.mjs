/**
 * @fileoverview Servidor Backend Local (API REST + SQLite + Archivos Estáticos ES6) para HeroQuest 2.5D PC.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameDatabase } from './database.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8081);

const db = new GameDatabase();

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(data));
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 5 * 1024 * 1024) {
                reject(new Error('Payload demasiado grande'));
            }
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
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
    try {
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
            if (method === 'GET') {
                const save = db.getSaveSlot(slotId);
                if (!save) {
                    return sendJson(res, 404, { ok: false, error: 'Ranura vacía' });
                }
                return sendJson(res, 200, { ok: true, save });
            }
            if (method === 'POST') {
                const body = await readJsonBody(req);
                const result = db.saveGame(slotId, body);
                return sendJson(res, 200, result);
            }
            if (method === 'DELETE') {
                const result = db.deleteSaveSlot(slotId);
                return sendJson(res, 200, result);
            }
        }

        if (pathname === '/api/hall-of-fame') {
            if (method === 'GET') {
                return sendJson(res, 200, { ok: true, records: db.getHallOfFame(15) });
            }
            if (method === 'POST') {
                const body = await readJsonBody(req);
                const result = db.recordHallOfFame(body);
                return sendJson(res, 200, result);
            }
        }
    } catch (err) {
        console.error('[API Error]:', err);
        return sendJson(res, 500, { ok: false, error: err.message });
    }

    // =========================================================================
    // 2. SERVIDOR DE ARCHIVOS ESTÁTICOS ES6
    // =========================================================================
    const relPath = pathname === '/' ? '/index.html' : pathname;
    const safePath = path.normalize(path.join(ROOT_DIR, relPath));

    if (!safePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(safePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(`Not Found: ${relPath}`);
            return;
        }
        const ext = path.extname(safePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
            'Cache-Control': 'no-cache'
        });
        res.end(data);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[HeroQuest 2.5D PC] Servidor + BBDD SQLite activo en http://localhost:${PORT}`);
});
