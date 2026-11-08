import { z } from 'zod';
import { logger } from '../../backend/src/utils/logger.js';

/**
 * Creates a validated IPC handler wrapped with Zod schema verification and uniform error envelope.
 * 
 * @param {string} channelName 
 * @param {z.ZodSchema} schema 
 * @param {Function} handlerFn 
 * @returns {Function} wrapped IPC handler
 */
export function createValidatedHandler(channelName, schema, handlerFn) {
  return async (event, requestEnvelope) => {
    const requestId = requestEnvelope?.requestId || 'req_' + Date.now();
    const timestamp = Date.now();

    try {
      // 1. Validate envelope structure
      if (!requestEnvelope || typeof requestEnvelope !== 'object') {
        throw new Error('Invalid IPC request format: payload envelope must be an object');
      }

      // 2. Validate payload data using Zod schema if provided
      let validatedPayload = requestEnvelope.payload;
      if (schema) {
        const parseResult = schema.safeParse(requestEnvelope.payload);
        if (!parseResult.success) {
          logger.warn(`IPC Validation Error [${channelName}]:`, {
            errors: parseResult.error.errors,
            requestId
          });
          return {
            success: false,
            requestId,
            timestamp,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request payload parameters',
              details: parseResult.error.flatten().fieldErrors
            }
          };
        }
        validatedPayload = parseResult.data;
      }

      // 3. Execute core handler
      const result = await handlerFn(validatedPayload, event);

      return {
        success: true,
        data: result,
        requestId,
        timestamp
      };
    } catch (err) {
      logger.error(`IPC Handler Error [${channelName}]:`, {
        error: err.message,
        stack: err.stack,
        requestId
      });

      return {
        success: false,
        requestId,
        timestamp,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'An unexpected internal error occurred'
        }
      };
    }
  };
}
