import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, fullyParallel: false,
  // This machine has 12 CPUs; Playwright's default is 6 workers. CI passes --workers=2.
  workers: 1,
  use: { baseURL:'http://127.0.0.1:4173/media/', headless:true, trace:'retain-on-failure', serviceWorkers:'block' },
  projects: [
    { name:'chromium', use:{ browserName:'chromium' } },
    { name:'firefox', use:{ browserName:'firefox' } },
    { name:'webkit-mobile', use:{ browserName:'webkit', viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true, deviceScaleFactor:3,
      launchOptions: process.env.MEDIA_WEBKIT_EXECUTABLE ? { executablePath:process.env.MEDIA_WEBKIT_EXECUTABLE } : {} } },
  ],
  webServer: { command:'npm run preview', url:'http://127.0.0.1:4173/media/', reuseExistingServer:!process.env.CI },
});
