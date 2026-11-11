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

Import seflless/humanette. Root Directory: apps/web. Framework: Next.js. Enable source files outside the root directory. Install command: cd ../.. && bun install --frozen-lockfile. Build command: cd ../.. && bunx turbo build --filter=@humanette/web. Keep the default .next output directory. Node version: 22.x. Bun is pinned by packageManager and bun.lock.

No environment secrets are required for the site. No deployment was created by this implementation. Preview deployments can follow PRs once the repository is connected to Vercel.

## npm release

humanette@1.2.0 was published November 10, 2026. Its actual registry tarball was downloaded and integrity-verified: root natural-typing and humanette/recording exports, declarations, browser bundle, 35 cursor SVGs, and upstream notices are present; runtime bundles match the reviewed source build. The skill consumes these package APIs without copying runtime code. The root and website are private; only packages/humanette is publishable.

The repository moved to https://github.com/seflless/humanette on November 11, 2026. Local remotes, skill installation commands, website links, and the prepared package metadata use that owner.

The prepared 1.2.1 patch adds configurable idle/typing cursor dimming (autoHideTimeout: 0, hiddenOpacity: 0, dimmedOpacity: 0.3) and shares procedural sound engines and the typing model with the website’s browser previews. It also migrates the maintained recording example to native audio/video capture. It has not been published; installation guidance continues to reference verified 1.2.0 until the new tarball is checked.

1. Confirm asset provenance/redistribution permissions and visually review hotspots. The SVGs pre-exist this PR in docs/; this code does not independently establish their authorship.
2. Run bun check, bun run test:e2e, bun run test:recording, bun run pack:check, and bun run test:package. Then run bun run test:skill to test the skill in disposable projects through the prepared tarball registry. Inspect the packed file list; it must contain declarations, the classic browser bundle, assets, and license notices, but no website, auth state, or local paths.
3. Confirm npm ownership/authentication and the intended version with npm view humanette version.
4. Commit the release changes so the published package has a reproducible Git revision. From packages/humanette run npm publish --dry-run --access public to exercise the prepack build and inspect the final archive. Authenticate with npm login if npm whoami fails.
5. From packages/humanette run npm publish --access public. The prepack hook rebuilds the package. Use your normal npm 2FA or trusted-publishing process. Do not publish the private repository root.
6. Inspect the actual published tarball and verify its root createHuman/typingSpeeds exports, humanette/recording subpath, bundled browser runtime, assets, declarations, and MIT/Apache notices. Update releaseNotice in apps/web/content/agent-guide.ts with the verified release status, then run bun run test:skill --published (one-off and saved fresh-install cases) plus bun run test:skill --published --case=saved --legacy to exercise the public npm package in Claude. Push the skill to the default branch before advertising its GitHub installation command. Tag the exact release commit after publication.

To test local package changes before publishing, maintainers can run bun run test:skill. The harness builds and packs this checkout itself, then serves that artifact through a disposable npm registry. The consuming agent installs humanette by package name; it receives no Humanette source checkout. This verifies the package installation workflow, but does not prove the public npm release is available. Normal skill use installs the published package and stops if the runtime release is missing.

CI checks builds, type safety, pure behavior, browser integration, and the packed consumer installation. CI has no npm publishing token.

Keep the draft PR open through publication and published-package tests. Publish from its committed release branch; do not merge until that verification is satisfactory. Temporary recordings, browser caches, transcripts, and diagnostic probes stay under ignored test-results or OS temporary directories. Maintained regression and fresh-consumer tests are part of the change.
