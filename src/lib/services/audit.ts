/**
 * Audit Logging Service for RxMatch
 * Task 11: Comprehensive audit logging and metrics collection
 *
 * This service provides centralized audit logging for all prescription processing activities.
 * It uses the calculation_audits table for comprehensive tracking.
 *
 * PHI Handling: Prescription text contains PHI and must be handled per HIPAA requirements.
 */

import {
  createCalculationAudit,
  updateCalculationAuditStatus,
  type NewCalculationAudit,
  type CalculationAudit
} from '$lib/db/services/calculationAudits';
import type { PrescriptionParse } from '$lib/types/prescription';
import type { NDCPackage } from '$lib/types/medication';

/**
 * Audit Event Types
 */
export enum AuditEventType {
  PRESCRIPTION_SUBMITTED = 'prescription_submitted',
  PRESCRIPTION_PARSED = 'prescription_parsed',
  RXNORM_LOOKUP = 'rxnorm_lookup',
  FDA_NDC_SEARCH = 'fda_ndc_search',
  PACKAGE_SELECTED = 'package_selected',
  EXPORT_ACTION = 'export_action',
  PARSING_ERROR = 'parsing_error',
  API_ERROR = 'api_error',
  VALIDATION_WARNING = 'validation_warning'
}

/**
 * Audit Event Data Structures
 */
export interface AuditEventData {
  eventType: AuditEventType;
  prescriptionText?: string;
  parsedResult?: PrescriptionParse;
  confidenceScore?: number;
  rxcui?: string;
  ndcCodes?: string[];
  selectedPackages?: NDCPackage[];
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Audit Context - Additional context for logging
 */
export interface AuditContext {
  userId?: string | null;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  processingTime?: number;
}

/**
 * Result of audit logging operation
 */
export interface AuditLogResult {
  success: boolean;
  auditId?: string;
  error?: string;
}

/**
 * Audit Service Class
 * Provides centralized audit logging with retry logic and error handling
 */
export class AuditService {
  private retryAttempts = 3;
  private retryDelay = 1000; // ms

  /**
   * Log a prescription submission event
   */
  async logPrescriptionSubmission(
    prescriptionText: string,
    context: AuditContext = {}
  ): Promise<AuditLogResult> {
    return this.logEvent({
      eventType: AuditEventType.PRESCRIPTION_SUBMITTED,
      prescriptionText,
      metadata: {
        timestamp: new Date().toISOString(),
        ...context
      }
    }, context);
  }

  /**
   * Log a prescription parsing completion event
   */
  async logPrescriptionParsed(
    prescriptionText: string,
    parsedResult: PrescriptionParse,
    processingTime: number,
    context: AuditContext = {}
  ): Promise<AuditLogResult> {
    return this.logEvent({
      eventType: AuditEventType.PRESCRIPTION_PARSED,
      prescriptionText,
      parsedResult,
      confidenceScore: parsedResult.confidence,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime,
        ...context
      }
    }, { ...context, processingTime });
  }

  /**
   * Log an RxNorm lookup event
   */
  async logRxNormLookup(
    prescriptionText: string,
    rxcui: string | null,
    drugName: string,
    processingTime: number,
    context: AuditContext = {}
  ): Promise<AuditLogResult> {
    return this.logEvent({
      eventType: AuditEventType.RXNORM_LOOKUP,
      prescriptionText,
      rxcui: rxcui || undefined,
      metadata: {
        timestamp: new Date().toISOString(),
        drugName,
        processingTime,
        success: !!rxcui,
        ...context
      }
    }, { ...context, processingTime });
  }

  /**
   * Log an FDA NDC search event
   */
  async logFDANDCSearch(
    prescriptionText: string,
    rxcui: string | null,
    ndcCodes: string[],
    processingTime: number,
    context: AuditContext = {}
  ): Promise<AuditLogResult> {
    return this.logEvent({
      eventType: AuditEventType.FDA_NDC_SEARCH,
      prescriptionText,
      rxcui: rxcui || undefined,
      ndcCodes,
      metadata: {
        timestamp: new Date().toISOString(),
        ndcCount: ndcCodes.length,
        processingTime,
        ...context
      }
    }, { ...context, processingTime });
  }

