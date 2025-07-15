#!/usr/bin/env node

/**
 * Test utility functions for Sebastian tests
 */

/**
 * Mock createErrorDialogData function for testing
 */
function createErrorDialogData(error, title, message, severity) {
  return {
    title: title || 'An unexpected error occurred',
    message: message || 'An error occurred in the application',
    error,
    stack: error.stack,
    timestamp: Date.now(),
    severity: severity || 'medium',
    details: error.message + '\n\n' + (error.stack || 'No stack trace available'),
    errorType: 'javascript',
    context: {
      url: 'test://localhost',
      userAgent: 'Test Agent',
      timestamp: new Date().toISOString(),
      errorBoundary: false
    }
  };
}

/**
 * Validate error severity
 */
function validateSeverity(severity) {
  return ['low', 'medium', 'high', 'critical'].includes(severity);
}

/**
 * Classify error type
 */
function classifyError(error) {
  if (error.name === 'TypeError') return 'type-error';
  if (error.name === 'ReferenceError') return 'reference-error';
  if (error.name === 'SyntaxError') return 'syntax-error';
  if (error.message.includes('Promise')) return 'promise-error';
  if (error.message.includes('React')) return 'react-error';
  return 'javascript-error';
}

module.exports = {
  createErrorDialogData,
  validateSeverity,
  classifyError
};