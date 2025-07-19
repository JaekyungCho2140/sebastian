import * as ExcelJS from 'exceljs'
import * as path from 'path'
import * as fs from 'fs/promises'
import { BrowserWindow } from 'electron'
import { 
  M4DialogueMergeRequest, 
  M4DialogueMergeProgress, 
  M4DialogueMergeResult,
  IPC_CHANNELS 
} from '../../shared/types'

export class M4DialogueMergerService {
  private static readonly REQUIRED_FILES = [
    'M4_Dialogue_EN.xlsx',
    'M4_Dialogue_JAP.xlsx',
    'M4_Dialogue_KOR.xlsx',
    'M4_Dialogue_SC.xlsx',
    'M4_Dialogue_TC.xlsx'
  ]

  private static readonly LANGUAGE_MAP: Record<string, string> = {
    'EN': 'English',
    'JAP': 'Japanese',
    'KOR': 'Korean',
    'SC': 'Simplified Chinese',
    'TC': 'Traditional Chinese'
  }

  /**
   * M4 Dialog 파일들을 병합하는 메인 함수
   */
  static async runMerge(
    request: M4DialogueMergeRequest,
    mainWindow: BrowserWindow | null
  ): Promise<M4DialogueMergeResult> {
    const { inputFolder, outputFolder } = request
    
    try {
      // 진행률 보고 함수
      const reportProgress = (progress: M4DialogueMergeProgress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC_CHANNELS.M4_DIALOGUE_MERGE_PROGRESS, progress)
        }
      }

      // 시작
      reportProgress({
        current: 0,
        total: 100,
        status: 'Starting merge process...',
        percentage: 0
      })

      // 필수 파일 존재 확인
      await this.validateRequiredFiles(inputFolder)

      // 출력 폴더 생성
      await fs.mkdir(outputFolder, { recursive: true })

      // 병합된 데이터를 저장할 Map
      const mergedData = new Map<string, Map<string, string>>()
      
      // 각 언어별 파일 읽기
      let processedFiles = 0
      for (const fileName of this.REQUIRED_FILES) {
        const langCode = fileName.match(/M4_Dialogue_(\w+)\.xlsx/)?.[1] || ''
        const language = this.LANGUAGE_MAP[langCode] || langCode

        reportProgress({
          current: processedFiles * 15,
          total: 100,
          status: `Reading ${language} file...`,
          percentage: processedFiles * 15
        })

        const filePath = path.join(inputFolder, fileName)
        await this.readDialogueFile(filePath, langCode, mergedData)
        
        processedFiles++
      }

      // 병합된 Excel 파일 생성
      reportProgress({
        current: 80,
        total: 100,
        status: 'Creating merged Excel file...',
        percentage: 80
      })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      const outputFileName = `M4_Dialogue_Merged_${timestamp}.xlsx`
      const outputPath = path.join(outputFolder, outputFileName)
      
      await this.createMergedExcel(mergedData, outputPath)

      // 완료
      reportProgress({
        current: 100,
        total: 100,
        status: 'Merge completed successfully!',
        percentage: 100
      })

