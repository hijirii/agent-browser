/**
 * Stealth Script Generator - Enhanced Version
 * Generates JavaScript code to inject into pages to avoid bot detection
 * Based on principles from undetected-chromedriver and puppeteer-extra-plugin-stealth
 * Enhanced with Canvas fingerprint spoofing, WebGL noise, and human behavior simulation
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
  canvasNoise?: boolean;
  webglNoise?: boolean;
  audioContextNoise?: boolean;
  behaviorRandomization?: boolean;
}

// Default stealth configuration - Enhanced
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
  canvasNoise: true,
  webglNoise: true,
  audioContextNoise: true,
  behaviorRandomization: true,
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

  // ==================== ENHANCED STEALTH FEATURES ====================
  
  // Canvas Fingerprint Spoofing with Noise
  if (config.canvasNoise !== false) {
    scripts.push(`
      // Canvas fingerprint spoofing with random noise
      const canvasNoise = () => {
        const noise = Math.random() * 0.000001;
        return noise;
      };
      
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type, encoderOptions) {
        if (this.width === 0 || this.height === 0) {
          return originalToDataURL.call(this, type, encoderOptions);
        }
        const ctx = this.getContext('2d');
        if (ctx) {
          // Add subtle noise to pixel data
          const imageData = ctx.getImageData(0, 0, this.width, this.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 2;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
          }
          ctx.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.call(this, type, encoderOptions);
      };
      
      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
        const data = originalGetImageData.call(this, sx, sy, sw, sh);
        // Add slight noise to prevent exact fingerprinting
        for (let i = 0; i < data.data.length; i++) {
          if (Math.random() > 0.99) {
            data.data[i] = (data.data[i] + Math.random() * 0.5) % 256;
          }
        }
        return data;
      };
    `);
  }

  // WebGL Fingerprint Spoofing with Noise
  if (config.webglNoise !== false) {
    scripts.push(`
      // WebGL fingerprint spoofing
      const webglNoise = () => {
        return Math.random() * 0.0001;
      };
      
      // Spoof WebGL vendor and renderer
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // Add noise to numeric parameters
        if (typeof parameter === 'number') {
          const noise = webglNoise();
          const original = getParameter.call(this, parameter);
          if (typeof original === 'number') {
            return original + noise;
          }
        }
        
        // Spoof vendor strings
        if (parameter === 37445) {
          return 'NVIDIA Corporation';
        }
        if (parameter === 37446) {
          return 'GeForce RTX 3080/PCIe/SSE2';
        }
        if (parameter === 7937) {
          return 'WebKit';
        }
        if (parameter === 7938) {
          return 'WebGL 2.0';
        }
        return getParameter.call(this, parameter);
      };
      
      // Add noise to WebGL rendering
      const originalClear = WebGLRenderingContext.prototype.clear;
      WebGLRenderingContext.prototype.clear = function(mask) {
        // Randomize clear color slightly
        if (Math.random() > 0.95) {
          this.clearColor(
            Math.random() * 0.1,
            Math.random() * 0.1,
            Math.random() * 0.1,
            1.0
          );
        }
        return originalClear.call(this, mask);
      };
      
      // Spoof WebGL2 parameters
      const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'NVIDIA Corporation';
        }
        if (parameter === 37446) {
          return 'GeForce RTX 3080/PCIe/SSE2';
        }
        return getParameter2.call(this, parameter);
      };
    `);
  }

  // AudioContext Fingerprint Spoofing
  if (config.audioContextNoise !== false) {
    scripts.push(`
      // AudioContext fingerprint spoofing
      const audioNoise = () => {
        return Math.random() * 0.0000001;
      };
      
      const originalGetChannelData = AudioContext.prototype.createBuffer;
      AudioContext.prototype.createBuffer = function(numberOfChannels, length, sampleRate) {
        const buffer = originalGetChannelData.call(this, numberOfChannels, length, sampleRate);
        // Add tiny noise to prevent exact fingerprinting
        for (let i = 0; i < buffer.numberOfChannels; i++) {
          const channelData = buffer.getChannelData(i);
          for (let j = 0; j < channelData.length; j += 1000) {
            channelData[j] += audioNoise();
          }
        }
        return buffer;
      };
      
      const originalDecodeAudioData = AudioContext.prototype.decodeAudioData;
      AudioContext.prototype.decodeAudioData = function(audioData, successCallback, errorCallback) {
        const success = successCallback;
        const error = errorCallback;
        return originalDecodeAudioData.call(this, audioData, 
          (decodedBuffer) => {
            // Add noise to decoded buffer
            if (decodedBuffer) {
              for (let i = 0; i < decodedBuffer.numberOfChannels; i++) {
                const channelData = decodedBuffer.getChannelData(i);
                for (let j = 0; j < channelData.length; j += 500) {
                  channelData[j] += audioNoise();
                }
              }
            }
            if (success) success(decodedBuffer);
          },
          error
        );
      };
    `);
  }

  // Behavior Randomization - Human-like interactions
  if (config.behaviorRandomization !== false) {
    scripts.push(`
      // Human behavior randomization
      
      // Randomize scroll behavior
      const originalScroll = window.scrollTo;
      window.scrollTo = function(x, y) {
        if (typeof x === 'object') {
          x = x.left || 0;
          y = x.top || 0;
        }
        // Add small random offset
        const randomX = x + (Math.random() - 0.5) * 10;
        const randomY = y + (Math.random() - 0.5) * 10;
        originalScroll.call(this, Math.max(0, randomX), Math.max(0, randomY));
      };
      
      // Add random mouse movements simulation
      let mouseMoveCount = 0;
      document.addEventListener('mousemove', () => {
        mouseMoveCount++;
      });
      
      // Randomize click timing
      const originalClick = HTMLElement.prototype.click;
      HTMLElement.prototype.click = function() {
        // Simulate human-like delay
        const delay = Math.random() * 50 + 10;
        setTimeout(() => {
          originalClick.call(this);
        }, delay);
      };
      
      // Randomize focus events
      const originalFocus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function() {
        const delay = Math.random() * 30 + 5;
        setTimeout(() => {
          originalFocus.call(this);
        }, delay);
      };
      
      // Spoof document.hidden
      Object.defineProperty(document, 'hidden', {
        get: () => false,
        configurable: true,
      });
      
      Object.defineProperty(document, 'visibilityState', {
        get: () => 'visible',
        configurable: true,
      });
      
      // Add random viewport offset
      Object.defineProperty(window, 'scrollX', {
        get: () => Math.floor(Math.random() * 5),
        configurable: true,
      });
      
      Object.defineProperty(window, 'scrollY', {
        get: () => Math.floor(Math.random() * 5),
        configurable: true,
      });
      
      // Randomize Performance API
      const originalNow = performance.now;
      performance.now = function() {
        const now = originalNow.call(this);
        // Add small random offset to prevent timing fingerprinting
        return now + (Math.random() - 0.5) * 0.5;
      };
      
      // Add random variation to Date
      const originalDate = Date;
      Date = function(...args) {
        if (args.length === 0) {
          return new originalDate(originalDate.now() + (Math.random() - 0.5) * 100);
        }
        return new originalDate(...args);
      };
      Date.now = function() {
        return originalDate.now() + (Math.random() - 0.5) * 100;
      };
    `);
  }

  // Speech Synthesis spoofing
  scripts.push(`
    Object.defineProperty(window, 'speechSynthesis', {
      get: () => ({
        pending: false,
        speaking: false,
        paused: false,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        cancel: () => {},
        speak: () => {},
        pause: () => {},
        resume: () => {},
        getVoices: () => [],
      }),
      configurable: true,
    });
  `);

  // Gamepad API spoofing
  scripts.push(`
    Object.defineProperty(navigator, 'getGamepads', {
      get: () => () => Array(4).fill(null),
      configurable: true,
    });
  `);

  // Battery API spoofing
  scripts.push(`
    Object.defineProperty(navigator, 'getBattery', {
      get: () => () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      configurable: true,
    });
  `);

  // Clipboard API spoofing
  scripts.push(`
    Object.defineProperty(navigator, 'clipboard', {
      get: () => ({
        readText: () => Promise.reject(new Error('Clipboard access denied')),
        writeText: () => Promise.reject(new Error('Clipboard access denied')),
        read: () => Promise.reject(new Error('Clipboard access denied')),
        write: () => Promise.reject(new Error('Clipboard access denied')),
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      configurable: true,
    });
  `);

  // Combine all scripts
  return scripts.join('\n');
}

/**
 * Generate stealth launch arguments for Chromium - Enhanced Version
 */
