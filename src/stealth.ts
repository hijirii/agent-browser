/**
 * Stealth Script Generator
 * Generates JavaScript code to inject into pages to avoid bot detection
 * Based on principles from undetected-chromedriver and puppeteer-extra-plugin-stealth
 */

export interface StealthConfig {
  webdriver?: boolean;
  navigator?: boolean;
  navigatorLanguages?: boolean;
  navigatorPlatform?: boolean;
  navigatorHardwareConcurrency?: boolean;
  navigatorDeviceMemory?: boolean;
  screenWidth?: boolean;
  screenHeight?: boolean;
  pixelRatio?: boolean;
  colorDepth?: boolean;
  touchSupport?: boolean;
  chromeRuntime?: boolean;
  permissions?: boolean;
  windowFrame?: boolean;
  doNotTrack?: boolean;
  plugins?: boolean;
  mediaDevices?: boolean;
  customUserAgent?: string;
}

// Default stealth configuration
export const defaultStealthConfig: StealthConfig = {
  webdriver: true,
  navigator: true,
  navigatorLanguages: true,
  navigatorPlatform: true,
  navigatorHardwareConcurrency: true,
  navigatorDeviceMemory: true,
  screenWidth: true,
  screenHeight: true,
  pixelRatio: true,
  colorDepth: true,
  touchSupport: true,
  chromeRuntime: true,
  permissions: true,
  windowFrame: true,
  doNotTrack: false,
  plugins: true,
  mediaDevices: true,
};

/**
 * Generate stealth JavaScript code for injection
 */
