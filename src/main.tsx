import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { HybridStorageManager } from './utils/hybridStorageManager'

// Initialize GitHub-based storage on app start
HybridStorageManager.init().then(() => {
  console.log('🔄 GitHub database storage initialized');
}).catch(error => {
  console.error('Storage initialization failed:', error);
});

createRoot(document.getElementById("root")!).render(<App />);
