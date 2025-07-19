import * as ExcelJS from 'exceljs'
import * as path from 'path'
import * as fs from 'fs/promises'
import { BrowserWindow } from 'electron'
import { format } from 'date-fns'
import { 
  M4DialogueMergeRequest, 
  M4DialogueMergeProgress, 
  M4DialogueMergeResult,
  IPC_CHANNELS 
} from '../../shared/types'

export class M4DialogueMergerService {
  private static readonly REQUIRED_FILES = [
    'CINEMATIC_DIALOGUE.xlsm',
    'SMALLTALK_DIALOGUE.xlsm', 
    'NPC.xlsm'
  ]

  /**
   * M4 Dialog 파일들을 병합하는 메인 함수
   * Python의 run_merge 함수를 TypeScript로 포팅
   */
  static async runMerge(
    request: M4DialogueMergeRequest,
    mainWindow: BrowserWindow | null
  ): Promise<M4DialogueMergeResult> {
    const { inputFolder, outputFolder } = request
    const startTime = Date.now()
    
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
        percentage: 0,
        currentStep: 1,
        totalSteps: 3,
        currentFile: '',
        filesProcessed: 0
      })

      // 필수 파일 존재 확인
      await this.validateRequiredFiles(inputFolder)

      // 출력 폴더 생성
      await fs.mkdir(outputFolder, { recursive: true })

      // 단계 1: CINEMATIC_DIALOGUE 읽기
      reportProgress({
        current: 10,
        total: 100,
        status: 'Reading CINEMATIC_DIALOGUE.xlsm...',
        percentage: 10,
        currentStep: 1,
        totalSteps: 3,
        currentFile: 'CINEMATIC_DIALOGUE.xlsm',
        filesProcessed: 0
      })

      const cinematicPath = path.join(inputFolder, 'CINEMATIC_DIALOGUE.xlsm')
      const cinematicData = await this.readExcelFile(cinematicPath, 1, 0, 9)
      
      reportProgress({
        current: 20,
        total: 100,
        status: 'CINEMATIC_DIALOGUE.xlsm processed',
        percentage: 20,
        currentStep: 1,
        totalSteps: 3,
        currentFile: 'CINEMATIC_DIALOGUE.xlsm',
        filesProcessed: 1
      })

      // SMALLTALK_DIALOGUE 읽기
      reportProgress({
        current: 30,
        total: 100,
        status: 'Reading SMALLTALK_DIALOGUE.xlsm...',
        percentage: 30,
        currentStep: 1,
        totalSteps: 3,
        currentFile: 'SMALLTALK_DIALOGUE.xlsm',
        filesProcessed: 1
      })

      const smalltalkPath = path.join(inputFolder, 'SMALLTALK_DIALOGUE.xlsm')
      const smalltalkData = await this.readExcelFile(smalltalkPath, 1, 0, 4)
      
      reportProgress({
        current: 40,
        total: 100,
        status: 'SMALLTALK_DIALOGUE.xlsm processed',
        percentage: 40,
        currentStep: 1,
        totalSteps: 3,
        currentFile: 'SMALLTALK_DIALOGUE.xlsm',
        filesProcessed: 2
      })

      // 단계 2: 데이터 병합
      reportProgress({
        current: 50,
        total: 100,
        status: 'Merging data...',
        percentage: 50,
        currentStep: 2,
        totalSteps: 3,
        currentFile: 'Merging data...',
        filesProcessed: 2
      })

      // 결과 데이터 생성
      const mergedData = await this.mergeDialogueData(cinematicData, smalltalkData)

      reportProgress({
        current: 60,
        total: 100,
        status: 'Data merged successfully',
        percentage: 60,
        currentStep: 2,
        totalSteps: 3,
        currentFile: '',
        filesProcessed: 2
      })

      // 단계 3: NPC 데이터 읽기 및 매핑
      reportProgress({
        current: 70,
        total: 100,
        status: 'Reading NPC.xlsm...',
        percentage: 70,
        currentStep: 3,
        totalSteps: 3,
        currentFile: 'NPC.xlsm',
        filesProcessed: 2
      })

      const npcPath = path.join(inputFolder, 'NPC.xlsm')
      const npcData = await this.readNPCData(npcPath)
      
      // NPC ID를 Speaker Name으로 매핑
      await this.mapNPCNames(mergedData, npcData)

      reportProgress({
        current: 80,
        total: 100,
        status: 'NPC names mapped',
        percentage: 80,
        currentStep: 3,
        totalSteps: 3,
        currentFile: 'NPC.xlsm',
        filesProcessed: 3
      })

      // EN (M) 열이 빈 값인 행 제거
      const filteredData = mergedData.filter(row => {
        const enValue = row['EN (M)']
        return enValue && enValue !== 0 && enValue !== '미사용'
      })

      // 인덱스 재할당
      filteredData.forEach((row, index) => {
        row['#'] = index + 1
      })

      // 결과 파일 저장
      reportProgress({
        current: 90,
        total: 100,
        status: 'Saving result file...',
        percentage: 90,
        currentStep: 3,
        totalSteps: 3,
        currentFile: 'Saving...',
        filesProcessed: 3
      })

      const dateStr = format(new Date(), 'MMdd')
      let outputFileName = `${dateStr}_MIR4_MASTER_DIALOGUE.xlsx`
      let outputPath = path.join(outputFolder, outputFileName)
      
      // 파일이 이미 존재하면 번호 추가
      let counter = 1
      while (await this.fileExists(outputPath)) {
        outputFileName = `${dateStr}_MIR4_MASTER_DIALOGUE_${counter}.xlsx`
        outputPath = path.join(outputFolder, outputFileName)
        counter++
      }

      await this.saveResultFile(filteredData, outputPath)

      // 완료
      const elapsedTime = Math.round((Date.now() - startTime) / 1000)
      reportProgress({
        current: 100,
        total: 100,
        status: `Completed! File saved as ${outputFileName}. Time: ${elapsedTime}s`,
        percentage: 100,
        currentStep: 3,
        totalSteps: 3,
        currentFile: '',
        filesProcessed: 3
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
   * Excel 파일 읽기
   * Python의 pd.read_excel(sheet_name=sheet_name, header=header_row, skiprows=skip_rows)와 동일하게 동작
   */
  private static async readExcelFile(
    filePath: string,
    sheetIndex: number,
    headerRow: number,
    skipRows: number
  ): Promise<any[]> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)
    
    const worksheet = workbook.getWorksheet(sheetIndex) // ExcelJS는 1-based index
    if (!worksheet) {
      throw new Error(`No worksheet found at index ${sheetIndex} in ${path.basename(filePath)}`)
    }

    const data: any[] = []
    let actualHeaderRow = skipRows + headerRow + 1 // skipRows 후 headerRow 위치
    
    worksheet.eachRow((row, rowNumber) => {
      // Skip rows 이후부터 처리
      if (rowNumber <= skipRows) return
      
      // Header row는 건너뛰기 (pandas와 동일)
      if (rowNumber === actualHeaderRow) return
      
      // Data rows
      if (rowNumber > actualHeaderRow) {
        const rowData: any = {}
        const values = row.values as any[]
        
        // 인덱스 기반으로 데이터 저장 (Python과 동일하게 0-based index)
        if (values) {
          for (let i = 1; i < values.length; i++) {
            rowData[i] = values[i] // ExcelJS values는 1-based, rowData는 1-based로 저장
          }
        }
        
        data.push(rowData)
      }
    })

    return data
  }

  /**
   * NPC 데이터 읽기
   */
  private static async readNPCData(filePath: string): Promise<Map<string, string>> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)
    
    const worksheet = workbook.getWorksheet('NPC')
    if (!worksheet) {
      throw new Error('NPC sheet not found in NPC.xlsm')
    }

    const npcMap = new Map<string, string>()
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return // Skip header rows
      
      const npcId = row.getCell(8).value?.toString() // H열 (index 7)
      const npcName = row.getCell(10).value?.toString() // J열 (index 9)
      
      if (npcId && npcName) {
        npcMap.set(npcId, npcName)
      }
    })

    return npcMap
  }

  /**
   * Dialogue 데이터 병합
   */
  private static async mergeDialogueData(
    cinematicData: any[],
    smalltalkData: any[]
  ): Promise<any[]> {
    const headers = [
      '#', 'Table Name', 'String ID', 'Table/ID', 'NPC ID', 'Speaker Name',
      'KO (M)', 'KO (F)', 'EN (M)', 'EN (F)', 'CT (M)', 'CT (F)', 'CS (M)',
      'CS (F)', 'JA (M)', 'JA (F)', 'TH (M)', 'TH (F)', 'ES-LATAM (M)', 'ES-LATAM (F)',
      'PT-BR (M)', 'PT-BR (F)', 'NOTE'
    ]

    const mergedData: any[] = []
    let index = 1

    // CINEMATIC_DIALOGUE 데이터 추가
    for (const row of cinematicData) {
      const mergedRow: any = {
        '#': index++,
        'Table Name': 'CINEMATIC_DIALOGUE',
        'String ID': row[7],
        'Table/ID': `CINEMATIC_DIALOGUE/${row[7]}`,
        'NPC ID': row[8],
        'Speaker Name': row[8], // 나중에 NPC 이름으로 매핑
        'KO (M)': row[11],
        'KO (F)': row[12],
        'EN (M)': row[13],
        'EN (F)': row[14],
        'CT (M)': row[15],
        'CT (F)': row[16],
        'CS (M)': row[17],
        'CS (F)': row[18],
        'JA (M)': row[19],
        'JA (F)': row[20],
        'TH (M)': row[21],
        'TH (F)': row[22],
        'ES-LATAM (M)': row[23],
        'ES-LATAM (F)': row[24],
        'PT-BR (M)': row[25],
        'PT-BR (F)': row[26],
        'NOTE': row[29]
      }
      mergedData.push(mergedRow)
    }

    // SMALLTALK_DIALOGUE 데이터 추가
    for (const row of smalltalkData) {
      const mergedRow: any = {
        '#': index++,
        'Table Name': 'SMALLTALK_DIALOGUE',
        'String ID': row[7],
        'Table/ID': `SMALLTALK_DIALOGUE/${row[7]}`,
        'NPC ID': row[8],
        'Speaker Name': row[8], // 나중에 NPC 이름으로 매핑
        'KO (M)': row[12],
        'KO (F)': row[13],
        'EN (M)': row[14],
        'EN (F)': row[15],
        'CT (M)': row[16],
        'CT (F)': row[17],
        'CS (M)': row[18],
        'CS (F)': row[19],
        'JA (M)': row[20],
        'JA (F)': row[21],
        'TH (M)': row[22],
        'TH (F)': row[23],
        'ES-LATAM (M)': row[24],
        'ES-LATAM (F)': row[25],
        'PT-BR (M)': row[26],
        'PT-BR (F)': row[27],
        'NOTE': row[30]
      }
      mergedData.push(mergedRow)
    }

    return mergedData
  }

  /**
   * NPC ID를 NPC 이름으로 매핑
   */
  private static async mapNPCNames(mergedData: any[], npcMap: Map<string, string>): Promise<void> {
    for (const row of mergedData) {
      const npcId = row['NPC ID']?.toString()
      if (npcId && npcMap.has(npcId)) {
        row['Speaker Name'] = npcMap.get(npcId)
      }
    }
  }

  /**
   * 결과 파일 저장
   */
  private static async saveResultFile(data: any[], outputPath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Merged Dialogue')

    // 헤더 추가
    const headers = Object.keys(data[0])
    const headerRow = worksheet.addRow(headers)
    
    // 헤더 스타일 적용
    headerRow.eachCell((cell) => {
      cell.font = { 
        name: '맑은 고딕',
        size: 12,
        bold: true,
        color: { argb: 'FF9C5700' }
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFEB9C' }
      }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // 데이터 추가
    for (const row of data) {
      const values = headers.map(header => row[header])
      const dataRow = worksheet.addRow(values)
      
      // 데이터 행 스타일 적용
      dataRow.eachCell((cell) => {
        cell.font = {
          name: '맑은 고딕',
          size: 10
        }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    }

    // 열 너비 자동 조정
    worksheet.columns.forEach((column, index) => {
      let maxLength = 10
      column.eachCell!({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10
        if (columnLength > maxLength) {
          maxLength = columnLength
        }
      })
      column.width = Math.min(maxLength + 2, 50)
    })

    // 틀 고정
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]

    // 파일 저장
    await workbook.xlsx.writeFile(outputPath)
  }

  /**
   * 파일 존재 여부 확인
   */
  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }
}