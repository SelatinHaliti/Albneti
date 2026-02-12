import './env.js'; // I pari – ngarkon .env para çdo importi tjetër
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import storyRoutes from './routes/stories.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import exploreRoutes from './routes/explore.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import musicRoutes from './routes/music.js';
import globalChatRoutes from './routes/globalChat.js';
import { setupSocketIO } from './sockets/index.js';
import { setIO } from './sockets/io.js';

connectDB();

const app = express();
const httpServer = createServer(app);

// Lejo të gjitha origin-et e localhost për dev (3000, 3001, etj.)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  process.env.FRONTEND_URL,
].filter(Boolean);

// Socket.io me CORS për frontend
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  },
});

// Middleware sigurie
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, true); // në dev lejojmë çdo origin
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());

// Rate limiting – 1000 kërkesa çdo 15 minuta (për login dhe përdorim normal)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: 'Shumë kërkesa. Prisni rreth 15 minuta ose provoni përsëri më vonë.' },
  standardHeaders: true,
});
app.use('/api', limiter);

// Rrugët API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/global-chat', globalChatRoutes);

// Health check – përfshirë gjendjen e DB (për load balancer / monitoring)
app.get('/api/health', async (req, res) => {
  const mongoose = (await import('mongoose')).default;
  const dbState = mongoose.connection.readyState;
  const dbOk = dbState === 1;
  const status = dbOk ? 'ok' : 'degraded';
  const statusCode = dbOk ? 200 : 503;
  res.status(statusCode).json({
    status,
    message: dbOk ? 'AlbNet API është aktiv' : 'Baza e të dhënave nuk është e lidhur',
    db: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Socket.io setup
setupSocketIO(io);
setIO(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`AlbNet backend në http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
  import('./config/cloudinary.js').then(({ isCloudinaryConfigured }) => {
    if (!isCloudinaryConfigured) {
      console.warn('Cloudinary: NUK është konfiguruar. Vendosni CLOUDINARY_* në backend/.env (merrni nga https://cloudinary.com)');
    } else {
      console.log('Cloudinary: konfiguruar');
    }
  }).catch(() => {});
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Gabim: Porti ${PORT} është i zënë. Mbyllni procesin tjetër ose përdorni PORT=${parseInt(PORT, 10) + 1} npm run start`);
    process.exit(1);
  }
  throw err;
});
