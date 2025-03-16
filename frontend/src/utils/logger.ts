type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerConfig {
  level: LogLevel;
  enabled: boolean;
}

class Logger {
  private static instance: Logger;
  private config: LoggerConfig = {
    level: process.env.NODE_ENV === "production" ? "error" : "debug",
    enabled: process.env.NODE_ENV !== "production",
  };

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return (
      this.config.enabled &&
      this.levelPriority[level] >= this.levelPriority[this.config.level]
    );
  }

  setConfig(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
  }

  debug(context: string, message: string, ...args: any[]) {
    if (this.shouldLog("debug")) {
      console.debug(`[${context}] ${message}`, ...args);
    }
  }

  info(context: string, message: string, ...args: any[]) {
    if (this.shouldLog("info")) {
      console.info(`[${context}] ${message}`, ...args);
    }
  }

  warn(context: string, message: string, ...args: any[]) {
    if (this.shouldLog("warn")) {
      console.warn(`[${context}] ${message}`, ...args);
    }
  }

  error(context: string, message: string, ...args: any[]) {
    if (this.shouldLog("error")) {
      console.error(`[${context}] ${message}`, ...args);
    }
  }
}

export const logger = Logger.getInstance();
