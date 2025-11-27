import { register } from 'tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = path.resolve(__dirname, '../..');

register({
  baseUrl,
  paths: {
    '@shared': ['./shared'],
    '@shared/*': ['./shared/*'],
    '@pos/core': ['./packages/core'],
    '@pos/core/*': ['./packages/core/*'],
    '@pos/domain': ['./packages/domain'],
    '@pos/domain/*': ['./packages/domain/*'],
    '@pos/application': ['./packages/application'],
    '@pos/application/*': ['./packages/application/*'],
    '@pos/infrastructure': ['./packages/infrastructure'],
    '@pos/infrastructure/*': ['./packages/infrastructure/*'],
    '@pos/features': ['./packages/features'],
    '@pos/features/*': ['./packages/features/*']
  }
});
