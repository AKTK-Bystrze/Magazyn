export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  time: string;
  level: LogLevel;
  msg: string;
  username?: string;
  trace_id?: string;
  [key: string]: any;
}

export class StructuredLogger {
  private baseContext: Record<string, any>;

  constructor(context: Record<string, any> = {}) {
    this.baseContext = context;
  }

  // Clones logger with additional context
  with(context: Record<string, any>): StructuredLogger {
    return new StructuredLogger({ ...this.baseContext, ...context });
  }

  private log(level: LogLevel, msg: string, data?: Record<string, any>) {
    const isServer = typeof window === "undefined";

    const entry: LogEntry = {
      time: new Date().toISOString(),
      level,
      msg,
      username: this.baseContext.username || undefined,
      trace_id: this.baseContext.trace_id || "unknown",
      ...this.baseContext,
      ...data,
    };

    // Make sure these are strictly typed or omitted if empty
    if (!entry.username) delete entry.username;
    if (!entry.trace_id) entry.trace_id = "unknown";

    const output = JSON.stringify(entry);

    if (isServer) {
      if (level === "ERROR") {
        console.error(output);
      } else if (level === "WARN") {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      console.log(output);
    }
  }

  info(msg: string, data?: Record<string, any>) {
    this.log("INFO", msg, data);
  }
  debug(msg: string, data?: Record<string, any>) {
    this.log("DEBUG", msg, data);
  }
  warn(msg: string, data?: Record<string, any>) {
    this.log("WARN", msg, data);
  }
  error(msg: string, data?: Record<string, any>) {
    this.log("ERROR", msg, data);
  }
}

export const defaultLogger = new StructuredLogger();
