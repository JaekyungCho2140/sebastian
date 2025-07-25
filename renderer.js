/**
 * Sebastian v0.2.0 - 렌더러 프로세스
 * 
 * UI 이벤트 처리와 사용자 상호작용을 담당합니다.
 */

const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 현재 진행 중인 작업 취소 토큰
let currentOperation = null;

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
        'm4-dialogue': 'M4 Dialogue',
        'm4-string': 'M4 String',
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
    
    // v0.2.0: M4 기능 구현
    if (feature === 'm4-dialogue' || feature === 'm4-string') {
        handleMergeFeature(feature, featureName);
    } else {
        // 다른 기능들은 아직 미구현
        showNotification(featureName);
    }
}

/**
 * M4 병합 기능 처리
 * 
 * @param {string} feature - 기능 ID
 * @param {string} featureName - 기능 이름
 */
async function handleMergeFeature(feature, featureName) {
    try {
        // 폴더 선택 다이얼로그 요청
        const folderPath = await ipcRenderer.invoke('select-folder');
        
        if (!folderPath) {
            logAction(`${featureName} 작업 취소됨 - 폴더 미선택`);
            return;
        }
        
        logAction(`${featureName} 작업 시작 - 폴더: ${folderPath}`);
        
        // 진행률 모달 표시
        showProgressModal(featureName);
        
        // 병합 작업 시작
        const result = await ipcRenderer.invoke('merge-files', {
            type: feature,
            folderPath: folderPath
        });
        
        // 진행률 모달 숨기기
        hideProgressModal();
        
        if (result.success) {
            // 성공 알림
            showCompletionDialog({
                title: '완료',
                message: '병합이 완료되었습니다!',
                details: `소요 시간: ${result.elapsed}초\n저장 위치: ${path.basename(result.outputPath)}`,
                rowCount: result.rowCount
            });
            
            logAction(`${featureName} 작업 완료 - ${result.rowCount}행 처리`);
        } else {
            // 오류 알림
            showErrorDialog({
                title: '오류',
                message: '병합 중 오류가 발생했습니다.',
                error: result.error
            });
            
            logAction(`${featureName} 작업 실패 - ${result.error}`);
        }
        
    } catch (error) {
        hideProgressModal();
        showErrorDialog({
            title: '오류',
            message: '예기치 않은 오류가 발생했습니다.',
            error: error.message
        });
        
        logAction(`${featureName} 작업 오류 - ${error.message}`);
    }
}

/**
 * 진행률 모달 표시
 * 
 * @param {string} title - 작업 제목
 */
function showProgressModal(title) {
    const modal = document.getElementById('progress-modal');
    const titleElement = document.getElementById('progress-title');
    
    titleElement.textContent = `${title} 병합 중...`;
    modal.style.display = 'flex';
    
    // 진행률 초기화
    updateProgress({
        percentage: '0',
        elapsed: '0',
        remaining: '계산 중',
        currentFile: '-',
        currentStep: '준비 중',
        fileProgress: '0/0'
    });
    
    // 작업 취소 가능 표시
    currentOperation = title;
}

/**
 * 진행률 모달 숨기기
 */
function hideProgressModal() {
    const modal = document.getElementById('progress-modal');
    modal.style.display = 'none';
    currentOperation = null;
}

/**
 * 진행률 정보 업데이트
 * 
 * @param {Object} progress - 진행률 정보
 */
function updateProgress(progress) {
    document.getElementById('progress-bar').style.width = `${progress.percentage}%`;
    document.getElementById('progress-percentage').textContent = `${progress.percentage}%`;
    document.getElementById('current-step').textContent = progress.currentStep;
    document.getElementById('current-file').textContent = progress.currentFile;
    document.getElementById('file-progress').textContent = progress.fileProgress;
    document.getElementById('elapsed-time').textContent = `${progress.elapsed}초`;
    document.getElementById('remaining-time').textContent = `${progress.remaining}초`;
}

/**
 * 작업 취소
 */
function cancelOperation() {
    if (currentOperation) {
        ipcRenderer.send('cancel-operation');
        hideProgressModal();
        logAction(`${currentOperation} 작업 취소됨`);
    }
}

/**
 * 완료 다이얼로그 표시
 * 
 * @param {Object} options - 다이얼로그 옵션
 */
function showCompletionDialog(options) {
    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.innerHTML = `
        <div class="modal-content">
            <h2>✓ ${options.title}</h2>
            <p>${options.message}</p>
            <div class="progress-details">
                <p>${options.details}</p>
                <p><strong>처리된 행:</strong> ${options.rowCount.toLocaleString()}행</p>
            </div>
            <button class="dialog-button" onclick="this.closest('.modal').remove()">확인</button>
        </div>
    `;
    
    // 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        .dialog-button {
            width: 100%;
            padding: 10px;
            background-color: #2ecc71;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 10px;
        }
        .dialog-button:hover {
            background-color: #27ae60;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(dialog);
}

/**
 * 오류 다이얼로그 표시
 * 
 * @param {Object} options - 다이얼로그 옵션
 */
function showErrorDialog(options) {
    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.innerHTML = `
        <div class="modal-content">
            <h2>⚠️ ${options.title}</h2>
            <p>${options.message}</p>
            <div class="progress-details" style="background-color: #fee;">
                <p style="color: #c00;">${options.error}</p>
            </div>
            <button class="dialog-button error-button" onclick="this.closest('.modal').remove()">확인</button>
        </div>
    `;
    
    // 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        .error-button {
            background-color: #e74c3c !important;
        }
        .error-button:hover {
            background-color: #c0392b !important;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(dialog);
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
        <span>${featureName} 기능은 다음 버전에서 구현됩니다.</span>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // 3초 후 자동으로 제거
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// IPC 이벤트 리스너
ipcRenderer.on('merge-progress', (event, progress) => {
    updateProgress(progress);
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    logAction('렌더러 프로세스 초기화 완료 (v0.2.0)');
    
    // 키보드 단축키 설정
    document.addEventListener('keydown', (e) => {
        // Esc 키로 모달 닫기
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal');
            if (modal) {
                modal.remove();
            }
        }
    });
});

// 전역 함수로 내보내기 (인라인 onclick에서 사용)
window.handleClick = handleClick;
window.cancelOperation = cancelOperation;