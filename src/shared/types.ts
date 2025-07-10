// Shared types between main and renderer processes

export interface AppState {
  version: string
  isUpdateAvailable: boolean
  lastUpdateCheck: number
  userPreferences: {
    theme: 'light' | 'dark'
    language: 'ko' | 'en'
  }
}

export interface UpdateInfo {
  version: string
  releaseDate: string
  downloadUrl: string
  changelog: string
}

// IPC Channel constants
export const IPC_CHANNELS = {
  GET_VERSION: 'get-version',
  SHOW_SUCCESS_DIALOG: 'show-success-dialog',
  CHECK_FOR_UPDATES: 'check-for-updates',
  GET_APP_STATE: 'get-app-state',
  SET_APP_STATE: 'set-app-state',
  MINIMIZE_WINDOW: 'minimize-window',
  CLOSE_WINDOW: 'close-window',
  UPDATE_AVAILABLE: 'update-available',
  UPDATE_DOWNLOADED: 'update-downloaded'
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]

// Request/Response types for each IPC channel
export interface IpcRequests {
  [IPC_CHANNELS.GET_VERSION]: void
  [IPC_CHANNELS.SHOW_SUCCESS_DIALOG]: void
  [IPC_CHANNELS.CHECK_FOR_UPDATES]: void
  [IPC_CHANNELS.GET_APP_STATE]: void
  [IPC_CHANNELS.SET_APP_STATE]: Partial<AppState>
  [IPC_CHANNELS.MINIMIZE_WINDOW]: void
  [IPC_CHANNELS.CLOSE_WINDOW]: void
}

export interface IpcResponses {
  [IPC_CHANNELS.GET_VERSION]: string
  [IPC_CHANNELS.SHOW_SUCCESS_DIALOG]: void
  [IPC_CHANNELS.CHECK_FOR_UPDATES]: UpdateInfo | null
  [IPC_CHANNELS.GET_APP_STATE]: AppState
  [IPC_CHANNELS.SET_APP_STATE]: void
  [IPC_CHANNELS.MINIMIZE_WINDOW]: void
  [IPC_CHANNELS.CLOSE_WINDOW]: void
}

// Events that can be sent from main to renderer
export interface IpcEvents {
  [IPC_CHANNELS.UPDATE_AVAILABLE]: UpdateInfo
  [IPC_CHANNELS.UPDATE_DOWNLOADED]: void
}

// Error types for IPC communication
export class IpcError extends Error {
  constructor(
    message: string,
    public code: string,
    public channel?: string
  ) {
    super(message)
    this.name = 'IpcError'
  }
}

export interface IpcErrorResponse {
  error: true
  message: string
  code: string
  channel?: string
}