
import { useEffect, useState, useCallback } from 'react';

interface UseAutoRefreshOptions {
  interval?: number; // milliseconds
  enabled?: boolean;
  onRefresh?: () => void;
}

export const useAutoRefresh = (options: UseAutoRefreshOptions = {}) => {
  const { interval = 30000, enabled = true, onRefresh } = options;
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const performRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    console.log('🔄 Auto-refresh triggered at', new Date().toLocaleTimeString());
    
    try {
      // Check if there's a new version by making a HEAD request to the current page
      const response = await fetch(window.location.href, {
        method: 'HEAD',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      // Get the ETag or Last-Modified header to detect changes
      const etag = response.headers.get('etag');
      const lastModified = response.headers.get('last-modified');
      
      // Store current version info in sessionStorage for comparison
      const currentEtag = sessionStorage.getItem('app-etag');
      const currentLastModified = sessionStorage.getItem('app-last-modified');
      
      // Check if this is the first load
      const isFirstLoad = !currentEtag && !currentLastModified;
      
      if (!isFirstLoad) {
        // Check if version has changed
        const hasChanged = (etag && etag !== currentEtag) || 
                          (lastModified && lastModified !== currentLastModified);
        
        if (hasChanged) {
          console.log('🆕 New version detected, refreshing...');
          // Store new version info
          if (etag) sessionStorage.setItem('app-etag', etag);
          if (lastModified) sessionStorage.setItem('app-last-modified', lastModified);
          
          // Perform a soft reload to get the latest version
          window.location.reload();
          return;
        }
      } else {
        // First load - store version info
        if (etag) sessionStorage.setItem('app-etag', etag);
        if (lastModified) sessionStorage.setItem('app-last-modified', lastModified);
      }
      
      // If no version change detected, just call the refresh callback
      if (onRefresh) {
        onRefresh();
      }
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('🔄 Auto-refresh check failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    // Perform initial check after component mount
    const initialTimer = setTimeout(performRefresh, 1000);

    // Set up interval for regular checks
    const intervalId = setInterval(performRefresh, interval);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [enabled, interval, performRefresh]);

  return {
    lastRefresh,
    isRefreshing,
    performRefresh
  };
};
