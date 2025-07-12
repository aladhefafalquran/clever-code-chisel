import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Download, Upload, Trash2, Database, HardDrive, Info } from 'lucide-react';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const StorageManager = () => {
  const [storageInfo, setStorageInfo] = useState<{used: number, quota: number, available: number}>({ used: 0, quota: 0, available: 0 });
  const [importData, setImportData] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const loadStorageInfo = async () => {
      const info = await apiService.getStorageInfo();
      setStorageInfo(info);
    };
    
    loadStorageInfo();
    
    // Update storage info every 10 seconds
    const interval = setInterval(loadStorageInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = apiService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `housekeeping-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      toast.error('Please paste your backup data');
      return;
    }

    setIsImporting(true);
    try {
      const success = apiService.importData(importData);
      if (success) {
        toast.success('Data imported successfully!');
        setImportData('');
        // Refresh the page to show imported data
        window.location.reload();
      } else {
        toast.error('Failed to import data - invalid format');
      }
    } catch (error) {
      toast.error('Failed to import data');
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
      try {
        apiService.clearAllData();
        toast.success('All data cleared');
        // Refresh the page to show cleared state
        window.location.reload();
      } catch (error) {
        toast.error('Failed to clear data');
        console.error('Clear error:', error);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const storagePercentage = storageInfo.quota > 0 ? (storageInfo.used / storageInfo.quota) * 100 : 0;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          When you clear browser cookies/data, localStorage is also cleared. Use export/import to backup your data.
        </AlertDescription>
      </Alert>

      {/* Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Storage Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {storageInfo.quota > 0 ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used: {formatBytes(storageInfo.used)}</span>
                  <span>Available: {formatBytes(storageInfo.available)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${storagePercentage > 80 ? 'bg-red-500' : storagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Quota: {formatBytes(storageInfo.quota)} ({storagePercentage.toFixed(1)}% used)
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              Storage quota information not available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Download a backup of all your housekeeping data (rooms, tasks, messages, archives).
          </p>
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Import Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Restore data from a previously exported backup file. This will merge with existing data.
          </p>
          <div className="space-y-2">
            <Label htmlFor="importData">Paste backup data (JSON format):</Label>
            <Textarea
              id="importData"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste your exported JSON data here..."
              rows={6}
            />
          </div>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || !importData.trim()}
            className="w-full"
          >
            {isImporting ? 'Importing...' : 'Import Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Clear All Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Clear All Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete all housekeeping data. This action cannot be undone!
          </p>
          <Button 
            onClick={handleClearAll} 
            variant="destructive"
            className="w-full"
          >
            Clear All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};