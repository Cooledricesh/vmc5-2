import { handle } from 'hono/vercel';
import { Hono } from 'hono';
import { createHonoApp } from '@/backend/hono/app';

// Wrap the core app with /api basePath for Next.js API routes
const coreApp = createHonoApp();
const app = new Hono().basePath('/api').route('/', coreApp);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

export const runtime = 'nodejs';
