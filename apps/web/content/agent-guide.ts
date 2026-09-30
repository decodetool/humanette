import { api, recording, setup } from './documentation';

export const siteUrl = 'https://humanette.dev';
export const releaseNotice =
  'Release status checked September 30, 2026: npm humanette@1.0.0 contains no runtime. The Playwright API documented here is in the repository package, not that npm release. Until a runtime release is published, build and install the local package below. Check the published package contents before relying on a newer release.';

export const setupPrompt = `Read https://humanette.dev/llms.txt and https://humanette.dev/docs.md.
Add Humanette to this project and create a reproducible Playwright walkthrough.
Ask me which app URL and user flow to demonstrate if they are not clear.
Use this project's package manager and script runtime. Check the release status in the guide: if npm still lacks the runtime, build the official repository package and install its local tarball as documented.
Use real Playwright input, stable locators, and assertions that verify the result. Use only a local or test environment and non-sensitive test data.
Record the walkthrough to a local video, finalize it, and inspect it. Report the script, run command, video path, and what actually passed or failed. Do not claim an unrun check passed.`;

export const sourceInstall = `git clone https://github.com/decodetool/humanette.git
cd humanette
bun install
bun run --cwd packages/humanette build
npm pack ./packages/humanette --ignore-scripts`;
export const install =
  'npm install /absolute/path/to/humanette-1.1.0.tgz playwright\nnpx playwright install chromium';
const fence = (language: string, code: string) => ['```' + language, code, '```'].join('\n');

export const llmsIndex =
  [
    '# Humanette',
    '> Humanette is a TypeScript/JavaScript library that adds large cursors, natural mouse movement, and visible click feedback to real Playwright browser input. Use it for product walkthroughs and recordings of coding agents testing features.',
    'Website: https://humanette.dev. Source: https://github.com/decodetool/humanette. Package name: humanette. Public API: import { createHuman } from "humanette", then await createHuman(page, { scale: 4 }) using an existing Playwright Page.',
    releaseNotice,
    'Humanette is not an autonomous agent, video recorder, editor, or replacement for Playwright assertions. Keep browser setup, navigation, readiness checks, assertions, and recording in Playwright. Await human actions sequentially and await human.dispose() in finally. A visual website demo or a video alone is not proof that a feature passed its checks.',
    'Main actions: human.moveTo, human.click, human.drag, human.selectText, human.type, human.press, human.wait, human.configure, and human.dispose. Targets generally accept Playwright locators, CSS selectors, or main-viewport CSS coordinates; selectText requires a locator or selector. Keyboard badges are opt-in and show modifier chords only, not all typed characters. Humanette does not guarantee capture FPS.',
    'For setup, give a coding agent the website link or the prompt in the guide. No dedicated Humanette skill installation is required; a skill is planned, not currently documented as available. Use the public package API, not humanette/internal (the website preview/workbench engine).',
    '## Documentation',
    '- [Complete agent guide](https://humanette.dev/docs.md): Plain Markdown setup prompt, release status, installation, runnable script, API, recording workflow, and limits. Read this before implementing.\n- [Full-text alias](https://humanette.dev/llms-full.txt): The same complete guide in one plain-text response.\n- [Human-readable docs](https://humanette.dev/docs): Copyable setup prompt and manual instructions.\n- [Examples](https://humanette.dev/examples): Visual previews and focused action snippets; these animations do not run real input against a product.',
    '## Optional',
    '- [Source and issues](https://github.com/decodetool/humanette): Repository, package source, and bug reports.\n- [npm package](https://www.npmjs.com/package/humanette): Check the available runtime release before installing.\n- [Pointer Lab](https://humanette.dev/workbench): Tune appearance and export configuration.\n- [Playwright video documentation](https://playwright.dev/docs/videos): Recording and video finalization.\n- [Decode](https://decode.dev): Humanette is made by Decode.',
  ].join('\n\n') + '\n';

