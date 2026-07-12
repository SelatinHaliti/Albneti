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
import communityRoutes from './routes/community.js';
import verificationRoutes from './routes/verification.js';
import callRoutes from './routes/calls.js';
import pushRoutes from './routes/push.js';
import liveRoutes from './routes/live.js';
import marketingRoutes from './routes/marketing.js';
import { stripeWebhook } from './controllers/verificationController.js';
import { setupSocketIO } from './sockets/index.js';
import { setIO } from './sockets/io.js';
import { initMonitoring, errorHandler } from './middleware/monitoring.js';
import { seedCommunityEvents } from './services/eventSeed.js';
import { runScheduledEventPromos } from './services/eventAdsService.js';
import { runWeeklyMarketingEmails, resetStuckMarketingRuns } from './services/marketingEmailService.js';
import { isSmtpConfigured, isEmailConfigured } from './utils/email.js';
import { isStripeConfigured } from './services/stripeService.js';

connectDB().then(() => {
  void initMonitoring();
  seedCommunityEvents();
  resetStuckMarketingRuns().catch(() => {});
  setTimeout(() => runScheduledEventPromos().catch(() => {}), 15000);
  setInterval(() => runScheduledEventPromos().catch(() => {}), 6 * 60 * 60 * 1000);
  setTimeout(() => runWeeklyMarketingEmails().catch(() => {}), 45000);
  setInterval(() => runWeeklyMarketingEmails().catch(() => {}), 24 * 60 * 60 * 1000);
});

const app = express();
const httpServer = createServer(app);

// Lejo origin-et e njohura (dev + produksion)
const allowedOrigins = [
  // Zhvillim lokal
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  // Produksion – Vercel
  'https://albneti.vercel.app',
  'https://albneti-git-main-selatinhaliti6-2891s-projects.vercel.app',
  // Produksion – Render (për self-referential calls)
  'https://albneti-api.onrender.com',
  // Variabël dinamike nga .env
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
      // Lejo kërkesat pa origin (curl, Postman, server-to-server)
      if (!origin) return cb(null, true);
      // Lejo origin-et e njohura
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Lejo çdo subdomain i Vercel-it (preview deployments)
      if (/\.vercel\.app$/.test(origin)) return cb(null, true);
      // Lejo localhost me çdo port (zhvillim lokal)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
      return cb(new Error('CORS: origin i palejuar'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(cookieParser());

// Stripe webhook – duhet raw body, para express.json()
app.post(
  '/api/verification/stripe-webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

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
app.use('/api/community', communityRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/marketing', marketingRoutes);

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
    smtpConfigured: isEmailConfigured(),
    stripeConfigured: isStripeConfigured(),
    timestamp: new Date().toISOString(),
  });
});

// Global error handler (monitoring) – duhet të jetë i fundit
app.use(errorHandler);

// Socket.io setup
setupSocketIO(io);
setIO(io);

// Export app për Vercel
export default app;

const PORT = process.env.PORT || 5000;

// Nis serverin vetëm nëse nuk jemi në Vercel (për dev lokal)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
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
}
