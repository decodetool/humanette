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

The Next.js site runs at http://localhost:3410. Turborepo builds bigcursor before the site. After changing package source during next dev, rerun bun run --cwd packages/bigcursor build. SVG assets in docs/*.svg are included in Turbo's cache key.

## Vercel

Import seflless/bigcursor. Root Directory: apps/web. Framework: Next.js. Enable source files outside the root directory. Install command: cd ../.. && bun install --frozen-lockfile. Build command: cd ../.. && bunx turbo build --filter=@bigcursor/web. Keep the default .next output directory. Node version: 22.x. Bun is pinned by packageManager and bun.lock.

No environment secrets are required for the site. Set `NEXT_PUBLIC_SITE_URL` to the connected website domain before building; `.env.example` uses `https://bigcursor.dev` as the canonical URL. Metadata, sitemap, robots, Markdown headers, and agent-guide links share this setting. A branding change does not register a domain or change hosting/DNS. No deployment was created by this implementation. Preview deployments can follow PRs once the repository is connected to Vercel.

## npm release

`bigcursor@1.1.1` is prepared but not published. Registry tarballs inspected November 11, 2026 show a name reservation at `0.0.0-stage` and an older runtime at `1.1.0`. The latter exports the former factory, lacks `bigcursor/recording`, and retains old metadata/browser filenames; it does not match this guide or the tested revision. The root and website are private; only packages/bigcursor is publishable.

The project now uses https://github.com/seflless/bigcursor, the `bigcursor` npm name, `createCursor` at the package root, and the `/bigcursor` skill. The internal preview factory is `createCursorRenderer`; action methods and recording exports retain their names. Existing consumers migrate their dependency/import, factory call, and local variable together. No compatibility exports for the former brand are included in the new package.

The prepared 1.1.1 release includes natural typing, procedural interaction sounds, native recording/capture stabilization, and configurable cursor dimming (autoHideTimeout: 0, hiddenOpacity: 0, dimmedOpacity: 0.3). The actual renamed tarball must be checked locally, then independently fetched and checked again after publication. Public install commands require that publication and the renamed skill on the default branch.

1. Confirm asset provenance/redistribution permissions and visually review hotspots. The SVGs pre-exist this PR in docs/; this code does not independently establish their authorship.
2. Run bun check, bun run test:e2e, bun run test:recording, bun run pack:check, and bun run test:package. Then run bun run test:skill to test the skill in disposable projects through the prepared tarball registry. Inspect the packed file list; it must contain declarations, the classic browser bundle, assets, and license notices, but no website, auth state, or local paths.
3. Confirm npm ownership/authentication and the intended package name/version with npm view bigcursor versions dist-tags --json. Check the exact intended version and tarball; a registered name or latest tag alone does not prove that the runtime is available. Use 1.1.1 for the next release so it follows the already-published 1.1.0.
4. Commit the release changes so the published package has a reproducible Git revision. From packages/bigcursor run npm publish --dry-run --access public to exercise the prepack build and inspect the final archive. Authenticate with npm login if npm whoami fails.
5. From packages/bigcursor run npm publish --access public. The prepack hook rebuilds the package. Use your normal npm 2FA or trusted-publishing process. Do not publish the private repository root.
6. Inspect the actual published tarball and verify its root createCursor/typingSpeeds exports, bigcursor/recording subpath, bundled browser runtime, assets, declarations, and MIT/Apache notices. Update releaseNotice in apps/web/content/agent-guide.ts with the verified release status, then run bun run test:skill --published (one-off and saved fresh-install cases) plus bun run test:skill --published --case=saved --legacy to exercise the public npm package in Claude. Push the skill to the default branch before advertising its GitHub installation command. Tag the exact release commit after publication.

For [npm staged publishing](https://docs.npmjs.com/staged-publishing/), `npm stage publish` submits an archive for approval; a new name can expose only a `0.0.0-stage` placeholder. Review it with `npm stage list bigcursor` and `npm stage view <stage-id>`, then approve the intended archive through npm's Staged Packages tab or `npm stage approve <stage-id>` with 2FA. Do not mark the runtime release verified until its actual archive is publicly available.

To test local package changes before publishing, maintainers can run bun run test:skill. The harness builds and packs this checkout itself, then serves that artifact through a disposable npm registry. The consuming agent installs bigcursor by package name; it receives no Bigcursor source checkout. This verifies the package installation workflow, but does not prove the public npm release is available. Normal skill use installs the published package and stops if the runtime release is missing.

CI checks builds, type safety, pure behavior, browser integration, and the packed consumer installation. CI has no npm publishing token.

Keep the draft PR open through publication and published-package tests. Publish from its committed release branch; do not merge until that verification is satisfactory. Temporary recordings, browser caches, transcripts, and diagnostic probes stay under ignored test-results or OS temporary directories. Maintained regression and fresh-consumer tests are part of the change.
