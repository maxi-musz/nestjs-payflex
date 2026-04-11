/**
 * Nest `nest start --watch` emits `require("@prisma/client")` without running `tsc-alias`.
 * Register path mappings so `@prisma/client` resolves to the generated client (same as production build).
 */
import { resolve } from 'path';
import { register } from 'tsconfig-paths';

const projectRoot = resolve(__dirname, '../..');

register({
  baseUrl: projectRoot,
  paths: {
    '@prisma/client': ['dist/src/generated/prisma/client'],
    '@prisma/client/*': ['node_modules/@prisma/client/*'],
  },
});
