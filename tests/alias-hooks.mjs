/**
 * Resolves the `@/` path alias for `node --test`.
 *
 * tsconfig `paths` is a compile-time concept that Node's runtime type stripper
 * does not read. Rather than degrade every source file to relative imports so
 * the tests can run, the tests teach Node the same mapping the bundler uses.
 */
import { pathToFileURL } from 'node:url';
import { resolve as resolvePath } from 'node:path';

const ROOT = pathToFileURL(resolvePath(process.cwd()) + '/').href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    let target = new URL(specifier.slice(2), ROOT).href;
    // Source files import extensionless. Node needs the real path.
    if (!/\.(ts|tsx|js|mjs|json)$/.test(target)) target += '.ts';
    return nextResolve(target, context);
  }
  return nextResolve(specifier, context);
}
