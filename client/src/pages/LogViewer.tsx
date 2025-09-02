import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Bug, 
  Zap, 
  RefreshCw,
  Download,
  Search,
  Filter,
  XCircle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LogEntry {
  timestamp: string;
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
}

interface ErrorSummary {
  frequency: Record<string, number>;
  recent: LogEntry[];
  suggestions: Array<{
    category: string;
    count: number;
    pattern: any;
  }>;
}

interface PerformanceMetric {
  operation: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [errorSummary, setErrorSummary] = useState<ErrorSummary | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [filter, setFilter] = useState({
    level: 'all',
    search: '',
    category: 'all'
  });
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connectWebSocket();
    fetchInitialData();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, filter]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/logs`);
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to log stream');
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from log stream');
      // Reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current = ws;
  };

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'init':
        setLogs(message.data.recentErrors || []);
        setErrorSummary(message.data.errorSummary);
        break;
      case 'log':
        setLogs(prev => [...prev.slice(-999), message.data]);
        break;
      case 'error':
        setLogs(prev => [...prev.slice(-999), message.data]);
        if (message.data.suggestion) {
          addAlert({
            type: 'error',
            title: message.data.category || 'Error',
            message: message.data.message,
            suggestion: message.data.suggestion
          });
        }
        break;
      case 'alert':
        addAlert({
          type: 'warning',
          title: 'Frequent Error Pattern',
          message: `${message.data.category} errors occurring frequently (${message.data.count} times)`,
          suggestion: message.data.suggestion
        });
        break;
      case 'performance':
        addAlert({
          type: 'performance',
          title: 'Performance Issue',
          message: `Operation "${message.data.operation}" is running ${(message.data.duration/message.data.average).toFixed(1)}x slower than average`,
          suggestion: message.data.suggestion
        });
        break;
    }
  };

  const fetchInitialData = async () => {
    try {
      const response = await fetch('/api/logs/summary');
      const data = await response.json();
      setErrorSummary(data.errorSummary);
      setPerformanceMetrics(data.performanceMetrics || []);
    } catch (error) {
      console.error('Failed to fetch log summary:', error);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];
    
    if (filter.level !== 'all') {
      filtered = filtered.filter(log => log.level === filter.level);
    }
    
    if (filter.category !== 'all') {
      filtered = filtered.filter(log => log.category === filter.category);
    }
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.category?.toLowerCase().includes(searchLower) ||
        log.suggestion?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredLogs(filtered);
  };

  const addAlert = (alert: any) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { ...alert, id }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 10000);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'debug': return <Bug className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
      case 'warn': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'critical': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'bg-blue-100 text-blue-800';
      case 'info': return 'bg-green-100 text-green-800';
      case 'warn': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const downloadLogs = () => {
    const content = filteredLogs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message} ${log.suggestion ? `\nSuggestion: ${log.suggestion}` : ''}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.txt`;
    a.click();
  };

  const clearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
  };

  const categories = Array.from(new Set(logs.map(log => log.category).filter(Boolean)));

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Alerts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {alerts.map(alert => (
          <Alert key={alert.id} className={`
            ${alert.type === 'error' ? 'border-red-500 bg-red-50' : ''}
            ${alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' : ''}
            ${alert.type === 'performance' ? 'border-blue-500 bg-blue-50' : ''}
          `}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{alert.title}</AlertTitle>
            <AlertDescription>
              <p>{alert.message}</p>
              {alert.suggestion && (
                <p className="mt-2 text-sm font-medium">💡 {alert.suggestion}</p>
              )}
            </AlertDescription>
          </Alert>
        ))}
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Advanced Log Viewer
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchInitialData}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={downloadLogs}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearLogs}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Summary */}
      {errorSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Error Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(errorSummary.frequency).map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm">{category}</span>
                    <Badge variant="destructive">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {errorSummary.suggestions.slice(0, 3).map((item, idx) => (
                  <Alert key={idx} className="p-2">
                    <AlertDescription className="text-xs">
                      <strong>{item.category}:</strong> {item.pattern?.suggestion}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {performanceMetrics.slice(0, 5).map((metric, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="truncate">{metric.operation}</span>
                    <Badge variant={metric.avg > 1000 ? 'destructive' : 'default'}>
                      {metric.avg.toFixed(0)}ms
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap">
            <Select value={filter.level} onValueChange={level => setFilter({...filter, level})}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter.category} onValueChange={category => setFilter({...filter, category})}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={filter.search}
                onChange={e => setFilter({...filter, search: e.target.value})}
                className="pl-10"
              />
            </div>

            <Button
              variant={autoScroll ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Log Stream ({filteredLogs.length} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] w-full rounded-md border p-4" ref={scrollRef}>
            <div className="space-y-2">
              {filteredLogs.map((log, idx) => (
                <div key={idx} className="border-l-4 pl-4 py-2 hover:bg-gray-50 transition-colors"
                     style={{
                       borderColor: log.level === 'error' ? '#ef4444' : 
                                   log.level === 'warn' ? '#eab308' :
                                   log.level === 'info' ? '#22c55e' :
                                   log.level === 'critical' ? '#a855f7' : '#3b82f6'
                     }}>
                  <div className="flex items-start gap-2">
                    {getLevelIcon(log.level)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getLevelColor(log.level)}>
                          {log.level.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        {log.category && (
                          <Badge variant="outline">{log.category}</Badge>
                        )}
                        {log.file && (
                          <span className="text-xs text-gray-400">
                            {log.file}:{log.line}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm">{log.message}</p>
                      {log.suggestion && (
                        <Alert className="mt-2 p-2">
                          <AlertDescription className="text-xs">
                            💡 {log.suggestion}
                          </AlertDescription>
                        </Alert>
                      )}
                      {log.stack && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            Stack trace
                          </summary>
                          <pre className="text-xs mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
                            {log.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}