import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  context?: any;
  stack?: string;
  file?: string;
  line?: number;
  suggestion?: string;
  category?: string;
  requestId?: string;
  userId?: string;
  performance?: {
    duration?: number;
    memory?: number;
    cpu?: number;
  };
}

interface ErrorPattern {
  pattern: RegExp;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
  autoFix?: () => Promise<void>;
}

class AdvancedLogger extends EventEmitter {
  private static instance: AdvancedLogger;
  private logQueue: LogEntry[] = [];
  private errorPatterns: ErrorPattern[] = [];
  private performanceBaseline: Map<string, number[]> = new Map();
  private errorFrequency: Map<string, number> = new Map();
  private logFilePath: string;
  private metricsFilePath: string;
  private isProduction: boolean;

  private constructor() {
    super();
    this.logFilePath = path.join(process.cwd(), 'logs', 'app.log');
    this.metricsFilePath = path.join(process.cwd(), 'logs', 'metrics.log');
    this.isProduction = process.env.NODE_ENV === 'production';
    this.initializeErrorPatterns();
    this.startQueueProcessor();
    this.startMetricsCollector();
  }

  static getInstance(): AdvancedLogger {
    if (!AdvancedLogger.instance) {
      AdvancedLogger.instance = new AdvancedLogger();
    }
    return AdvancedLogger.instance;
  }

  private initializeErrorPatterns() {
    this.errorPatterns = [
      // Database errors
      {
        pattern: /ECONNREFUSED.*5432/i,
        category: 'Database Connection',
        severity: 'critical',
        suggestion: 'PostgreSQL is not running. Start it with: sudo service postgresql start'
      },
      {
        pattern: /duplicate key value violates unique constraint/i,
        category: 'Database Constraint',
        severity: 'medium',
        suggestion: 'Duplicate entry detected. Check for existing records before inserting.'
      },
      {
        pattern: /relation ".*" does not exist/i,
        category: 'Database Schema',
        severity: 'high',
        suggestion: 'Missing database table. Run migrations: npm run db:push'
      },
      
      // API errors
      {
        pattern: /401.*API.*key/i,
        category: 'API Authentication',
        severity: 'high',
        suggestion: 'Invalid API key. Check your .env file and ensure OPENAI_API_KEY is valid.'
      },
      {
        pattern: /429.*rate.*limit/i,
        category: 'Rate Limiting',
        severity: 'medium',
        suggestion: 'API rate limit exceeded. Implement exponential backoff or upgrade your plan.'
      },
      {
        pattern: /EADDRINUSE.*(\d+)/i,
        category: 'Port Conflict',
        severity: 'high',
        suggestion: 'Port already in use. Kill the process: lsof -ti:PORT | xargs kill -9'
      },
      
      // Memory/Performance
      {
        pattern: /JavaScript heap out of memory/i,
        category: 'Memory Leak',
        severity: 'critical',
        suggestion: 'Memory leak detected. Check for circular references and unfreed resources.'
      },
      {
        pattern: /Maximum call stack size exceeded/i,
        category: 'Stack Overflow',
        severity: 'high',
        suggestion: 'Infinite recursion detected. Check for recursive function calls without base case.'
      },
      
      // File system
      {
        pattern: /ENOENT.*no such file or directory/i,
        category: 'File System',
        severity: 'medium',
        suggestion: 'File not found. Check file path and ensure file exists.'
      },
      {
        pattern: /EACCES.*permission denied/i,
        category: 'Permissions',
        severity: 'high',
        suggestion: 'Permission denied. Check file permissions or run with appropriate privileges.'
      },
      
      // Authentication
      {
        pattern: /invalid.*token|jwt.*expired/i,
        category: 'Authentication',
        severity: 'medium',
        suggestion: 'Authentication token invalid or expired. User needs to re-login.'
      },
      {
        pattern: /unauthorized|forbidden/i,
        category: 'Authorization',
        severity: 'low',
        suggestion: 'User lacks required permissions. Check user roles and permissions.'
      },
      
      // OpenAI specific
      {
        pattern: /openai.*timeout/i,
        category: 'OpenAI Service',
        severity: 'medium',
        suggestion: 'OpenAI API timeout. Consider increasing timeout or retrying with smaller payload.'
      },
      {
        pattern: /model.*not.*found|invalid.*model/i,
        category: 'OpenAI Model',
        severity: 'high',
        suggestion: 'Invalid OpenAI model specified. Use gpt-4o or gpt-4o-mini.'
      }
    ];
  }

