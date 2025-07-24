/**
 * Sebastian v0.1 - Electron 메인 프로세스
 * 
 * 이 파일은 Electron 앱의 메인 프로세스를 담당합니다.
 * 윈도우 생성, 로깅, 앱 생명주기 관리를 처리합니다.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let isDev = process.env.NODE_ENV === 'development';

/**
 * 로그 파일에 메시지를 기록합니다.
 * 
 * @param {string} message - 로그에 기록할 메시지
 */
function logToFile(message) {
    const logDir = path.join(app.getPath('userData'), 'logs');
    
    // 로그 디렉토리가 없으면 생성
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    // 날짜별 로그 파일 생성
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `${today}.log`);
    const timestamp = new Date().toISOString();
    
    // 로그 메시지 작성
    const logMessage = `[${timestamp}] ${message}\n`;
    
    // 파일에 추가
    fs.appendFileSync(logFile, logMessage, 'utf8');
}

/**
 * 메인 윈도우를 생성합니다.
 */
function createWindow() {
    // 브라우저 윈도우 생성
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'Sebastian v0.1.1',
        icon: path.join(__dirname, 'sebastian.ico')
    });

    // index.html 로드
    mainWindow.loadFile('index.html');
    
    // 개발 모드에서는 개발자 도구 자동 열기
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
    
    // 윈도우가 닫힐 때
    mainWindow.on('closed', () => {
        mainWindow = null;
        logToFile('메인 윈도우 닫힘');
    });
    
    // 앱 시작 로그
    logToFile('Sebastian 앱 시작됨');
}

// 앱이 준비되면 윈도우 생성
app.whenReady().then(() => {
    createWindow();
});

// 모든 윈도우가 닫히면 앱 종료
app.on('window-all-closed', () => {
    logToFile('Sebastian 앱 종료됨');
    app.quit();
});

// 앱 종료 전 로그
app.on('before-quit', () => {
    logToFile('앱 종료 프로세스 시작');
});