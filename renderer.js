/**
 * Sebastian v0.1 - 렌더러 프로세스
 * 
 * UI 이벤트 처리와 사용자 상호작용을 담당합니다.
 */

const fs = require('fs');
const path = require('path');

/**
 * 사용자 액션을 로그 파일에 기록합니다.
 * 
 * @param {string} action - 기록할 액션 설명
 */
function logAction(action) {
    try {
        // Electron remote API 대신 직접 경로 사용
        const userDataPath = process.env.APPDATA || process.env.HOME;
        const logDir = path.join(userDataPath, 'Sebastian', 'logs');
        
        // 로그 디렉토리가 없으면 생성
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        // 날짜별 로그 파일
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(logDir, `${today}.log`);
        const timestamp = new Date().toISOString();
        
        // 로그 메시지 작성
        const logMessage = `[${timestamp}] [UI] ${action}\n`;
        
        // 파일에 추가
        fs.appendFileSync(logFile, logMessage, 'utf8');
        
        // 개발 모드에서는 콘솔에도 출력
        console.log(`[UI] ${action}`);
    } catch (error) {
        console.error('로그 기록 실패:', error);
    }
}

/**
 * 기능 버튼 클릭 핸들러
 * 
 * @param {string} feature - 클릭된 기능의 ID
 */
function handleClick(feature) {
    // 기능별 한글 이름 매핑
    const featureNames = {
        'm4-merge': 'M4 테이블 병합',
        'nc-merge': 'NC 테이블 병합',
        'ly-merge-split': 'LY 테이블 병합/분할',
        'excel-format': 'Excel 서식 변환',
        'text-extract': '텍스트 추출',
        'translation-check': '번역 검증',
        'glossary-manage': '용어집 관리',
        'file-batch': '파일 일괄 처리',
        'report-generate': '리포트 생성',
        'backup-restore': '백업/복원',
        'settings': '설정'
    };
    
    const featureName = featureNames[feature] || feature;
    
    // 클릭 이벤트 로깅
    logAction(`버튼 클릭: ${featureName}`);
    
    // v0.1에서는 알림만 표시
    showNotification(featureName);
}

/**
 * 사용자에게 알림을 표시합니다.
 * 
 * @param {string} featureName - 기능 이름
 */
function showNotification(featureName) {
    // 커스텀 알림 창 생성
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-content">
            <h3>알림</h3>
            <p>${featureName} 기능은 다음 버전에서 구현됩니다.</p>
            <p class="version-info">현재 버전: v0.1 (기본 구조)</p>
            <button onclick="closeNotification(this)">확인</button>
        </div>
    `;
    
    // 알림 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.3s ease;
        }
        
        .notification-content {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            text-align: center;
            max-width: 400px;
        }
        
        .notification-content h3 {
            margin-bottom: 15px;
            color: #2c3e50;
        }
        
        .notification-content p {
            margin-bottom: 10px;
            color: #555;
        }
        
        .version-info {
            font-size: 0.9em;
            color: #7f8c8d;
        }
        
        .notification-content button {
            margin-top: 20px;
            padding: 10px 30px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        
        .notification-content button:hover {
            background-color: #2980b9;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
}

/**
 * 알림 창을 닫습니다.
 * 
 * @param {HTMLElement} button - 클릭된 버튼 요소
 */
function closeNotification(button) {
    const notification = button.closest('.notification');
    notification.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        notification.remove();
    }, 300);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    logAction('렌더러 프로세스 초기화 완료');
    
    // 키보드 단축키 설정
    document.addEventListener('keydown', (e) => {
        // Esc 키로 알림 닫기
        if (e.key === 'Escape') {
            const notification = document.querySelector('.notification');
            if (notification) {
                notification.remove();
            }
        }
    });
});

// 전역 함수로 내보내기 (인라인 onclick에서 사용)
window.handleClick = handleClick;
window.closeNotification = closeNotification;