export const agentGuide =
  [
    '# Humanette: agent guide',
    '> Humanette adds readable cursor movement and click feedback to real Playwright actions. It helps people follow product walkthroughs, bug reproductions, and coding-agent test recordings.',
    'Canonical website: https://humanette.dev. HTML docs: https://humanette.dev/docs. Discovery index: https://humanette.dev/llms.txt. Source: https://github.com/decodetool/humanette.',
    '## Start with a prompt',
    'Paste this into a coding agent that can read links, edit your project, and run commands. No dedicated Humanette skill is required. A skill is planned; there is no skill installation command to use yet.',
    fence('text', setupPrompt),
    '## Release status and installation',
    releaseNotice,
    'The repository uses Bun 1.3.14. The runtime package declares Node.js >=22 and is ESM, with TypeScript declarations and bundled SVG assets. Use the project’s existing package manager; avoid creating a second lockfile. If a newer npm release contains the runtime and exports createHuman, install that release normally with Playwright. Otherwise build the official repository package:',
    fence('sh', sourceInstall),
    'npm pack prints the generated tarball filename. In the target app, install its absolute path (replace the example path and version below with the file you actually built). Install Chromium through the matching Playwright version:',
    fence('sh', install),
    'If Playwright is already installed, reuse a compatible version rather than adding a conflicting duplicate. The public import is createHuman from humanette. humanette/playwright is a compatibility alias; humanette/internal is for repository previews and is not the automation entry point. Never invent a CLI, skill installer, or API that is absent from the installed package.',
    '## Minimal real-input script',
    'Save as demo.ts and run with bun demo.ts, or use the project’s existing TypeScript runner. Replace the localhost URL and all example locators with your app’s real URL and elements. Use a safe test environment. Humanette accepts your existing Playwright Page; it does not launch a browser for you.',
    fence('ts', setup),
    'Use Playwright assertions or locator waits to verify readiness and results. Keep navigation and assertions in Playwright. Await actions in order, never Promise.all on the same human instance. Await the current action before disposing; dispose removes the overlay, not the page. The overlay is reinstalled after navigation on the next action.',
    '## API reference',
    'Durations and delays are milliseconds. Prefer page.getByRole(), page.getByLabel(), and page.getByTestId(). General targets accept a Locator, a CSS selector string, or { x, y } in main-viewport CSS pixels. selectText accepts only a Locator or selector. Locators scroll into view and resolve to their center before movement.',
    ...api.map(([name, description]) => '### ' + name + '\n\n' + description),
    '## Configuration',
    'createHuman options include scale (default 2.5; examples use 4), seed (42), settle (120 ms), fps (60 input samples/second target, NOT recording FPS), and keyboard (false). Enable keyboard: true only when modifier-chord badges are wanted; ordinary typed text is never shown in badges. All artwork is bundled; no cursor asset server is needed.',
    'Appearance options: scale, color, filled, motionBlur, textSelectionOpacity, pressRadius, pressDuration, pressOpacity, pressScale, holdRadius, holdOpacity, ringWidth, releaseRadius, releaseDuration. Typical defaults: color #397ef3, filled true, motionBlur 0.2, textSelectionOpacity 0.4. Use await human.configure({ scale: 4 }) to change appearance. Configuration availability follows the installed package version.',
    'Action defaults: drag duration 900 ms, selectText drag duration 1400 ms, and type delay 45 ms per character. Pass an AbortSignal to actions that accept signal; held mouse input is released on cancelled drags. Set explicit CSS cursor styles on custom interactive elements (pointer, text, grab/grabbing) so their intent can be detected.',
    '## Recording a walkthrough',
    'Humanette does not record or encode video. Use Playwright recordVideo or a separate recorder. The example below creates out/demo.webm. It records navigation and page loading too; trim that lead-in if needed. Save this as record-demo.ts, adapt the URL and locator, and run bun record-demo.ts.',
    fence('ts', recording),
    'Close the browser context to finalize the video before saveAs. Inspect the output: cursor visibility, actual application behavior, pacing, and repeated or missing frames. deviceScaleFactor: 2 does not make a video Retina when recordVideo.size is 1280x800. Input sampling rate, encoded FPS, and distinct captured frames are different measurements.',
    '## Verification and safety',
    'Use non-sensitive test data and a local or test app. Ask for missing URL, credentials, or flow requirements; do not guess destructive production actions. Keep videos local unless the user requests sharing. Report the exact script/run command and actual assertion results. Do not replace user interactions with DOM mutation, fake events, or an animation and call that a passing E2E test.',
    '## Limitations',
    'Humanette is not a recorder, a video editor, an autonomous coding agent, or an assertion library. It does not guarantee capture frame rate. Website previews use visual timelines; createHuman delivers real Playwright input.',
    'Targets are measured before movement and can move afterward; Humanette does not reproduce all locator.click actionability checks. selectText assumes ordinary left-to-right selectable text, including nested spans and wrapped lines. For inputs, use human.type with selectAll or keyboard shortcuts; specialized editors may need explicit coordinates or keyboard input.',
    'CSS cursor inference has limits for closed shadow roots, cross-origin frames, native controls, and custom cursor images. Busy cursor artwork is static. Browser CSP and permissions still apply. Bundled assets require no remote requests; Humanette itself does not upload recordings or send telemetry. Your app and recorder can have their own network behavior.',
    '## More resources',
    '- [Focused examples](https://humanette.dev/examples)\n- [Pointer Lab](https://humanette.dev/workbench)\n- [Source and issues](https://github.com/decodetool/humanette)\n- [Playwright videos](https://playwright.dev/docs/videos)\n- [Playwright assertions](https://playwright.dev/docs/test-assertions)',
  ].join('\n\n') + '\n';
