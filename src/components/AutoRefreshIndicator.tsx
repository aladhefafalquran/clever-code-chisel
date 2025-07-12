
import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, Clock, Database, HardDrive } from 'lucide-react';
import { checkConnection } from '@/services/api';

interface AutoRefreshIndicatorProps {
  isRefreshing: boolean;
  lastRefresh: Date;
  className?: string;
}

export const AutoRefreshIndicator = ({ isRefreshing, lastRefresh, className = '' }: AutoRefreshIndicatorProps) => {
  const [countdown, setCountdown] = useState(30);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const secondsSinceRefresh = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
      const remaining = Math.max(0, 30 - secondsSinceRefresh);
      setCountdown(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastRefresh]);

  useEffect(() => {
    const checkBackend = async () => {
      const connected = await checkConnection();
      setIsBackendConnected(connected);
    };
    
    checkBackend();
    
    // Check backend connection every 30 seconds
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center gap-3 text-xs text-muted-foreground ${className}`}>
      {/* Storage indicator */}
      <div className="flex items-center gap-1">
        {isBackendConnected ? (
          <>
            <Database className="w-3 h-3 text-green-600" />
            <span className="text-green-600">Backend DB</span>
          </>
        ) : (
          <>
            <Database className="w-3 h-3 text-blue-600" />
            <span className="text-blue-600">GitHub DB</span>
          </>
        )}
      </div>

      {/* Refresh indicator */}
      {isRefreshing ? (
        <>
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Checking for updates...</span>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span>Auto-sync active</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full">
            <Clock className="w-3 h-3" />
            <span>{countdown}s</span>
          </div>
        </>
      )}
    </div>
  );
};
