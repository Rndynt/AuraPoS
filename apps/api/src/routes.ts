import type { Express } from "express";
import { createServer, type Server } from "http";
import { tenantMiddleware } from "./http/middleware/tenant";
import { errorHandler } from "./http/middleware/errorHandler";
import routes from "./http/routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply tenant middleware to non-auth API routes
  // Exempt /tenants/register because the user has no tenant yet during onboarding
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth/')) return next();
    if (req.path === '/tenants/register') return next();
    return tenantMiddleware(req, res, next);
  });

  // Register all API routes
  app.use('/api', routes);

  // Error handler for API routes (must be after routes)
  app.use('/api', errorHandler);

  const httpServer = createServer(app);

  return httpServer;
}
