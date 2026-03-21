import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export function statsPlugin(): Plugin {
  const filePath = path.resolve(process.cwd(), 'stats-data.json');

  return {
    name: 'stats-plugin',
    configureServer(server) {
      server.middlewares.use('/api/stats', (req, res, next) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method === 'GET') {
          try {
            const data = fs.existsSync(filePath)
              ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
              : { history: [], noGameDays: 0 };
            res.end(JSON.stringify(data));
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to read stats' }));
          }
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to write stats' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}
