/**
 * Structured Logging Utility
 * 
 * Logs all agent invocations, results, errors, and performance metrics
 * Requirements: 6.4
 */

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  service: string
  message: string
  data?: Record<string, unknown>
  duration?: number // milliseconds
  error?: {
    code: string
    message: string
    stack?: string
  }
}

export interface PerformanceMetrics {
  stage: 'parsing' | 'extraction' | 'generation' | 'verification' | 'orchestration'
  duration: number // milliseconds
  retries?: number
  success: boolean
}

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString()
  }

  private formatLog(entry: LogEntry): string {
    const logObj = {
      ...entry,
      timestamp: entry.timestamp || this.formatTimestamp()
    }
    return JSON.stringify(logObj)
  }

  /**
   * Log agent invocation
   */
  logAgentInvocation(
    agent: string,
    input: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'info',
      service: agent,
      message: 'Agent invocation',
      data: {
        input,
        ...metadata
      }
    }
    console.log(this.formatLog(entry))
  }

  /**
   * Log extraction results
   */
  logExtractionResult(
    flowsCount: number,
    confidence: number,
    metadata?: Record<string, unknown>,
    duration?: number
  ): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'info',
      service: 'extraction',
      message: 'Extraction completed',
      data: {
        flowsCount,
        confidence,
        ...metadata
      },
      duration
    }
    console.log(this.formatLog(entry))
  }

  /**
   * Log generation result
   */
  logGenerationResult(
    success: boolean,
    metadata?: Record<string, unknown>,
    duration?: number
  ): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: success ? 'info' : 'warn',
      service: 'generation',
      message: success ? 'Generation completed' : 'Generation failed',
      data: metadata,
      duration
    }
    console.log(this.formatLog(entry))
  }

  /**
   * Log verification results
   */
  logVerificationResult(
    verified: boolean,
    accuracy: number,
    discrepancies: Array<{ flow: string; percentageError: number }>,
    reasoning: string,
    duration?: number
  ): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: verified ? 'info' : 'warn',
      service: 'verification',
      message: verified ? 'Verification passed' : 'Verification failed',
      data: {
        verified,
        accuracy,
        discrepanciesCount: discrepancies.length,
        discrepancies: discrepancies.slice(0, 10), // Limit to first 10 for readability
        reasoning
      },
      duration
    }
    console.log(this.formatLog(entry))
  }

  /**
   * Log performance metrics
   */
  logPerformance(metrics: PerformanceMetrics): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'info',
      service: 'performance',
      message: `Stage: ${metrics.stage}`,
      data: {
        stage: metrics.stage,
        duration: metrics.duration,
        retries: metrics.retries,
        success: metrics.success
      },
      duration: metrics.duration
    }
    console.log(this.formatLog(entry))
  }

  /**
   * Log error with full context
   */
  logError(
    service: string,
    error: Error | { code: string; message: string },
    context?: Record<string, unknown>
  ): void {
    const errorData = error instanceof Error
      ? {
          code: 'UNKNOWN_ERROR',
          message: error.message,
          stack: error.stack
        }
      : {
          code: error.code,
          message: error.message
        }

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'error',
      service,
      message: 'Error occurred',
      error: errorData,
      data: context
    }
    console.error(this.formatLog(entry))
  }

  /**
   * Log API call latency
   */
  logApiCall(
    api: string,
    method: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: statusCode >= 400 ? 'warn' : 'info',
      service: 'api',
      message: `API call: ${method} ${api}`,
      data: {
        api,
        method,
        statusCode,
        ...metadata
      },
      duration
    }
    console.log(this.formatLog(entry))
  }

  /**
   * Log retry attempt
   */
  logRetry(
    service: string,
    attempt: number,
    maxRetries: number,
    reason?: string
  ): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'warn',
      service,
      message: `Retry attempt ${attempt}/${maxRetries}`,
      data: {
        attempt,
        maxRetries,
        reason
      }
    }
    console.warn(this.formatLog(entry))
  }

  /**
   * Log debug information
   */
  logDebug(
    service: string,
    message: string,
    data?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'debug',
      service,
      message,
      data
    }
    console.debug(this.formatLog(entry))
  }
}

// Export singleton instance
export const logger = new Logger()

