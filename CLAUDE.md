# merkle-json CLAUDE.md

## Objective

Make merkle-json compatible with Node 24.x to support OIDC npm publishing in dependent projects.

## Context

- Current: mocha 10.2.0, engines constraint ">=6.11.0"
- Goal: Ensure merkle-json works with Node 24.x (npm 11.6.2+)
- Reason: Dependent projects need Node 24 for OIDC token generation with npmjs.org
- merkle-json is a dependency of scv-bilara and other modules

## Backlog

1. ✓ Test merkle-json against Node 24.x locally (DONE - all 34 tests pass)
2. ✓ Update devDependencies if needed (DONE - found not needed)
3. ✓ Update engines constraint in package.json (DONE - already ">=6.11.0" supports Node 24)
4. ✓ Run full test suite on Node 24.x (DONE)
5. [ ] Publish updated merkle-json to npm
