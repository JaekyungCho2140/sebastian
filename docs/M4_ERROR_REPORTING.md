# M4 Error Reporting System Documentation

## Overview
Sebastian v0.3.0 introduces a comprehensive error reporting system for M4 Excel processing operations. This system integrates with Sebastian's existing error infrastructure while providing M4-specific features.

## Architecture

### Components

1. **M4ErrorReporter** - Main error reporting service for M4 operations
2. **RemoteErrorReporter** - Handles remote error transmission with batching and retry logic  
3. **M4ErrorIntegrationService** - Converts M4 errors to Sebastian's error format
4. **LocalErrorReporter** - Existing local error storage system

### Error Flow

```
M4 Processing Error → M4ErrorReporter → {
  → LocalErrorReporter → Local JSON files
  → RemoteErrorReporter → Remote endpoint (if enabled)
}
```

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Enable remote error reporting
SEBASTIAN_ERROR_REPORTING_ENABLED=true

# Remote error endpoint URL
SEBASTIAN_ERROR_ENDPOINT=https://your-error-service.com/api/errors

# API key for authentication
SEBASTIAN_API_KEY=your-api-key-here

# Enable M4-specific remote reporting
M4_REMOTE_ERROR_REPORTING=true
```

### Programmatic Configuration

```typescript
// Update M4 error reporter config at runtime
m4ErrorReporter.updateConfig({
  enableRemoteReporting: true,
  separateM4Logs: true,
  maxM4Files: 200,
  maxM4Age: 90, // days
  logRotationEnabled: true
});

// Update remote reporter config
remoteReporter.updateConfig({
  enabled: true,
  batchSize: 20,
  batchInterval: 10000, // 10 seconds
  maxRetries: 5
});
```

## Error Types

### M4-Specific Error Types

- `m4-excel-parse` - Excel file parsing errors
- `m4-worker-thread` - Worker thread communication failures
- `m4-file-io` - File system operation errors
- `m4-data-validation` - Data format validation errors
- `m4-process-type` - Process type specific errors (dialogue/string)

### Error Severity Levels

- `low` - Minor issues that don't block processing
- `medium` - Issues that may affect output quality
- `high` - Significant errors requiring attention
- `critical` - Fatal errors that stop processing

## Features

### Local Error Storage

- **Separate M4 Logs**: M4 errors stored in `userData/error-reports/m4-errors/`
- **File Format**: `m4-error-{timestamp}-{id}.json`
- **Retention**: 90 days (configurable)
- **Max Files**: 200 (configurable)
- **Auto Rotation**: Daily cleanup of old files

### Remote Error Reporting

- **Batching**: Errors batched for efficient transmission
- **Retry Logic**: Exponential backoff for failed transmissions
- **Offline Support**: Errors queued when offline
- **Data Masking**: Sensitive information automatically masked
- **Network Monitoring**: Auto-detects connectivity changes

### Error Context

Each M4 error includes:

```typescript
interface M4Context {
  processType: 'dialogue' | 'string';
  stage: M4ProcessStep;
  fileName?: string;
  sheetName?: string;
  rowNumber?: number;
  columnNumber?: number;
  workerId?: string;
  inputFolder?: string;
  outputFolder?: string;
  processingTime?: number;
  itemsProcessed?: number;
  totalItems?: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}
```

## IPC Channels

### Report M4 Error
```typescript
// Renderer → Main
window.m4ErrorReporting.reportError({
  error: serializedError,
  context: m4Context
});
```

### Update Error Context
```typescript
// Renderer → Main
window.m4ErrorReporting.updateContext({
  workerId: 'worker-123',
  stage: 'DATA_PROCESSING',
  itemsProcessed: 50,
  totalItems: 100
});
```

### Get Error Statistics
```typescript
// Renderer → Main
const stats = await window.m4ErrorReporting.getStats();
// Returns: { totalErrors, errorsByType, errorsBySeverity, recentErrors, diskUsage }
```

### Export Error Logs
```typescript
// Renderer → Main
const result = await window.m4ErrorReporting.exportLogs('/path/to/export');
// Returns: { success, fileCount }
```

## Usage Examples

### Basic Error Reporting

```typescript
try {
  // M4 processing code
} catch (error) {
  const m4Error = new M4ProcessingError(
    M4ErrorType.EXCEL_PARSE,
    'Failed to parse Excel file',
    'high',
    error
  );
  
  await m4ErrorReporter.reportM4Error(m4Error, {
    processType: 'dialogue',
    stage: M4ProcessStep.FILE_READING,
    fileName: 'input.xlsx',
    sheetName: 'Sheet1'
  });
}
```

### Worker Thread Error Reporting

```typescript
// In worker thread
parentPort.postMessage({
  type: 'm4-error',
  error: M4ProcessingError.serialize(error),
  context: {
    workerId: threadId,
    stage: M4ProcessStep.DATA_PROCESSING,
    rowNumber: 150
  }
});

// In main thread
worker.on('message', async (message) => {
  if (message.type === 'm4-error') {
    await m4ErrorReporter.reportSerializedM4Error(
      message.error,
      message.context
    );
  }
});
```

### Adding Breadcrumbs

```typescript
// Track processing steps
m4ErrorReporter.addBreadcrumb(
  'file-processing',
  'Starting Excel file parsing',
  'info',
  { fileName: 'dialogue.xlsx', size: 1024000 }
);

// Breadcrumbs automatically included in error reports
```

## Error Recovery

### Automatic Retry for Remote Reporting

- Failed remote transmissions automatically retry with exponential backoff
- Maximum 3 retries by default (configurable)
- Errors queued during offline periods
- Automatic flush when connection restored

### Manual Error Export

```typescript
// Export all M4 error logs
const exportPath = await dialog.showSaveDialog({
  defaultPath: 'sebastian-m4-errors.json'
});

if (exportPath) {
  const result = await m4ErrorReporter.exportM4ErrorLogs(exportPath.filePath);
  console.log(`Exported ${result.fileCount} error logs`);
}
```

## Security Considerations

### Data Masking

The following information is automatically masked:

- User home directory paths
- Email addresses
- Phone numbers
- Personal identifiers

### API Key Security

- Store API keys in environment variables
- Never commit `.env` files to version control
- Use secure HTTPS endpoints only
- Rotate API keys regularly

## Monitoring

### Error Statistics Dashboard

Access error statistics through the developer panel:

```javascript
// In DevTools console
__sebastian_dev.getM4ErrorStats()
```

### Log Files Location

- **Windows**: `%APPDATA%/Sebastian/error-reports/m4-errors/`
- **macOS**: `~/Library/Application Support/Sebastian/error-reports/m4-errors/`
- **Linux**: `~/.config/Sebastian/error-reports/m4-errors/`

## Troubleshooting

### Common Issues

1. **Errors not being sent remotely**
   - Check environment variables are set correctly
   - Verify network connectivity
   - Check API key validity
   - Review error logs for transmission failures

2. **Local storage full**
   - M4 error logs auto-rotate after 90 days
   - Manual cleanup: `m4ErrorReporter.clearM4ErrorLogs()`
   - Adjust retention settings if needed

3. **High memory usage**
   - Reduce batch size for remote reporting
   - Enable performance mode for large datasets
   - Clear old error logs regularly

### Debug Mode

Enable debug logging for error reporting:

```typescript
// In main process
process.env.LOG_LEVEL = 'debug';

// Check logs for detailed error reporting info
```

## Future Enhancements

- Real-time error monitoring dashboard
- Error pattern analysis and alerts
- Integration with external monitoring services
- Automated error report generation
- Error deduplication and grouping