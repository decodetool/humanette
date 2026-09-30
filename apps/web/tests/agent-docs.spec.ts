import { expect, test } from '@playwright/test';
import { api, setup, recording } from '../content/documentation';
import { setupPrompt } from '../content/agent-guide';

test('agent entry point and full guide are plain, complete, and linked without JavaScript', async ({
  request,
}) => {
  const index = await request.get('/llms.txt');
  expect(index.status()).toBe(200);
  expect(index.headers()['content-type']).toContain('text/plain');
  const summary = await index.text();
  expect(summary).toMatch(/^# Humanette\n\n> /);
  expect(summary).toContain('createHuman');
  expect(summary).toContain('npm humanette@1.0.0 contains no runtime');
  expect(summary).toContain('https://humanette.dev/docs.md');
  expect(summary).not.toContain('<html');
  expect(summary.length).toBeLessThan(5000);

  const markdown = await request.get('/docs.md');
  const full = await request.get('/llms-full.txt');
  expect(markdown.status()).toBe(200);
  expect(full.status()).toBe(200);
  expect(markdown.headers()['content-type']).toContain('text/markdown');
  expect(markdown.headers().link).toContain('rel="describedby"');
  const guide = await markdown.text();
  expect(await full.text()).toBe(guide);
  for (const content of [setupPrompt, setup, recording, ...api.flat()])
    expect(guide).toContain(content);
  for (const detail of [
    'Node.js >=22',
    'modifier chords',
    'not currently',
    'npm pack',
    'not a recorder',
  ]) {
    expect(summary + guide).toContain(detail);
  }
  expect(guide).not.toContain('npx skills add');
  const links = new Set(
    [...(summary + guide).matchAll(/\]\((https:\/\/humanette\.dev[^)]+)\)/g)].map(
      (match) => new URL(match[1]).pathname,
    ),
  );
  for (const path of links) expect((await request.get(path)).status(), path).toBe(200);

  const home = await request.get('/');
  const html = await home.text();
  expect(html).toContain('rel="describedby"');
  expect(html).toContain('href="/llms.txt"');
  expect(html).not.toContain('For coding agents:');
  const docsHtml = await (await request.get('/docs')).text();
  expect(docsHtml).toContain('type="text/markdown"');
  expect(docsHtml).toContain('https://humanette.dev/docs.md');
});

test('setup prompt is first, readable on mobile, and copies exactly', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/docs');
  const prompt = page.locator('#agent-setup');
  await expect(prompt.getByRole('heading')).toHaveText('Set up with your coding agent');
  await expect(prompt.locator('pre')).toHaveText(setupPrompt, { useInnerText: true });
  expect(await prompt.locator('pre').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const promptBox = (await prompt.boundingBox())!;
  const manualBox = (await page.locator('#manual-install').boundingBox())!;
  expect(promptBox.y + promptBox.height).toBeLessThan(manualBox.y);
  await prompt.getByRole('button', { name: 'Copy Setup prompt' }).click();
  await expect(prompt.getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(setupPrompt);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await prompt.screenshot({ path: 'test-results/agent-setup-mobile.png' });
});

test('crawl metadata uses canonical public URLs and includes the docs', async ({
  request,
  page,
}) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Allow: /');
  expect(await robots.text()).toContain('Sitemap: https://humanette.dev/sitemap.xml');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()['content-type']).toContain('xml');
  const xml = await sitemap.text();
  expect(xml).not.toContain('localhost');
  expect(xml).not.toContain('/demos');
  for (const path of ['', '/docs', '/examples', '/workbench']) {
    expect(xml).toContain(`<loc>https://humanette.dev${path}</loc>`);
    await page.goto(path || '/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://humanette.dev${path}`,
    );
  }
});