export function generateStealthScript(config: StealthConfig = defaultStealthConfig): string {
  const scripts: string[] = [];

  // Remove webdriver property
  if (config.webdriver !== false) {
    scripts.push(`
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
        enumerable: true,
      });
    `);
  }

  // Fake navigator properties
  if (config.navigator !== false) {
    scripts.push(`
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en', 'ja', 'zh-CN'],
        configurable: true,
        enumerable: true,
      });
    `);

    scripts.push(`
      Object.defineProperty(navigator, 'language', {
        get: () => 'en-US',
        configurable: true,
        enumerable: true,
      });
    `);

    scripts.push(`
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true,
        enumerable: true,
      });
    `);
  }

  // Platform
  if (config.navigatorPlatform !== false) {
    scripts.push(`
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true,
        enumerable: true,
      });
    `);
  }

  // Hardware Concurrency
  if (config.navigatorHardwareConcurrency !== false) {
    scripts.push(`
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 4,
        configurable: true,
        enumerable: true,
      });
    `);
  }

  // Device Memory
  if (config.navigatorDeviceMemory !== false) {
    scripts.push(`
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        configurable: true,
        enumerable: true,
      });
    `);
  }

  // Screen properties
  if (config.screenWidth !== false || config.screenHeight !== false || config.pixelRatio !== false || config.colorDepth !== false) {
    scripts.push(`
      Object.defineProperty(screen, 'width', {
        get: () => 1920,
        configurable: true,
        enumerable: true,
      });
    `);

    scripts.push(`
      Object.defineProperty(screen, 'height', {
        get: () => 1080,
        configurable: true,
        enumerable: true,
      });
    `);

    scripts.push(`
      Object.defineProperty(screen, 'availWidth', {
        get: () => 1920,
        configurable: true,
        enumerable: true,
      });
    `);

    scripts.push(`
      Object.defineProperty(screen, 'availHeight', {
        get: () => 1040,
        configurable: true,
        enumerable: true,
      });
    `);

    scripts.push(`
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => 1,
        configurable: true,
        enumerable: true,
      });
    `);

    scripts.push(`
      Object.defineProperty(screen, 'colorDepth', {
        get: () => 24,
        configurable: true,
        enumerable: true,
      });
    `);
  }

  // Touch support
  if (config.touchSupport !== false) {
    scripts.push(`
      Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => 0,
        configurable: true,
        enumerable: true,
      });
    `);

    scripts.push(`
      Object.defineProperty(navigator, 'touchSupport', {
        get: () => true,
        configurable: true,
        enumerable: true,
      });
    `);
  }

  // Chrome runtime
  if (config.chromeRuntime !== false) {
    scripts.push(`
      Object.defineProperty(window, 'chrome', {
        get: () => ({
          runtime: {
            onInstalled: { addListener: () => {} },
            onStartup: { addListener: () => {} },
            onSuspend: { addListener: () => {} },
            onUpdateAvailable: { addListener: () => {} },
            requestUpdateCheck: () => ({ status: 'no_update' }),
            restart: () => {},
            connect: () => ({ onMessage: { addListener: () => {} }, onDisconnect: { addListener: () => {} }, postMessage: () => {}, disconnect: () => {} }),
            sendMessage: () => Promise.resolve({}),
          },
          loadTimes: () => ({
            requestTime: Date.now() / 1000,
            startLoadTime: Date.now() / 1000,
            commitLoadTime: Date.now() / 1000,
            finishLoadTime: Date.now() / 1000,
            firstPaintTime: Date.now() / 1000,
            firstContentfulPaintTime: Date.now() / 1000,
            largestContentfulPaintTime: Date.now() / 1000,
          }),
          csi: () => ({
            startE: Date.now(),
            startS: Date.now(),
            startC: Date.now(),
            startEcs: Date.now(),
            endEcs: Date.now(),
          }),
          app: {
            GET_IS_INSTALLED: () => false,
            INSTALL_TYPE: () => 'none',
            getDetails: () => ({ id: '', isExternal: false, launchURL: '', installedTime: 0, lastUpdateTime: 0 }),
          },
          webstore: {
            onInstallStageChanged: { addListener: () => {} },
            onDownloadProgress: { addListener: () => {} },
            install: () => Promise.resolve(),
          },
          runtime: {
            id: '',
            sendMessage: () => Promise.resolve(),
            onMessageExternal: { addListener: () => {} },
            onConnectExternal: { addListener: () => {} },
          },
        }),
        configurable: true,
        enumerable: true,
      });
    `);
  }

  // Permissions API mocking
  if (config.permissions !== false) {
    scripts.push(`
      const originalQuery = navigator.permissions.query;
      navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: 'denied', onchange: null });
        }
        return originalQuery(parameters);
      };
    `);
  }

  // Window frame
  if (config.windowFrame !== false) {
    scripts.push(`
      Object.defineProperty(window, 'frameElement', {
        get: () => null,
        configurable: true,
        enumerable: true,
      });
    `);

    scripts.push(`
      Object.defineProperty(window, 'frames', {
        get: () => window,
        configurable: true,
        enumerable: true,
      });
    `);
  }

  // doNotTrack
  if (config.doNotTrack !== false) {
    scripts.push(`
      Object.defineProperty(navigator, 'doNotTrack', {
        get: () => 'unspecified',
        configurable: true,
        enumerable: true,
      });
    `);
  }

  // Plugins (for Chrome)
  if (config.plugins !== false) {
    scripts.push(`
      const pluginData = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format', mimeTypes: [{ type: 'application/pdf', suffixes: 'pdf' }] },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format', mimeTypes: [{ type: 'application/pdf', suffixes: 'pdf' }] },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: 'Native Client executable', mimeTypes: [{ type: 'application/x-nacl', suffixes: '' }, { type: 'application/x-pnacl', suffixes: '' }] },
      ];
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => pluginData,
        configurable: true,
        enumerable: true,
      });
    `);

    scripts.push(`
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => {
          const mimeTypes = [];
          navigator.plugins.forEach((plugin) => {
            plugin.forEach((mimeType) => {
              mimeTypes.push(mimeType);
            });
          });
          return mimeTypes;
        },
        configurable: true,
        enumerable: true,
      });
    `);
  }

  // Media devices
  if (config.mediaDevices !== false) {
    scripts.push(`
      Object.defineProperty(navigator, 'mediaDevices', {
        get: () => ({
          enumerateDevices: () => Promise.resolve([
            { deviceId: 'default', kind: 'audioinput', label: 'Default - Microphone', groupId: 'default' },
            { deviceId: 'default', kind: 'videoinput', label: 'Default - Camera', groupId: 'default' },
          ]),
          getUserMedia: () => Promise.reject(new Error('Not allowed')),
          getDisplayMedia: () => Promise.reject(new Error('Not allowed')),
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        }),
        configurable: true,
        enumerable: true,
      });
    `);
  }

  // WebGL vendor
  scripts.push(`
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) {
        return 'Intel Open Source Technology Center';
      }
      if (parameter === 37446) {
        return 'Mesa DRI Intel(R) UHD Graphics 630 (CFL GT2)';
      }
      return getParameter.call(this, parameter);
    };
  `);

  // Remove automation indicators
  scripts.push(`
    // Remove CDP automation flags
    Object.defineProperty(navigator, 'userActivation', {
      get: () => ({ isActive: true, hasBeenActive: true }),
      configurable: true,
    });
  `);

  // Connection information
  scripts.push(`
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        downlink: 10,
        effectiveType: '4g',
        rtt: 50,
        saveData: false,
        type: 'wifi',
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }),
      configurable: true,
      enumerable: true,
    });
  `);

  // Combine all scripts
  return scripts.join('\n');
}

/**
 * Generate stealth launch arguments for Chromium
 */
export function generateStealthArgs(): string[] {
  return [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--window-size=1920,1080',
    '--start-maximized',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-benchmarking',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--mute-audio',
    '--safebrowsing-disable-auto-update',
    '--enable-automation',
    '--disable-automation',
    '--password-store=basic',
    '--use-mock-keychain',
  ];
}
