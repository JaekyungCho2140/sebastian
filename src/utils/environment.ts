/**
 * Environment detection utilities
 */

/**
 * Check if code is running in renderer process
 */
export function isRenderer(): boolean {
  // Check for window object and renderer-specific properties
  return typeof process !== 'undefined' && 
         process.type === 'renderer' &&
         typeof (globalThis as any).window !== 'undefined';
}

/**
 * Check if code is running in main process
 */
export function isMain(): boolean {
  return typeof process !== 'undefined' && 
         process.type === 'browser';
}

/**
 * Check if code is running in worker thread
 */
export function isWorker(): boolean {
  return typeof process !== 'undefined' && 
         typeof (globalThis as any).window === 'undefined' &&
         process.type !== 'browser';
}

/**
 * Get window object safely
 */
export function getWindow(): any {
  if (isRenderer()) {
    return (globalThis as any).window;
  }
  return undefined;
}

/**
 * Get document object safely
 */
export function getDocument(): any {
  if (isRenderer()) {
    return (globalThis as any).window?.document;
  }
  return undefined;
}

/**
 * Get navigator object safely
 */
export function getNavigator(): any {
  if (isRenderer()) {
    return (globalThis as any).window?.navigator;
  }
  return undefined;
}