# Dependency setup

Use the temporary or repository workspace chosen in SKILL.md. Install what is missing and retry the failed setup step after fixing its cause. Stop only for an actual restriction such as unavailable downloads, unsupported OS, or required administrative access; report the exact blocker and the work already completed.

## Inspect and reuse

Check package.json, packageManager, the active workspace's lockfile, installed package versions, and available runtimes. In a monorepo, use the workspace that owns the demo and its existing lockfile. Don't create another package manager's lockfile or upgrade unrelated dependencies.

- Reuse a working Humanette root import exporting `createHuman`.
- Reuse `playwright`, `@playwright/test`, or `playwright-core` when compatible with Humanette's actual peer dependency range. Adapt the generated script's import to the package that is directly available; an installed test runner does not mean a transitive `playwright` import resolves from every directory.
- If the declared dependencies are missing from node_modules, restore them with the existing package manager first. If no compatible Playwright is present, install `playwright` in the chosen workspace. Use a stable compatible version for a new setup; no prerelease is required to make a demo.
- Repository mode: add only missing packages as development dependencies, preserve the existing compatible versions, and add a descriptive rerun command. Temporary mode: make a private ESM package in a unique scratch directory and install packages there. An external app server may continue running from the original repo.
- Prefer a JavaScript `.mjs` demo with Node.js 22+ to adding a TypeScript runner solely for the recording. Reuse an existing TS runner when it is already part of the project.

## Install the published package

Use the published `humanette` npm package, with a runtime release of 1.1.0 or newer. Reuse an already installed compatible runtime. With npm, install only missing packages in the chosen workspace:

```sh
# Saved repository demo:
npm install --save-dev humanette@^1.1.0 playwright
# One-off: run in the private temporary execution package instead:
npm install humanette@^1.1.0 playwright
```

For other package managers, use their equivalent local installation command. Preserve compatible versions already in the project. Verify `import { createHuman } from 'humanette'` succeeds before recording.

If no runtime release is available, report that the package must be published and stop setup. Do not clone/build Humanette, search sibling repositories or the user's home directory for a checkout, or install a local build as a substitute. A package artifact explicitly supplied by the user for development/testing is the only exception; for saved demos, copy that artifact to a durable repository-relative location first. A missing release does not require asking the user to choose between source builds.

## Missing runtime

Humanette needs Node.js 22+. Reuse a suitable installed runtime. If Node/npm is missing, download an official Node distribution for the detected OS/architecture into the task's tools directory; verify its checksum against the official release and scope its bin directory to task commands. Do not replace system Node or change shell startup files. Disclose the Node requirement with a saved rerun command. Bun is not needed to consume Humanette; use it only if it is the app's existing package manager.

## Install and verify the matching browser

Use the CLI belonging to the actual installed Playwright version, from the execution workspace. With npm and an installed `playwright` or `@playwright/test`:

```sh
npx --no-install playwright install chromium
```

For a `playwright-core` installation, use its `playwright-core` CLI instead. For Bun/pnpm/yarn projects, use their local CLI execution convention; do not let an unpinned npx invocation silently install a newer Playwright. Install Chromium automatically if its matching binary is absent, then launch and close a fresh headless browser to verify the native libraries and executable work. Do not close the user's attached browser during this smoke check.

Use the normal Playwright browser cache unless the task environment sets PLAYWRIGHT_BROWSERS_PATH. Honor that variable for both installation and running, and never remove an existing shared browser cache during cleanup. A download alone is not proof of a usable browser.

On Linux, a browser launch may require native libraries. If the environment already permits OS-package installation without additional privileges (for example, an authorized disposable root container), use the matching CLI's `install-deps chromium` or `install --with-deps chromium` and retry. Do not silently sudo or change the user's host OS when admin access has not been authorized. State the concrete missing dependency if host permissions prevent setup.

FFmpeg is not required for Playwright's WebM recordings. Install an encoder only when the requested output format or available inspection workflow needs one; do not add unrelated tooling just in case.

Finally, run the real demo. In repository mode, verify the saved command works from the repository with its declared dependencies, independently of the temporary execution workspace. In temporary mode, retain final videos/screenshots outside scratch and ensure the original repo's manifest, lockfile, and sources were not changed.
