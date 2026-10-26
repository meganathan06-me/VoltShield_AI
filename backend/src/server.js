import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import createApiRouter from './routes/api.js';
//import { startMqtt } from './services/mqtt.js';

const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const io = new Server(server, { cors: { origin: allowedOrigin, methods: ['GET', 'POST', 'PATCH'] } });

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '100kb' }));
app.get('/', (_req, res) => res.send('VoltShield AI API is running'));
app.use('/api', createApiRouter(io));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const port = Number(process.env.PORT) || 5000;

connectDB()
  .then(() => {
    //startMqtt(io);
    server.listen(port, () => console.log(`VoltShield API listening on http://localhost:${port}`));
  })
  .catch(err => {
    console.error('Startup failed:', err.message);
    process.exit(1);
  });