  private analyzeError(message: string, stack?: string): { category: string; suggestion: string; severity: string } | null {
    const fullText = `${message} ${stack || ''}`;
    
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(fullText)) {
        // Track error frequency
        const freq = this.errorFrequency.get(pattern.category) || 0;
        this.errorFrequency.set(pattern.category, freq + 1);
        
        // Emit alert for high frequency errors
        if (freq > 5 && freq % 5 === 0) {
          this.emit('frequentError', {
            category: pattern.category,
            count: freq,
            suggestion: `Frequent ${pattern.category} errors detected. Consider implementing: ${pattern.suggestion}`
          });
        }
        
        return {
          category: pattern.category,
          suggestion: pattern.suggestion,
          severity: pattern.severity
        };
      }
    }
    
    // Use AI for unknown errors
    return this.getAISuggestion(message, stack);
  }

  private getAISuggestion(message: string, stack?: string): { category: string; suggestion: string; severity: string } | null {
    // Simplified AI-like suggestion based on common patterns
    if (message.includes('undefined') || message.includes('null')) {
      return {
        category: 'Null Reference',
        suggestion: 'Check for null/undefined values before accessing properties. Use optional chaining (?.) or null checks.',
        severity: 'medium'
      };
    }
    
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return {
        category: 'Timeout',
        suggestion: 'Operation timed out. Consider increasing timeout, implementing retry logic, or optimizing the operation.',
        severity: 'medium'
      };
    }
    
    if (message.includes('CORS')) {
      return {
        category: 'CORS',
        suggestion: 'CORS error. Add appropriate CORS headers or configure proxy settings.',
        severity: 'medium'
      };
    }
    
    return null;
  }

  private trackPerformance(operation: string, duration: number) {
    const baseline = this.performanceBaseline.get(operation) || [];
    baseline.push(duration);
    
    // Keep only last 100 measurements
    if (baseline.length > 100) {
      baseline.shift();
    }
    
    this.performanceBaseline.set(operation, baseline);
    
    // Calculate average and detect anomalies
    const avg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
    const threshold = avg * 2; // Alert if 2x slower than average
    
    if (duration > threshold && baseline.length > 10) {
      this.emit('performanceAnomaly', {
        operation,
        duration,
        average: avg,
        suggestion: `Operation "${operation}" is ${(duration/avg).toFixed(1)}x slower than average. Check for performance bottlenecks.`
      });
    }
  }

  private startQueueProcessor() {
    setInterval(() => {
      if (this.logQueue.length > 0) {
        this.flushLogs();
      }
    }, 5000); // Flush every 5 seconds
  }

  private startMetricsCollector() {
    setInterval(() => {
      const metrics = {
        timestamp: new Date(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        errorFrequency: Object.fromEntries(this.errorFrequency),
        performance: Object.fromEntries(
          Array.from(this.performanceBaseline.entries()).map(([key, values]) => [
            key,
            {
              avg: values.reduce((a, b) => a + b, 0) / values.length,
              min: Math.min(...values),
              max: Math.max(...values),
              count: values.length
            }
          ])
        )
      };
      
      this.writeMetrics(metrics);
      
      // Check for memory leaks
      if (metrics.memory.heapUsed > 500 * 1024 * 1024) { // 500MB
        this.emit('memoryWarning', {
          used: Math.round(metrics.memory.heapUsed / 1024 / 1024),
          suggestion: 'High memory usage detected. Check for memory leaks.'
        });
      }
    }, 60000); // Collect metrics every minute
  }

  private flushLogs() {
    const logs = this.logQueue.splice(0, this.logQueue.length);
    const logDir = path.dirname(this.logFilePath);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logLines = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
    fs.appendFileSync(this.logFilePath, logLines);
  }

  private writeMetrics(metrics: any) {
    const logDir = path.dirname(this.metricsFilePath);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(this.metricsFilePath, JSON.stringify(metrics) + '\n');
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const colorMap: Record<string, string> = {
      debug: '\x1b[36m',    // Cyan
      info: '\x1b[32m',     // Green
      warn: '\x1b[33m',     // Yellow
      error: '\x1b[31m',    // Red
      critical: '\x1b[35m'  // Magenta
    };
    
    const reset = '\x1b[0m';
    const color = colorMap[level] || reset;
    
    let formatted = `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`;
    
    if (context?.suggestion) {
      formatted += `\n  💡 ${context.suggestion}`;
    }
    
    if (context?.category) {
      formatted += ` [${context.category}]`;
    }
    
    return formatted;
  }

  log(level: LogEntry['level'], message: string, context?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context
    };
    
    // Extract caller information
    const stack = new Error().stack;
    if (stack) {
      const caller = stack.split('\n')[3];
      const match = caller.match(/at .* \((.*):(\d+):\d+\)/);
      if (match) {
        entry.file = match[1];
        entry.line = parseInt(match[2]);
      }
    }
    
    // Analyze errors
    if (level === 'error' || level === 'critical') {
      const analysis = this.analyzeError(message, context?.stack);
      if (analysis) {
        entry.category = analysis.category;
        entry.suggestion = analysis.suggestion;
        context = { ...context, ...analysis };
      }
    }
    
    // Console output
    if (!this.isProduction || level === 'error' || level === 'critical') {
      console.log(this.formatMessage(level, message, context));
    }
    
    // Queue for file writing
    this.logQueue.push(entry);
    
    // Emit events for real-time monitoring
    this.emit('log', entry);
    
    if (level === 'error' || level === 'critical') {
      this.emit('error', entry);
    }
  }

  debug(message: string, context?: any) {
    this.log('debug', message, context);
  }

  info(message: string, context?: any) {
    this.log('info', message, context);
  }

  warn(message: string, context?: any) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | any, context?: any) {
    this.log('error', message, {
      ...context,
      error: error?.message,
      stack: error?.stack
    });
  }

  critical(message: string, error?: Error | any, context?: any) {
    this.log('critical', message, {
      ...context,
      error: error?.message,
      stack: error?.stack
    });
    
    // Immediate flush for critical errors
    this.flushLogs();
  }

  async measurePerformance<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.trackPerformance(operation, duration);
      
      if (duration > 1000) {
        this.warn(`Slow operation: ${operation} took ${duration}ms`);
      } else {
        this.debug(`${operation} completed in ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${operation} failed after ${duration}ms`, error);
      throw error;
    }
  }

  getRecentErrors(limit: number = 10): LogEntry[] {
    return this.logQueue
      .filter(log => log.level === 'error' || log.level === 'critical')
      .slice(-limit);
  }

  getErrorSummary(): any {
    return {
      frequency: Object.fromEntries(this.errorFrequency),
      recent: this.getRecentErrors(),
      suggestions: Array.from(this.errorFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({
          category,
          count,
          pattern: this.errorPatterns.find(p => p.category === category)
        }))
    };
  }

  clearErrorFrequency() {
    this.errorFrequency.clear();
  }
}

