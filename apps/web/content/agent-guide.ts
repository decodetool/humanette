import { api, recording, setup } from './documentation';
import {
  skillInstall,
  agentDemoPrompt,
  productDemoPrompt,
  skillInvocationNote,
} from './onboarding';

export const siteUrl = 'https://humanette.dev';
export const releaseNotice =
  'Tarball checked October 5, 2026: npm humanette@1.0.0 contains no runtime—only package.json and README.md, with no exports map. The prepared 1.1.0 runtime must be published before npm setup works. The skill installs the published package and reports a missing release instead of building source.';

export const install =
  'npm install --save-dev humanette@^1.1.0 playwright\nnpx --no-install playwright install chromium';
const fence = (language: string, code: string) => ['```' + language, code, '```'].join('\n');

export const llmsIndex =
  [
    '# Humanette',
    '> Humanette is a TypeScript/JavaScript library that adds large cursors, natural mouse movement, and visible click feedback to real Playwright browser input. Use it for product walkthroughs and recordings of coding agents testing features.',
    'Website: https://humanette.dev. Source: https://github.com/decodetool/humanette. Package name: humanette. Public API: import { createHuman } from "humanette", then await createHuman(page, { scale: 4 }) using an existing Playwright Page.',
    releaseNotice,
    'Humanette is not an autonomous agent, video recorder, editor, or replacement for Playwright assertions. Keep browser setup, navigation, readiness checks, assertions, and recording in Playwright. Await human actions sequentially and await human.dispose() in finally. A visual website demo or a video alone is not proof that a feature passed its checks.',
    'Main actions: human.moveTo, human.click, human.drag, human.selectText, human.type, human.press, human.wait, human.configure, and human.dispose. Targets generally accept Playwright locators, CSS selectors, or main-viewport CSS coordinates; selectText requires a locator or selector. Keyboard badges are opt-in and show modifier chords only, not all typed characters. Humanette does not guarantee capture FPS.',
    'Install the Humanette skill: ' +
      skillInstall +
      '. Run in your project and choose your coding agent. ' +
      skillInvocationNote +
      ' The skill lives in skills/humanette in the source repository. Use the public package API, not humanette/internal (the website preview/workbench engine).',
    '## Documentation',
    '- [Complete agent guide](https://humanette.dev/docs.md): Skill installation, demo prompts, release status, manual setup, API, recording workflow, and limits. Read this before implementing.\n- [Full-text alias](https://humanette.dev/llms-full.txt): The same complete guide in one plain-text response.\n- [Human-readable docs](https://humanette.dev/docs): Skill installation, short demo prompts, and the Playwright reference.\n- [Examples](https://humanette.dev/#examples): Visual previews and focused action snippets; these animations do not run real input against a product.',
    '## Optional',
    '- [Source and issues](https://github.com/decodetool/humanette): Repository, package source, and bug reports.\n- [npm package](https://www.npmjs.com/package/humanette): Check the available runtime release before installing.\n- [Pointer Lab](https://humanette.dev/workbench): Tune appearance and export configuration.\n- [Playwright video documentation](https://playwright.dev/docs/videos): Recording and video finalization.\n- [Decode](https://decode.dev): Humanette is made by Decode.',
  ].join('\n\n') + '\n';

export const agentGuide =
  [
    '# Humanette: agent guide',
    '> Humanette adds readable cursor movement and click feedback to real Playwright actions. It helps people follow product walkthroughs, bug reproductions, and coding-agent test recordings.',
    'Canonical website: https://humanette.dev. HTML docs: https://humanette.dev/docs. Discovery index: https://humanette.dev/llms.txt. Source: https://github.com/decodetool/humanette.',
    '## Install humanette skill',
    'Run this in your project and choose your coding agent when prompted. The installer reads skills/humanette from the official repository. The agent handles runtime and browser setup when you request a demo.',
    fence('sh', skillInstall),
    skillInvocationNote,
    '## Usage',
    '### Ask an agent to demo a feature',
    fence('text', agentDemoPrompt),
    'Use the requested app and starting state. Humanette needs an actual Playwright Page in the same process as its actions. Reuse a supported browser connection; do not invent a CDP endpoint. Playwright cannot enable recordVideo on an existing context, so use an available screen recorder for an open page, or reproduce the starting state in a fresh recording context with the user’s agreement when session access is needed.',
    '### Create a product demo',
    fence('text', productDemoPrompt),
    'For a standalone example without an existing app, the skill also includes scripts/record-todo.mjs, a self-contained local to-do app and real-input recording script. No account or production app is needed. Copy it into the chosen execution workspace after dependency setup, then run node record-todo.mjs with a durable output directory. It verifies the task was added and completed.',
    '## Choose temporary or repository setup',
    'One-off PR/bug recordings and video-only requests use a unique OS temporary workspace for scripts and missing dependencies; the app’s manifest, lockfile, and source stay unchanged. Product walkthroughs for a current app repository and requests to save/rerun a script use repository scripts and development dependencies, with the existing package manager and lockfile. Explicit output/script paths and instructions to leave the repo unchanged take precedence; ambiguous requests start temporary. Install missing Humanette, compatible Playwright, matching Chromium, and a required task-local Node runtime automatically. Reuse compatible installations instead of upgrading them. Save final videos outside disposable tools. Use the published humanette package. Do not search for source checkouts or build Humanette as a fallback; if no runtime release is available, report the missing publication. Saved scripts and lockfiles must not depend on temporary or personal paths.',
    '## Release status and installation',
    releaseNotice,
    'The runtime package declares Node.js >=22 and is ESM, with TypeScript declarations and bundled SVG assets. Install the published humanette package in the chosen workspace with its package manager; avoid adding another lockfile. Reuse installed compatible dependencies. A one-off recording installs in its private temporary package; a saved demo adds development dependencies in the app repository. Bun is not required to consume Humanette. Install Chromium through the matching installed Playwright version:',
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
    '- [Focused examples](https://humanette.dev/#examples)\n- [Pointer Lab](https://humanette.dev/workbench)\n- [Source and issues](https://github.com/decodetool/humanette)\n- [Playwright videos](https://playwright.dev/docs/videos)\n- [Playwright assertions](https://playwright.dev/docs/test-assertions)',
  ].join('\n\n') + '\n';