  /**
   * Log a package selection event
   */
  async logPackageSelection(
    prescriptionText: string,
    selectedPackages: NDCPackage[],
    context: AuditContext = {}
  ): Promise<AuditLogResult> {
    return this.logEvent({
      eventType: AuditEventType.PACKAGE_SELECTED,
      prescriptionText,
      selectedPackages,
      metadata: {
        timestamp: new Date().toISOString(),
        packageCount: selectedPackages.length,
        ndcs: selectedPackages.map(pkg => pkg.ndc),
        ...context
      }
    }, context);
  }

  /**
   * Log an export action event
   */
  async logExportAction(
    prescriptionText: string,
    exportFormat: string,
    selectedPackages: NDCPackage[],
    context: AuditContext = {}
  ): Promise<AuditLogResult> {
    return this.logEvent({
      eventType: AuditEventType.EXPORT_ACTION,
      prescriptionText,
      selectedPackages,
      metadata: {
        timestamp: new Date().toISOString(),
        exportFormat,
        packageCount: selectedPackages.length,
        ...context
      }
    }, context);
  }

  /**
   * Log a parsing error event
   */
  async logParsingError(
    prescriptionText: string,
    error: Error,
    context: AuditContext = {}
  ): Promise<AuditLogResult> {
    return this.logEvent({
      eventType: AuditEventType.PARSING_ERROR,
      prescriptionText,
      error: {
        message: error.message,
        code: (error as any).code,
        stack: error.stack
      },
      metadata: {
        timestamp: new Date().toISOString(),
        errorName: error.name,
        ...context
      }
    }, context);
  }

  /**
   * Log an API error event
   */
  async logAPIError(
    apiName: string,
    prescriptionText: string,
    error: Error,
    context: AuditContext = {}
  ): Promise<AuditLogResult> {
    return this.logEvent({
      eventType: AuditEventType.API_ERROR,
      prescriptionText,
      error: {
        message: error.message,
        code: (error as any).code
      },
      metadata: {
        timestamp: new Date().toISOString(),
        apiName,
        errorName: error.name,
        ...context
      }
    }, context);
  }

  /**
   * Log a validation warning event
   */
  async logValidationWarning(
    prescriptionText: string,
    warningMessage: string,
    context: AuditContext = {}
  ): Promise<AuditLogResult> {
    return this.logEvent({
      eventType: AuditEventType.VALIDATION_WARNING,
      prescriptionText,
      metadata: {
        timestamp: new Date().toISOString(),
        warning: warningMessage,
        ...context
      }
    }, context);
  }

  /**
   * Core logging function with retry logic
   * Logs events to the calculation_audits table
   */
  private async logEvent(
    eventData: AuditEventData,
    context: AuditContext = {}
  ): Promise<AuditLogResult> {
    const startTime = Date.now();

    // Prepare audit record
    const auditRecord: NewCalculationAudit = {
      userId: context.userId || null,
      prescriptionText: eventData.prescriptionText || '',
      parsedResult: eventData.parsedResult ? this.sanitizeJSON(eventData.parsedResult) : null,
      confidenceScore: eventData.confidenceScore || null,
      selectedPackages: eventData.selectedPackages ? this.sanitizeJSON(eventData.selectedPackages) : null,
      status: this.determineStatus(eventData),
      rxcui: eventData.rxcui || null,
      ndcCodes: eventData.ndcCodes ? this.sanitizeJSON(eventData.ndcCodes) : null,
      processingTime: context.processingTime || null
    };

    // Attempt to log with retry logic
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const audit = await createCalculationAudit(auditRecord);

        const logDuration = Date.now() - startTime;

        // Log to console for debugging (remove sensitive data)
        console.log(`[Audit] ${eventData.eventType} logged successfully`, {
          auditId: audit.id,
          duration: logDuration,
          attempt,
          userId: context.userId || 'anonymous'
        });

        return {
          success: true,
          auditId: audit.id
        };
      } catch (error) {
        const isLastAttempt = attempt === this.retryAttempts;

        console.error(`[Audit] Failed to log ${eventData.eventType} (attempt ${attempt}/${this.retryAttempts})`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          eventType: eventData.eventType
        });

