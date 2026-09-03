import { defaultLogger as logger } from "@/lib/utils/logger";
// Define a type for error details to avoid 'any'
export type ErrorDetails = Record<string, unknown> | unknown;

export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public code: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function handleApiError(error: unknown): Response {
  logger.error("API Error:", { error });

  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        code: error.code,
        details: error.details,
      }),
      {
        status: error.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Handle generic errors
  return new Response(
    JSON.stringify({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// Error Factories
export const ApiErrors = {
  badRequest: (message: string, details?: ErrorDetails) =>
    new ApiError(message, 400, "BAD_REQUEST", details),

  unauthorized: (message: string = "Unauthorized") => new ApiError(message, 401, "UNAUTHORIZED"),

  forbidden: (message: string = "Forbidden") => new ApiError(message, 403, "FORBIDDEN"),

  notFound: (resource: string) => new ApiError(`${resource} not found`, 404, "NOT_FOUND"),

  conflict: (message: string, details?: ErrorDetails) =>
    new ApiError(message, 409, "CONFLICT", details),

  internal: (message: string = "Internal server error") =>
    new ApiError(message, 500, "INTERNAL_ERROR"),
};
