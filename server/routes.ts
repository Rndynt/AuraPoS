import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { tenantMiddleware } from "../apps/api/src/http/middleware/tenant";
import { errorHandler } from "../apps/api/src/http/middleware/errorHandler";
import routes from "../apps/api/src/http/routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply tenant middleware to all /api routes
  app.use('/api', tenantMiddleware);

  // Register all API routes
  app.use('/api', routes);

  // Error handler for API routes (must be after routes)
  app.use('/api', errorHandler);

  const httpServer = createServer(app);

  return httpServer;
}