export function generateStealthArgs(): string[] {
  return [
    // Core automation detection bypass
    '--disable-blink-features=AutomationControlled',
    '--disable-automation',
    '--enable-automation',
    
    // Memory and performance optimizations
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    
    // Window settings to avoid fingerprinting
    '--window-size=1920,1080',
    '--window-position=0,0',
    '--start-maximized',
    '--maximize',
    
    // Security and privacy settings
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process,TranslateUI',
    '--disable-benchmarking',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--mute-audio',
    '--safebrowsing-disable-auto-update',
    '--safebrowsing-disable-download-protection',
    
    // Password and form settings
    '--password-store=basic',
    '--use-mock-keychain',
    '--disable-autofill-assistant',
    '--disable-password-generation',
    '--disable-save-password-bubble',
    
    // Hardware and feature flags
    '--disable-software-rasterizer',
    '--disable-accelerated-video-decode',
    '--disable-frame-rate-limit',
    '--ignore-gpu-blocklist',
    
    // Bot detection bypass
    '--disable-ipc-flooding-protection',
    '--disable-prompt-on-repost',
    '--noerrdialogs',
    '--disable-breakpad',
    '--disable-logging',
    '--disable-metrics',
    '--disable-metrics-reporting',
    
    // User agent spoofing arguments
    '--user-agent=' + generateRealisticUserAgent(),
  ];
}

/**
 * Generate a more realistic User-Agent string
 */
function generateRealisticUserAgent(): string {
  const versions = {
    chrome: ['131.0.0.0', '132.0.0.0', '133.0.0.0'],
    safari: ['605.1.15', '616.4.1', '617.1.15'],
  };
  
  const randomChrome = versions.chrome[Math.floor(Math.random() * versions.chrome.length)];
  const randomSafari = versions.safari[Math.floor(Math.random() * versions.safari.length)];
  
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${randomChrome} Safari/537.36`;
}
