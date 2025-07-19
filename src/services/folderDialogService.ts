import { dialog } from 'electron';
import { existsSync, readdirSync } from 'fs';
import path from 'path';

export interface FolderSelectionResult {
  success: boolean;
  folderPath?: string;
  error?: string;
}

export interface M4FileValidationResult {
  isValid: boolean;
  missingFiles: string[];
  foundFiles: string[];
}

// M4 Dialogue 처리에 필요한 파일들
export const M4_DIALOGUE_FILES = [
  'CINEMATIC_DIALOGUE.xlsm',
  'SMALLTALK_DIALOGUE.xlsm',
  'NPC.xlsm'
];

// M4 String 처리에 필요한 파일들
export const M4_STRING_FILES = [
  'SEQUENCE_DIALOGUE.xlsm',
  'STRING_BUILTIN.xlsm',
  'STRING_MAIL.xlsm',
  'STRING_MESSAGE.xlsm',
  'STRING_NPC.xlsm',
  'STRING_QUESTTEMPLATE.xlsm',
  'STRING_TEMPLATE.xlsm',
  'STRING_TOOLTIP.xlsm'
];

export class FolderDialogService {
  /**
   * 폴더 선택 다이얼로그 열기
   */
  async openFolderDialog(): Promise<FolderSelectionResult> {
    try {
      const result = await dialog.showOpenDialog({
        title: 'M4 파일이 들어있는 폴더를 선택하세요',
        properties: ['openDirectory'],
        buttonLabel: '폴더 선택'
      });

      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: false,
          error: '폴더 선택이 취소되었습니다.'
        };
      }

      const selectedPath = result.filePaths[0];
      
      // 폴더 존재 여부 확인
      if (!existsSync(selectedPath)) {
        return {
          success: false,
          error: '선택한 폴더가 존재하지 않습니다.'
        };
      }

      return {
        success: true,
        folderPath: selectedPath
      };
    } catch (error) {
      return {
        success: false,
        error: `폴더 선택 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  }

  /**
   * M4 Dialogue 파일 유효성 검증
   */
  validateM4DialogueFiles(folderPath: string): M4FileValidationResult {
    return this.validateFiles(folderPath, M4_DIALOGUE_FILES);
  }

  /**
   * M4 String 파일 유효성 검증
   */
  validateM4StringFiles(folderPath: string): M4FileValidationResult {
    return this.validateFiles(folderPath, M4_STRING_FILES);
  }

  /**
   * 파일 존재 여부 검증
   */
  private validateFiles(folderPath: string, requiredFiles: string[]): M4FileValidationResult {
    try {
      const files = readdirSync(folderPath);
      const foundFiles: string[] = [];
      const missingFiles: string[] = [];

      requiredFiles.forEach(requiredFile => {
        const filePath = path.join(folderPath, requiredFile);
        if (existsSync(filePath)) {
          foundFiles.push(requiredFile);
        } else {
          missingFiles.push(requiredFile);
        }
      });

      return {
        isValid: missingFiles.length === 0,
        foundFiles,
        missingFiles
      };
    } catch (error) {
      return {
        isValid: false,
        foundFiles: [],
        missingFiles: requiredFiles
      };
    }
  }

  /**
   * 사용자 친화적인 오류 메시지 생성
   */
  generateValidationErrorMessage(validation: M4FileValidationResult, processType: 'dialogue' | 'string'): string {
    if (validation.isValid) {
      return '';
    }

    const processName = processType === 'dialogue' ? 'M4 Dialogue' : 'M4 String';
    let message = `${processName} 처리에 필요한 파일이 누락되었습니다:\n\n`;
    
    validation.missingFiles.forEach(file => {
      message += `❌ ${file}\n`;
    });

    if (validation.foundFiles.length > 0) {
      message += '\n찾은 파일:\n';
      validation.foundFiles.forEach(file => {
        message += `✅ ${file}\n`;
      });
    }

    message += '\n올바른 폴더를 선택했는지 확인해주세요.';
    return message;
  }
}