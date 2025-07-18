/**
 * Error Dialog Types
 * Shared between main and renderer processes
 */

export interface ErrorDialogData {
  title: string
  message: string
  error?: Error
  details?: string
  stack?: string
  timestamp?: number
  severity?: 'low' | 'medium' | 'high' | 'critical'
}