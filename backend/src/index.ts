import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config.js';
import { setupWebSocket } from './ws/handler.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import collaboratorRoutes from './routes/collaborators.js';
import settingsRoutes from './routes/settings.js';
import webhookRoutes from './routes/webhooks.js';
import { rateLimit } from './middleware/rateLimit.js';
import { createWorker } from './queue/setup.js';
import { agentWorkerProcessor } from './queue/workers/agentWorker.js';
import { cleanupWorkerProcessor } from './queue/workers/cleanupWorker.js';

createWorker('tasks', agentWorkerProcessor);
createWorker('cleanup', cleanupWorkerProcessor);

const app = express();
const frontendOrigin = config.frontendUrl.replace(/\/+$/, '');
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json());
app.use(rateLimit());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/webhooks', webhookRoutes);

const server = createServer(app);
setupWebSocket(server);

server.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);
});
