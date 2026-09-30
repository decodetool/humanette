# Release and deployment

## Local development

Node 22+ and Bun 1.3.14. From the repository root:

```sh
bun install --frozen-lockfile
bun dev
bun check
bun run test:e2e
bun run pack:check
```

The Next.js site runs at http://localhost:3410. Turborepo builds humanette before the site. After changing package source during next dev, rerun bun run --cwd packages/humanette build. SVG assets in docs/*.svg are included in Turbo's cache key.

## Vercel

Import decodetool/humanette. Root Directory: apps/web. Framework: Next.js. Enable source files outside the root directory. Install command: cd ../.. && bun install --frozen-lockfile. Build command: cd ../.. && bunx turbo build --filter=@humanette/web. Keep the default .next output directory. Node version: 22.x. Bun is pinned by packageManager and bun.lock.

No environment secrets are required for the site. No deployment was created by this implementation. Preview deployments can follow PRs once the repository is connected to Vercel.

## npm release

The reserved name is humanette; this implementation prepares 1.1.0 after the reserved 1.0.0. The root and website packages are private. Only packages/humanette is publishable.

1. Confirm asset provenance/redistribution permissions and visually review hotspots. The SVGs pre-exist this PR in docs/; this code does not independently establish their authorship.
2. Run bun check, the browser checks, and bun run pack:check. Inspect the packed file list; it must contain declarations, the classic browser bundle, assets, and license notices, but no website, auth state, or local paths.
3. Confirm npm ownership/authentication and the intended version with npm view humanette version.
4. From packages/humanette run npm publish --access public. The prepack hook rebuilds the package. Use your normal npm 2FA or trusted-publishing process.
5. Tag the exact release commit after publication. Do not publish the private repository root.

This PR does not publish or merge anything. CI checks builds, type safety, pure behavior, browser integration, and the packed consumer installation. CI has no npm publishing token.
