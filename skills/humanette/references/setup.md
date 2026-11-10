# Dependency setup

Use the temporary or repository workspace chosen in SKILL.md. Handle missing packages and browser downloads automatically; stop only for a concrete restriction, such as unavailable downloads or required administrative access. Preserve the app's package manager, lockfile, and compatible dependencies.

## Runtime and packages

The optional package recorder needs Node.js **24.11+** (the core Humanette package itself needs 22+). Reuse a suitable runtime. If missing or too old, download an official Node distribution for the detected OS/architecture into the task's tools directory, verify its checksum against the official release, and scope its bin directory to task commands. Do not replace system Node or change shell profiles. Saved demos must disclose Node 24.11+ in their rerun instructions.

Use the published `humanette@^1.2.0` package: the root exports `createHuman` with natural typing, and `humanette/recording` exports the recorder. The actual 1.2.0 npm tarball was verified November 10, 2026: it includes both runtime entry points, browser bundle, declarations, 35 SVGs, and upstream license notices. Use `chrome-capture@0.1.2` for the native recorder. Reuse `playwright`, `@playwright/test`, or `playwright-core` compatible with Humanette; adapt script imports to the directly available package.

Install only missing packages. For a new npm workspace:

```sh
# Saved repo: development dependencies, using its existing package manager.
npm install --save-dev humanette@^1.2.0 playwright chrome-capture@0.1.2
# One-off: ordinary dependencies in a private temporary ESM package instead.
npm install humanette@^1.2.0 playwright chrome-capture@0.1.2
```

Restore declared dependencies before adding duplicates. New setups can use stable Playwright. Preserve a project's existing compatible Playwright even when its browser is too old for recording. Never clone/build Humanette, inspect sibling source checkouts, or substitute a local build. If npm has no usable runtime release, report the publication blocker. A user-supplied development artifact is the sole exception; saved demos must keep it at a durable repo-relative path.

Import runtime APIs from `humanette` and `humanette/recording`. No recorder, sound, or typing helpers are copied from the skill. Only copy `scripts/record-todo.mjs` when using the standalone example. Saved scripts must resolve their declared repository dependencies, with no paths into temporary tools or the installed skill.

## Install a compatible recording browser

Use the installed Playwright CLI, never an unpinned CLI fetched by npx:

```sh
npx --no-install playwright install chromium
```

Use `playwright-core`'s CLI when that is the directly installed package. If `PLAYWRIGHT_BROWSERS_PATH` is set, use that exact directory for every browser install, launch, and media check. Do not replace it with another cache, even one inside the task workspace. If it is unset, use Playwright's normal cache. Do not remove shared browser caches. The native recorder requires **full Chrome/Chromium 153+**, including its new headless mode. Do not install only `--only-shell` or launch `chromium-headless-shell`.

Launch through `launchForPreset(chromium, preset)`. It selects full Chromium, removes Playwright's default `--mute-audio`, enables app autoplay in this demo browser, sets native device scale, and checks Chrome's version. `startRecording` sizes the real window contents for contexts created by this helper using `Browser.setContentsSize`; no platform-specific border offsets are needed.

If an existing Playwright ships Chrome older than 153, install a separate recording browser alias in the chosen execution workspace, without upgrading the app's Playwright:

```sh
npm install --save-dev humanette-browser@npm:playwright-core@1.65.0
node node_modules/humanette-browser/cli.js install chromium
```

Use ordinary dependencies for a temporary workspace. Resolve the alias's CLI via its installed `package.json` if the package manager hoists it. The helper automatically prefers this alias. This dependency and its installation command belong with a saved demo so it remains rerunnable.

An attached user's browser is different: inspect its actual version/connection; do not resize, close, or silently replace it. A browser older than 153 must be relaunched to record natively. An existing session launched muted may not produce audible app audio. Explain these concrete limitations and preserve the requested authenticated starting state.

## Smoke check and recovery

Verify `createHuman` and `typingSpeeds` from `humanette`, plus `launchForPreset` and `startRecording` from `humanette/recording`, then launch a fresh browser, then perform a short native start/stop recording to prove the API works. A download or version string alone is insufficient. Run the real demo afterward, verify actual app state, and inspect the finalized media. `stats.audio` confirms a track exists, not that sound is audible.

No FFmpeg, extension, virtual audio device, or recording permission picker is required for native capture. On Linux, missing native browser libraries may still prevent launch. Use the matching Playwright `install-deps` only in an environment already authorized for OS-package installation; do not silently sudo or modify the user's host. Report concrete missing libraries if blocked.

The output is AV1 video and Opus audio in MP4. If the user specifically needs H.264/AAC, padding, voiceover, or editing, perform that as a separate export step; install any missing converter in the task workspace rather than the host. Do not silently deliver a muted or low-FPS fallback as equivalent.

Finally, check the saved command after removing temporary tools and restoring declared dependencies. For a one-off, retain final media and failed-check artifacts outside scratch, and verify the app's manifest, lockfile, and source were not changed.
