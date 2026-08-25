import express from 'express';
import cors from 'cors';
import { createServer as createHttpServer } from 'http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { store } from './store.js';
import { createMcpServer } from './mcp-handler.js';
import { PointrPayload } from './types.js';

export async function createServer(port: number = 3333): Promise<{ server: any, port: number }> {
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '50mb' }));

  const mcpServer = createMcpServer();
  let sseTransport: SSEServerTransport | null = null;

  app.post('/context', (req, res) => {
    try {
      const payload = req.body as PointrPayload;
      if (!payload || !payload.source || !payload.dom) {
        return res.status(400).json({ error: 'Invalid payload schema' });
      }
      store.push(payload);
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to process payload' });
    }
  });

  app.get('/context/latest', (req, res) => {
    const latest = store.getLatest();
    if (!latest) {
      return res.status(404).json({ error: 'No payload found' });
    }
    res.json(latest);
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '0.1.0',
      payloadCount: store.getAll().length
    });
  });

  app.get('/mcp', async (req, res) => {
    sseTransport = new SSEServerTransport("/message", res);
    await mcpServer.server.connect(sseTransport);
  });

  app.post('/message', async (req, res) => {
    if (sseTransport) {
      await sseTransport.handlePostMessage(req, res);
    } else {
      res.status(400).send("SSE transport not initialized");
    }
  });

  return new Promise((resolve, reject) => {
    const tryPort = (currentPort: number) => {
      if (currentPort > 3340) {
        reject(new Error('No available ports between 3333 and 3340'));
        return;
      }
      
      const server = createHttpServer(app);
      server.listen(currentPort, () => {
        resolve({ server, port: currentPort });
      });

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          tryPort(currentPort + 1);
        } else {
          reject(err);
        }
      });
    };

    tryPort(port);
  });
}
