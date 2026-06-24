import {
  configureInventoryPolicyPort,
  configureInventorySyncErrorPort,
  configureStockMovementPort,
} from '@pos/application/inventory';
import {
  DrizzleInventoryBalanceRepository,
  DrizzleInventoryMovementWriter,
  DrizzleInventoryPolicyRepository,
  DrizzleInventorySyncErrorRepository,
  DrizzleStockMovementRepository,
  DrizzleInventoryProductStockReader,
  DrizzleOutletContextRepository,
  DrizzleStockOpnameRepository,
  DrizzleStockTransferRepository,
} from '@pos/infrastructure/repositories/inventory';
import { DrizzleUnitOfWork } from '@pos/infrastructure/unit-of-work';
import type { ModuleFactory } from '../types';

export interface InventoryModule {
  inventoryHandlers: {
    listBalances: DrizzleInventoryBalanceRepository['listBalances'];
  };
  inventoryRouteDeps: {
    balanceRepo: DrizzleInventoryBalanceRepository;
    productReader: DrizzleInventoryProductStockReader;
    outletContext: DrizzleOutletContextRepository;
    movementWriter: DrizzleInventoryMovementWriter;
    unitOfWork: DrizzleUnitOfWork;
    opnameRepo: DrizzleStockOpnameRepository;
    transferRepo: DrizzleStockTransferRepository;
  };
}


export const createInventoryModule: ModuleFactory<InventoryModule> = ({ db }) => {
  const inventoryPolicyRepository = new DrizzleInventoryPolicyRepository(db);
  const inventorySyncErrorRepository = new DrizzleInventorySyncErrorRepository(db);
  const stockMovementRepository = new DrizzleStockMovementRepository(db);
  const inventoryBalanceRepository = new DrizzleInventoryBalanceRepository();
  const productReader = new DrizzleInventoryProductStockReader();
  const outletContext = new DrizzleOutletContextRepository();
  const movementWriter = new DrizzleInventoryMovementWriter();
  const unitOfWork = new DrizzleUnitOfWork();
  const opnameRepo = new DrizzleStockOpnameRepository();
  const transferRepo = new DrizzleStockTransferRepository();

  configureInventoryPolicyPort(inventoryPolicyRepository);
  configureInventorySyncErrorPort(inventorySyncErrorRepository);
  configureStockMovementPort(stockMovementRepository);

  return {
    inventoryHandlers: {
      listBalances: inventoryBalanceRepository.listBalances.bind(inventoryBalanceRepository),
    },
    inventoryRouteDeps: {
      balanceRepo: inventoryBalanceRepository,
      productReader,
      outletContext,
      movementWriter,
      unitOfWork,
      opnameRepo,
      transferRepo,
    },
  };
};