      return {
        success: true,
        outputPath
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('M4 Dialogue merge error:', error)
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * 필수 파일들이 모두 존재하는지 확인
   */
  private static async validateRequiredFiles(folderPath: string): Promise<void> {
    const missingFiles: string[] = []
    
    for (const fileName of this.REQUIRED_FILES) {
      const filePath = path.join(folderPath, fileName)
      try {
        await fs.access(filePath)
      } catch {
        missingFiles.push(fileName)
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`)
    }
  }

  /**
   * 개별 Dialog 파일 읽기
   */
  private static async readDialogueFile(
    filePath: string,
    langCode: string,
    mergedData: Map<string, Map<string, string>>
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)
    
    const worksheet = workbook.getWorksheet(1)
    if (!worksheet) {
      throw new Error(`No worksheet found in ${path.basename(filePath)}`)
    }

    // 헤더 행 건너뛰고 데이터 읽기
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // 헤더 건너뛰기
      
      const id = row.getCell(1).value?.toString() || ''
      const text = row.getCell(2).value?.toString() || ''
      
      if (id) {
        if (!mergedData.has(id)) {
          mergedData.set(id, new Map())
        }
        mergedData.get(id)?.set(langCode, text)
      }
    })
  }

  /**
   * 병합된 Excel 파일 생성
   */
  private static async createMergedExcel(
    mergedData: Map<string, Map<string, string>>,
    outputPath: string
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook()
    
    // 메인 데이터 시트
    const worksheet = workbook.addWorksheet('Merged Dialogue')

    // 헤더 추가
    const headers = ['ID', 'English', 'Japanese', 'Korean', 'Simplified Chinese', 'Traditional Chinese']
    const headerRow = worksheet.addRow(headers)
    
    // 헤더 스타일 적용
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    // 데이터 추가
    const sortedIds = Array.from(mergedData.keys()).sort((a, b) => {
      // 숫자로 변환 가능한 경우 숫자로 정렬
      const numA = parseInt(a)
      const numB = parseInt(b)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      // 그렇지 않으면 문자열로 정렬
      return a.localeCompare(b)
    })

    for (const id of sortedIds) {
      const translations = mergedData.get(id)!
      const row = worksheet.addRow([
        id,
        translations.get('EN') || '',
        translations.get('JAP') || '',
        translations.get('KOR') || '',
        translations.get('SC') || '',
        translations.get('TC') || ''
      ])

      // 데이터 행 스타일 적용
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        cell.alignment = { vertical: 'top', wrapText: true }
      })
    }

    // 열 너비 자동 조정
    worksheet.columns.forEach((column, index) => {
      if (index === 0) {
        column.width = 15 // ID 열
      } else {
        column.width = 40 // 텍스트 열
      }
    })

    // 요약 시트 추가
    await this.createSummarySheet(workbook, mergedData)

    // 파일 저장
    await workbook.xlsx.writeFile(outputPath)
  }

  /**
   * 스타일이 적용된 요약 시트 생성
   */
  private static async createSummarySheet(
    workbook: ExcelJS.Workbook,
    mergedData: Map<string, Map<string, string>>
  ): Promise<void> {
    const summarySheet = workbook.addWorksheet('Summary', { 
      properties: { tabColor: { argb: 'FF00B050' } } 
    })

    // 제목 추가
    const titleRow = summarySheet.addRow(['M4 Dialogue Merge Summary'])
    titleRow.getCell(1).font = { bold: true, size: 16 }
    titleRow.getCell(1).alignment = { horizontal: 'center' }
    summarySheet.mergeCells('A1:B1')

    // 빈 행
    summarySheet.addRow([])

    // 통계 정보
    const stats = [
      ['Total IDs', mergedData.size],
      ['Languages', Object.keys(this.LANGUAGE_MAP).length],
      ['Generated', new Date().toLocaleString()]
    ]

    stats.forEach(([label, value]) => {
      const row = summarySheet.addRow([label, value])
      row.getCell(1).font = { bold: true }
    })

    // 언어별 번역 완성도
    summarySheet.addRow([])
    const langHeaderRow = summarySheet.addRow(['Language', 'Translated Count', 'Percentage'])
    langHeaderRow.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      }
    })

    Object.entries(this.LANGUAGE_MAP).forEach(([code, name]) => {
      let translatedCount = 0
      mergedData.forEach((translations) => {
        if (translations.get(code) && translations.get(code)!.trim()) {
          translatedCount++
        }
      })
      
      const percentage = ((translatedCount / mergedData.size) * 100).toFixed(2)
      summarySheet.addRow([name, translatedCount, `${percentage}%`])
    })

    // 열 너비 조정
    summarySheet.columns = [
      { width: 20 },
      { width: 20 },
      { width: 15 }
    ]
  }
}