import dotenv from 'dotenv';
// Load environment variables immediately before importing anything else
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Routes
import authRoutes from './routes/authRoutes';
import runRoutes from './routes/runRoutes';
import courseRoutes from './routes/courseRoutes';
import battleRoutes from './routes/battleRoutes';


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Routes ─────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/battles', battleRoutes);

// Configuration Endpoint
app.get('/api/config', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      kakaoMapApiKey: process.env.KAKAO_MAP_API_KEY || '',
    },
  });
});


// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    message: 'Coding Marathon Running App Server is running smoothly!',
    endpoints: {
      auth: '/api/auth (login, register, users)',
      runs: '/api/runs (CRUD, stats)',
      courses: '/api/courses (list, detail, recommend)',
      battles: '/api/battles (list, create, accept)',
    },
  });
});

// Root Route
app.get('/', (req: Request, res: Response) => {
  res.send('🏃 Welcome to the Running App Server API!');
});

// Start Server
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
  console.log(`📋 API Endpoints:`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/register`);
  console.log(`   GET  /api/auth/users`);
  console.log(`   GET  /api/runs/:userId`);
  console.log(`   GET  /api/runs/:userId/stats`);
  console.log(`   POST /api/runs`);
  console.log(`   GET  /api/courses`);
  console.log(`   GET  /api/courses/:id`);
  console.log(`   POST /api/courses/recommend`);
  console.log(`   GET  /api/battles/:userId`);
  console.log(`   POST /api/battles`);
  console.log(`   PATCH /api/battles/:id/accept`);
});
