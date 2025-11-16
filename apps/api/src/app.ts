/**
 * Main API Application
 * Express app setup with middleware, routes, and error handling
 */

import express, { Express } from 'express';
import { tenantMiddleware } from './http/middleware/tenant';
import { errorHandler } from './http/middleware/errorHandler';
import routes from './http/routes';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // CORS configuration
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    
    next();
  });

  // Body parser middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging in development
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  // Apply tenant middleware to all /api routes
  app.use('/api', tenantMiddleware);

  // Register all API routes
  app.use('/api', routes);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

// Export singleton instance
export const app = createApp();