        if (isLastAttempt) {
          // On final failure, return error but don't throw (graceful degradation)
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown logging error'
          };
        }

        // Wait before retry (exponential backoff)
        await this.sleep(this.retryDelay * attempt);
      }
    }

    // Should never reach here, but TypeScript requires it
    return {
      success: false,
      error: 'Maximum retry attempts exceeded'
    };
  }

  /**
   * Determine audit status based on event data
   */
  private determineStatus(eventData: AuditEventData): 'pending' | 'approved' | 'rejected' {
    // Error events are marked as rejected
    if (eventData.eventType === AuditEventType.PARSING_ERROR ||
        eventData.eventType === AuditEventType.API_ERROR) {
      return 'rejected';
    }

    // Low confidence scores require review (pending)
    if (eventData.confidenceScore !== undefined && eventData.confidenceScore < 0.8) {
      return 'pending';
    }

    // Package selection events are approved
    if (eventData.eventType === AuditEventType.PACKAGE_SELECTED ||
        eventData.eventType === AuditEventType.EXPORT_ACTION) {
      return 'approved';
    }

    // Default to pending for review
    return 'pending';
  }

  /**
   * Sanitize JSON data for JSONB storage
   * Removes undefined values and ensures valid JSON
   */
  private sanitizeJSON(data: any): any {
    if (data === null || data === undefined) {
      return null;
    }

    // Convert to JSON and back to remove undefined values
    try {
      return JSON.parse(JSON.stringify(data));
    } catch (error) {
      console.error('[Audit] Failed to sanitize JSON data', error);
      return null;
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update audit status (for manual review workflows)
   */
  async updateAuditStatus(
    auditId: string,
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<AuditLogResult> {
    try {
      await updateCalculationAuditStatus(auditId, status);
      return {
        success: true,
        auditId
      };
    } catch (error) {
      console.error('[Audit] Failed to update audit status', {
        auditId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown status update error'
      };
    }
  }
}

// Singleton instance
let auditService: AuditService | null = null;

/**
 * Get the audit service singleton instance
 */
export function getAuditService(): AuditService {
  if (!auditService) {
    auditService = new AuditService();
  }
  return auditService;
}

/**
 * Convenience wrapper functions for common logging scenarios
 */

/**
 * Log a complete prescription processing flow
 * This is a high-level function that logs the entire flow atomically
 */
export async function logPrescriptionFlow(
  prescriptionText: string,
  parsedResult: PrescriptionParse,
  rxcui: string | null,
  ndcCodes: string[],
  processingTime: number,
  context: AuditContext = {}
): Promise<AuditLogResult> {
  const service = getAuditService();

  // Log the complete flow as a single audit entry
  const auditRecord: NewCalculationAudit = {
    userId: context.userId || null,
    prescriptionText,
    parsedResult: service['sanitizeJSON'](parsedResult),
    confidenceScore: parsedResult.confidence,
    rxcui: rxcui || null,
    ndcCodes: service['sanitizeJSON'](ndcCodes),
    status: parsedResult.confidence < 0.8 ? 'pending' : 'approved',
    processingTime
  };

  try {
    const audit = await createCalculationAudit(auditRecord);
    return {
      success: true,
      auditId: audit.id
    };
  } catch (error) {
    console.error('[Audit] Failed to log prescription flow', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Log with automatic error handling
 * Wraps any async function with audit logging
 */
export async function withAuditLogging<T>(
  fn: () => Promise<T>,
  eventType: AuditEventType,
  prescriptionText: string,
  context: AuditContext = {}
): Promise<T> {
  const service = getAuditService();
  const startTime = Date.now();

  try {
    const result = await fn();
    const processingTime = Date.now() - startTime;

    // Log success
    await service.logEvent({
      eventType,
      prescriptionText,
      metadata: {
        processingTime,
        success: true
      }
    }, { ...context, processingTime });

    return result;
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Log error
    await service.logAPIError(
      eventType,
      prescriptionText,
      error instanceof Error ? error : new Error('Unknown error'),
      { ...context, processingTime }
    );

    // Re-throw the error
    throw error;
  }
}
