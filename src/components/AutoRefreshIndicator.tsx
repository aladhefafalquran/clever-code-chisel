
import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, Clock } from 'lucide-react';

interface AutoRefreshIndicatorProps {
  isRefreshing: boolean;
  lastRefresh: Date;
  className?: string;
}

export const AutoRefreshIndicator = ({ isRefreshing, lastRefresh, className = '' }: AutoRefreshIndicatorProps) => {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const interval = setInterval(() => {
      const secondsSinceRefresh = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
      const remaining = Math.max(0, 30 - secondsSinceRefresh);
      setCountdown(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastRefresh]);

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
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
