/**
 * Catalog Application Services
 * Public API for catalog use cases
 */

export { GetProducts } from './GetProducts';
export type { 
  GetProductsInput, 
  GetProductsOutput, 
  ProductWithOptions,
  IProductRepository as IProductRepositoryForGetProducts
} from './GetProducts';

export { GetProductById } from './GetProductById';
export type { 
  GetProductByIdInput, 
  GetProductByIdOutput, 
  ProductWithFullDetails,
  IProductRepository as IProductRepositoryForGetProductById
} from './GetProductById';

export { CheckProductAvailability } from './CheckProductAvailability';
export type { 
  CheckProductAvailabilityInput, 
  CheckProductAvailabilityOutput,
  IProductRepository as IProductRepositoryForCheckAvailability
} from './CheckProductAvailability';
