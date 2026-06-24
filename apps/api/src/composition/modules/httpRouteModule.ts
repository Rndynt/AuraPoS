import { HttpRouteQueries } from '@pos/application/http';
import { DrizzleHttpRouteRepository } from '@pos/infrastructure/repositories/http';
import type { ModuleFactory } from '../types';

export interface HttpRouteModule {
  httpRouteQueries: HttpRouteQueries;
}

export const createHttpRouteModule: ModuleFactory<HttpRouteModule> = ({ db }) => {
  const repository = new DrizzleHttpRouteRepository(db);
  return { httpRouteQueries: new HttpRouteQueries(repository) };
};
