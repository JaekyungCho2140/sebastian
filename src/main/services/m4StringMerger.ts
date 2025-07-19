import * as path from 'path'
import * as fs from 'fs/promises'
import { dialog, BrowserWindow } from 'electron'
import * as ExcelJS from 'exceljs'
import { format } from 'date-fns'
import type { 
  M4StringMergeRequest, 
  M4StringMergeResult, 
  M4StringMergeProgress,
  M4StringFileConfig 
} from '../../shared/types'

/**
 * M4 String 병합 서비스 (메인 프로세스)
 * Python의 run_merge_string 함수를 TypeScript로 포팅
 */
export class M4StringMerger {
  private isCancelled = false

  /**
   * M4 String 파일 병합 실행
   */
  async mergeStringFiles(
    request: M4StringMergeRequest,
    onProgress?: (progress: M4StringMergeProgress) => void
  ): Promise<M4StringMergeResult> {
    const startTime = Date.now()
    this.isCancelled = false

    try {
      // 파일 목록 정의
      const fileList = [
        'SEQUENCE_DIALOGUE.xlsm',
        'STRING_BUILTIN.xlsm',
        'STRING_MAIL.xlsm',
        'STRING_MESSAGE.xlsm',
        'STRING_NPC.xlsm',
        'STRING_QUESTTEMPLATE.xlsm',
        'STRING_TEMPLATE.xlsm',
        'STRING_TOOLTIP.xlsm'
      ]

      // 파일별 설정
      const fileConfigs: Record<string, M4StringFileConfig> = {
        'SEQUENCE_DIALOGUE.xlsm': {
          filename: 'SEQUENCE_DIALOGUE.xlsm',
          headerRow: 2,
          startRow: 9,
          matchingColumns: [7, null, 10, 11, 12, 13, 14, 15, 16, 17, null, null]
        },
        'STRING_BUILTIN.xlsm': {
          filename: 'STRING_BUILTIN.xlsm',
          headerRow: 2,
          startRow: 4,
          matchingColumns: [7, 21, 8, 9, 10, 11, 12, 13, 14, 15, null, null]
        },
        'STRING_MAIL.xlsm': {
          filename: 'STRING_MAIL.xlsm',
          headerRow: 2,
          startRow: 4,
          matchingColumns: [7, null, 8, 9, 10, 11, 12, 13, 14, 15, null, null]
        },
        'STRING_MESSAGE.xlsm': {
          filename: 'STRING_MESSAGE.xlsm',
          headerRow: 2,
          startRow: 4,
          matchingColumns: [7, 21, 8, 9, 10, 11, 12, 13, 14, 15, null, null]
        },
        'STRING_NPC.xlsm': {
          filename: 'STRING_NPC.xlsm',
          headerRow: 2,
          startRow: 4,
          matchingColumns: [7, 20, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19]
        },
        'STRING_QUESTTEMPLATE.xlsm': {
          filename: 'STRING_QUESTTEMPLATE.xlsm',
          headerRow: 2,
          startRow: 7,
          matchingColumns: [7, 0, 12, 13, 14, 15, 16, 17, 18, 19, null, null]
        },
        'STRING_TEMPLATE.xlsm': {
          filename: 'STRING_TEMPLATE.xlsm',
          headerRow: 2,
          startRow: 4,
          matchingColumns: [7, 19, 8, 9, 10, 11, 12, 13, 14, 15, null, 18]
        },
        'STRING_TOOLTIP.xlsm': {
          filename: 'STRING_TOOLTIP.xlsm',
          headerRow: 2,
          startRow: 4,
          matchingColumns: [7, 8, 11, 12, 13, 14, 15, 16, 17, 18, null, null]
        }
      }

      // 진행률 보고
      onProgress?.({
        current: 0,
        total: fileList.length,
        step: '1/2',
        currentFile: '파일 읽는 중...',
        processedFiles: 0,
        percentage: 0,
        message: '단계:1/2',
        status: 'processing'
      })

      // 결과 데이터를 담을 배열
      interface StringMergeRow {
        '#': number
        'Table Name': string
        'String ID': string | number | undefined
        'Table/ID': string
        'NOTE': string | number | undefined
        'KO': string | number | undefined
        'EN': string | number | undefined
        'CT': string | number | undefined
        'CS': string | number | undefined
        'JA': string | number | undefined
        'TH': string | number | undefined
        'ES-LATAM': string | number | undefined
        'PT-BR': string | number | undefined
        'NPC 이름': string | number | undefined
        '비고': string | number | undefined
      }
      const resultRows: StringMergeRow[] = []
      let rowIndex = 1

      // 각 파일 처리
      for (let i = 0; i < fileList.length; i++) {
        if (this.isCancelled) {
          throw new Error('작업이 취소되었습니다.')
        }

        const filename = fileList[i]
        const filePath = path.join(request.inputFolder, filename)
        const config = fileConfigs[filename]

        // 파일 존재 확인
        try {
          await fs.access(filePath)
        } catch {
          throw new Error(`파일을 찾을 수 없습니다: ${filePath}`)
        }

        onProgress?.({
          current: i,
          total: fileList.length,
          currentFile: filename,
          processedFiles: i,
          percentage: Math.round((i / fileList.length) * 50),
          message: `파일:${filename}`,
          status: 'processing'
        })

        // Excel 파일 읽기
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.readFile(filePath)
        const worksheet = workbook.getWorksheet(1)

        if (!worksheet) {
          throw new Error(`워크시트를 찾을 수 없습니다: ${filename}`)
        }

        // 데이터 추출
        const tableName = filename.replace('.xlsm', '')
        const rows = worksheet.getRows(config.startRow, worksheet.rowCount - config.startRow + 1) || []

        for (const row of rows) {
          if (!row || !row.values) continue

          const values = row.values as (string | number | undefined)[]
          const rowData: StringMergeRow = {
            '#': rowIndex++,
            'Table Name': tableName,
            'String ID': config.matchingColumns[0] !== null ? values[config.matchingColumns[0]] : '',
            'Table/ID': '',
            'NOTE': config.matchingColumns[1] !== null ? values[config.matchingColumns[1]] : '',
            'KO': config.matchingColumns[2] !== null ? values[config.matchingColumns[2]] : '',
            'EN': config.matchingColumns[3] !== null ? values[config.matchingColumns[3]] : '',
            'CT': config.matchingColumns[4] !== null ? values[config.matchingColumns[4]] : '',
            'CS': config.matchingColumns[5] !== null ? values[config.matchingColumns[5]] : '',
            'JA': config.matchingColumns[6] !== null ? values[config.matchingColumns[6]] : '',
            'TH': config.matchingColumns[7] !== null ? values[config.matchingColumns[7]] : '',
            'ES-LATAM': config.matchingColumns[8] !== null ? values[config.matchingColumns[8]] : '',
            'PT-BR': config.matchingColumns[9] !== null ? values[config.matchingColumns[9]] : '',
            'NPC 이름': config.matchingColumns[10] !== null ? values[config.matchingColumns[10]] : '',
            '비고': config.matchingColumns[11] !== null ? values[config.matchingColumns[11]] : ''
          }

          // Table/ID 생성
          if (rowData['String ID']) {
            rowData['Table/ID'] = `${tableName}/${rowData['String ID']}`
          }

          resultRows.push(rowData)
        }

        onProgress?.({
          current: i + 1,
          total: fileList.length,
          processedFiles: i + 1,
          percentage: Math.round(20 + (50 / fileList.length) * (i + 1)),
          message: `처리된 파일:${i + 1}`,
          status: 'processing'
        })
      }

      onProgress?.({
        current: fileList.length,
        total: fileList.length,
        step: '2/2',
        currentFile: '결과 파일 저장 중...',
        processedFiles: fileList.length,
        percentage: 70,
        message: '단계:2/2',
        status: 'saving'
      })

      // 필터링: EN 컬럼이 빈 값, 0, '미사용'인 행 제거
      const filteredRows = resultRows.filter(row => {
        const enValue = row['EN']
        return enValue !== undefined && 
               enValue !== null && 
               enValue !== '' && 
               enValue !== 0 && 
               enValue !== '미사용'
      })

      // 인덱스 재설정
      filteredRows.forEach((row, index) => {
        row['#'] = index + 1
      })

      // 출력 파일명 생성
      const dateStr = format(new Date(), 'MMdd')
      let outputFileName = `${dateStr}_MIR4_MASTER_STRING.xlsx`
      let outputPath = path.join(request.outputFolder || request.inputFolder, outputFileName)

      // 파일이 이미 존재하면 번호 추가
      let counter = 1
      while (await this.fileExists(outputPath)) {
        outputFileName = `${dateStr}_MIR4_MASTER_STRING_${counter}.xlsx`
        outputPath = path.join(request.outputFolder || request.inputFolder, outputFileName)
        counter++
      }

      // Excel 파일 생성
      const outputWorkbook = new ExcelJS.Workbook()
      const outputWorksheet = outputWorkbook.addWorksheet('Sheet1')

      // 헤더 설정
      const headers = ['#', 'Table Name', 'String ID', 'Table/ID', 'NOTE', 'KO', 'EN', 'CT', 'CS', 'JA', 'TH', 'ES-LATAM', 'PT-BR', 'NPC 이름', '비고']
      outputWorksheet.addRow(headers)

      // 데이터 추가
      filteredRows.forEach(row => {
        const rowValues = headers.map(header => row[header as keyof StringMergeRow] || '')
        outputWorksheet.addRow(rowValues)
      })

      // 스타일 적용
      this.applyExcelStyles(outputWorksheet)

      // 파일 저장
      await outputWorkbook.xlsx.writeFile(outputPath)

      // 읽기 전용 설정 (Windows에서만)
      if (process.platform === 'win32') {
        try {
          const { exec } = require('child_process')
          exec(`attrib +R "${outputPath}"`)
        } catch (error) {
          console.warn('Failed to set readonly attribute:', error)
        }
      }

      onProgress?.({
        current: fileList.length,
        total: fileList.length,
        percentage: 100,
        message: `완료:파일이 ${outputFileName}로 저장되었습니다.`,
        status: 'completed'
      })

      const elapsedTime = Date.now() - startTime

      return {
        success: true,
        outputPath,
        processedFiles: fileList.length,
        elapsedTime
      }

    } catch (error) {
      console.error('M4 String merge error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Excel 스타일 적용
   */
  private applyExcelStyles(worksheet: ExcelJS.Worksheet): void {
    // 헤더 스타일
    const headerRow = worksheet.getRow(1)
    headerRow.font = {
      name: '맑은 고딕',
      size: 12,
      bold: true,
      color: { argb: 'FF9C5700' }
    }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB9C' }
    }

    // 모든 셀에 테두리 적용
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        
        // 데이터 행 폰트
        if (rowNumber > 1) {
          cell.font = {
            name: '맑은 고딕',
            size: 10
          }
        }
      })
    })

    // 열 너비 자동 조정
    worksheet.columns.forEach(column => {
      if (column && column.values) {
        const lengths = column.values.map((v): number => v ? v.toString().length : 10)
        const maxLength = Math.max(...lengths.filter((v): v is number => v !== undefined))
        column.width = Math.min(maxLength + 2, 50)
      }
    })

    // 틀 고정
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  }

  /**
   * 파일 존재 여부 확인
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * 작업 취소
   */
  cancel(): void {
    this.isCancelled = true
  }

  /**
   * 폴더 선택 다이얼로그
   */
  static async selectFolder(mainWindow: BrowserWindow): Promise<string | null> {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'M4 String 파일이 포함된 폴더 선택'
    })

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  }

  /**
   * M4 String 파일 검증
   */
  static async validateStringFolder(folderPath: string): Promise<{
    isValid: boolean
    missingFiles: string[]
    foundFiles: string[]
  }> {
    const requiredFiles = [
      'SEQUENCE_DIALOGUE.xlsm',
      'STRING_BUILTIN.xlsm',
      'STRING_MAIL.xlsm',
      'STRING_MESSAGE.xlsm',
      'STRING_NPC.xlsm',
      'STRING_QUESTTEMPLATE.xlsm',
      'STRING_TEMPLATE.xlsm',
      'STRING_TOOLTIP.xlsm'
    ]

    const missingFiles: string[] = []
    const foundFiles: string[] = []

    for (const file of requiredFiles) {
      const filePath = path.join(folderPath, file)
      try {
        await fs.access(filePath)
        foundFiles.push(file)
      } catch {
        missingFiles.push(file)
      }
    }

    return {
      isValid: missingFiles.length === 0,
      missingFiles,
      foundFiles
    }
  }
}