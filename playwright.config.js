// Minimal Playwright config: chromium only, using the browser preinstalled in this
// environment (PLAYWRIGHT_BROWSERS_PATH is already set). No web server auto-start:
// the smoke test opens the HTML files directly via file:// URLs.
export default {
  testDir: 'test',
  use: {
    // executablePath left unset here; the spec sets it directly so it works even if
    // this config's browsers path differs from the project pinned in package.json.
  },
  reporter: 'list',
};
