import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { StorageManager } from './utils/storageManager'

// Initialize enhanced storage on app start
StorageManager.init().then(() => {
  console.log('🔄 Enhanced storage initialized');
}).catch(error => {
  console.error('Storage initialization failed:', error);
});

createRoot(document.getElementById("root")!).render(<App />);
