import { defaultLogger as logger } from "@/lib/utils/logger";

class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public code: string,
    public details?: unknown
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

export const ApiErrors = {
  unauthorized: (message: string = "Unauthorized") => new ApiError(message, 401, "UNAUTHORIZED"),
  forbidden: (message: string = "Forbidden") => new ApiError(message, 403, "FORBIDDEN"),
};
