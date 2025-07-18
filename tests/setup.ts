// Vitest 전역 설정 파일
import { vi } from 'vitest';
import { join } from 'path';

// Electron 모킹
vi.mock('electron', () => ({
  app: {
    getName: () => 'Sebastian',
    getVersion: () => '0.2.0',
    getPath: vi.fn((name: string) => {
      const paths: Record<string, string> = {
        userData: join(__dirname, '../temp/userData'),
        downloads: join(__dirname, '../temp/downloads'),
        documents: join(__dirname, '../temp/documents'),
        desktop: join(__dirname, '../temp/desktop'),
        temp: join(__dirname, '../temp'),
        appData: join(__dirname, '../temp/appData'),
        logs: join(__dirname, '../temp/logs'),
      };
      return paths[name] || join(__dirname, '../temp', name);
    }),
    whenReady: () => Promise.resolve(),
    quit: vi.fn(),
    exit: vi.fn(),
    isPackaged: false,
    requestSingleInstanceLock: () => true,
    on: vi.fn(),
    once: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeHandler: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
      openDevTools: vi.fn(),
      closeDevTools: vi.fn(),
      isDevToolsOpened: vi.fn(() => false),
      session: {
        clearCache: vi.fn(),
      },
    },
    on: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: vi.fn(() => false),
    isVisible: vi.fn(() => true),
    setProgressBar: vi.fn(),
  })),
  dialog: {
    showOpenDialogSync: vi.fn(),
    showSaveDialogSync: vi.fn(),
    showMessageBoxSync: vi.fn(),
    showErrorBox: vi.fn(),
  },
  shell: {
    openPath: vi.fn(),
    openExternal: vi.fn(),
    showItemInFolder: vi.fn(),
  },
  autoUpdater: {
    setFeedURL: vi.fn(),
    checkForUpdates: vi.fn(),
    checkForUpdatesAndNotify: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

// electron-log 모킹
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
    transports: {
      file: {
        level: 'info',
        resolvePathFn: vi.fn(),
      },
      console: {
        level: 'debug',
      },
    },
  },
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  verbose: vi.fn(),
}));

// electron-store 모킹
vi.mock('electron-store', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn(),
      store: {},
    })),
  };
});

// 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';

// 전역 변수 설정
global.performance = performance;
global.requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
global.cancelAnimationFrame = clearTimeout;

// 테스트 유틸리티 함수들
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await delay(interval);
  }
  throw new Error(`Condition not met within ${timeout}ms`);
};

// 테스트용 파일 경로
export const TEST_DATA_DIR = join(__dirname, 'test-data');
export const TEST_OUTPUT_DIR = join(__dirname, 'test-outputs');

// 테스트 전/후 정리
beforeAll(() => {
  // 테스트 출력 디렉토리 생성
  if (!require('fs').existsSync(TEST_OUTPUT_DIR)) {
    require('fs').mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  }
});

afterEach(() => {
  // 모든 모킹 초기화
  vi.clearAllMocks();
});

// 전역 에러 핸들링
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in test:', reason);
});

// Jest 호환성을 위한 전역 설정
(globalThis as any).jest = vi;