export const logger = AdvancedLogger.getInstance();

// Express middleware
export const loggingMiddleware = (req: any, res: any, next: any) => {
  const requestId = Math.random().toString(36).substring(7);
  req.requestId = requestId;
  
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data: any) {
    res.send = originalSend;
    const duration = Date.now() - start;
    
    logger.info(`${req.method} ${req.path}`, {
      requestId,
      statusCode: res.statusCode,
      duration,
      userId: req.userId,
      query: req.query,
      body: req.method === 'POST' ? req.body : undefined
    });
    
    if (res.statusCode >= 400) {
      logger.warn(`Request failed: ${req.method} ${req.path}`, {
        requestId,
        statusCode: res.statusCode,
        error: data
      });
    }
    
    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`, {
        requestId,
        suggestion: 'Consider optimizing database queries or implementing caching'
      });
    }
    
    return res.send(data);
  };
  
  next();
};

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.critical('Uncaught Exception', error);
  // Give logger time to flush
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.critical('Unhandled Rejection', reason as Error, { promise });
});

// WebSocket support for real-time log streaming
export class LogWebSocketHandler {
  private clients: Set<any> = new Set();
  
  constructor() {
    logger.on('log', (entry) => {
      this.broadcast({
        type: 'log',
        data: entry
      });
    });
    
    logger.on('error', (entry) => {
      this.broadcast({
        type: 'error',
        data: entry
      });
    });
    
    logger.on('frequentError', (data) => {
      this.broadcast({
        type: 'alert',
        data
      });
    });
    
    logger.on('performanceAnomaly', (data) => {
      this.broadcast({
        type: 'performance',
        data
      });
    });
  }
  
  addClient(ws: any) {
    this.clients.add(ws);
    
    // Send initial data
    ws.send(JSON.stringify({
      type: 'init',
      data: {
        recentErrors: logger.getRecentErrors(),
        errorSummary: logger.getErrorSummary()
      }
    }));
    
    ws.on('close', () => {
      this.clients.delete(ws);
    });
  }
  
  broadcast(message: any) {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    });
  }
}