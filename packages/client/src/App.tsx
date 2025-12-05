/**
 * App Component
 * 
 * Main application layout with sidebar navigation,
 * panel views, and target application iframe.
 */

import React, { useEffect, useState } from 'react';
import { 
  ElementInspector,
  AnalysisPanel,
  HistoryPanel,
  SettingsPanel,
  ApprovalDialog,
  Notifications,
  IconButton,
  Divider
} from './components';
import { useStore, useActivePanel, useGitStatus } from './stores';
import { useKeyboardShortcuts, useGitOperations } from './hooks';

// Icons
const InspectorIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" 
    />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" 
    />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
    />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const GitBranchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 9v10m8-6a3 3 0 100-6 3 3 0 000 6zm0 0v2a2 2 0 01-2 2H10" 
    />
  </svg>
);

const LogoIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" className="fill-emerald-500/20" />
    <path 
      d="M16 6L26 12V20L16 26L6 20V12L16 6Z" 
      className="stroke-emerald-400" 
      strokeWidth="1.5" 
      fill="none"
    />
    <circle cx="16" cy="16" r="4" className="fill-emerald-400" />
    <path 
      d="M16 12V8M20 14L23 12M20 18L23 20M16 20V24M12 18L9 20M12 14L9 12" 
      className="stroke-emerald-400" 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />
  </svg>
);

type Panel = 'inspector' | 'analysis' | 'history' | 'settings';

const navItems: Array<{ id: Panel; icon: React.ReactNode; label: string }> = [
  { id: 'inspector', icon: <InspectorIcon />, label: 'Inspector' },
  { id: 'analysis', icon: <SparklesIcon />, label: 'Analysis' },
  { id: 'history', icon: <HistoryIcon />, label: 'History' },
  { id: 'settings', icon: <SettingsIcon />, label: 'Settings' }
];

function Sidebar() {
  const activePanel = useActivePanel();
  const setActivePanel = useStore(state => state.setActivePanel);
  const gitStatus = useGitStatus();
  const { modificationHistory } = useStore();
  const analysisResult = useStore(state => state.analysisResult);
  
  return (
    <div className="w-16 h-full bg-slate-900/50 border-r border-slate-700/50 flex flex-col items-center py-4">
      {/* Logo */}
      <div className="mb-6">
        <LogoIcon />
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-2">
        {navItems.map((item) => {
          const isActive = activePanel === item.id;
          let badge: number | undefined;
          
          if (item.id === 'analysis' && analysisResult?.suggestions) {
            badge = analysisResult.suggestions.length;
          }
          if (item.id === 'history' && modificationHistory.length > 0) {
            badge = modificationHistory.length;
          }
          
          return (
            <div key={item.id} className="relative">
              <IconButton
                icon={item.icon}
                active={isActive}
                onClick={() => setActivePanel(item.id)}
                tooltip={item.label}
              />
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
          );
        })}
      </nav>
      
      {/* Git Status Indicator */}
      {gitStatus && (
        <div className="mt-auto pt-4">
          <div className={`
            p-2 rounded-lg
            ${gitStatus.isClean 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : 'bg-amber-500/10 text-amber-400'
            }
          `}>
            <GitBranchIcon />
          </div>
        </div>
      )}
    </div>
  );
}

function PanelContent() {
  const activePanel = useActivePanel();
  
  return (
    <div className="h-full">
      {activePanel === 'inspector' && <ElementInspector />}
      {activePanel === 'analysis' && <AnalysisPanel />}
      {activePanel === 'history' && <HistoryPanel />}
      {activePanel === 'settings' && <SettingsPanel />}
    </div>
  );
}

function StatusBar() {
  const gitStatus = useGitStatus();
  const isConnected = useStore(state => state.isConnected);
  const projectPath = useStore(state => state.projectPath);
  const isAnalyzing = useStore(state => state.isAnalyzing);
  
  return (
    <div className="h-8 bg-slate-900/80 border-t border-slate-700/50 px-4 flex items-center justify-between text-xs">
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-slate-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {/* Project Path */}
        {projectPath && (
          <>
            <Divider orientation="vertical" className="h-4" />
            <span className="text-slate-500 font-mono truncate max-w-[200px]">
              {projectPath.split('/').slice(-2).join('/')}
            </span>
          </>
        )}
        
        {/* Git Branch */}
        {gitStatus?.branch && (
          <>
            <Divider orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5 text-slate-400">
              <GitBranchIcon />
              <span className="font-mono">{gitStatus.branch}</span>
              {!gitStatus.isClean && (
                <span className="text-amber-400">•</span>
              )}
            </div>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Analysis Status */}
        {isAnalyzing && (
          <span className="text-emerald-400 flex items-center gap-1.5">
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing...
          </span>
        )}
        
        {/* Version */}
        <span className="text-slate-600">v1.0.0</span>
      </div>
    </div>
  );
}

function TargetAppFrame() {
  const [targetUrl, setTargetUrl] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const projectPath = useStore(state => state.projectPath);
  const addNotification = useStore(state => state.addNotification);
  
  // Default to localhost:3000 or configured URL
  useEffect(() => {
    const url = localStorage.getItem('targetAppUrl') || 'http://localhost:3000';
    setTargetUrl(url);
  }, []);
  
  // Handle iframe load events
  useEffect(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('#target-app-iframe');
    if (!iframe) return;
    
    const handleLoad = () => {
      setIsLoading(false);
      setConnectionError(null);
      
      // Try to inject the injector script
      const injectScript = async () => {
        try {
          const iframeWindow = iframe.contentWindow;
          const iframeDocument = iframe.contentDocument || iframeWindow?.document;
          
          if (iframeDocument) {
            // Check if injector already exists
            if (iframeDocument.getElementById('react-dev-insight-injector')) {
              return; // Already injected
            }
            
            // Fetch and inject the injector script inline
            try {
              const response = await fetch('/injector.js');
              const scriptContent = await response.text();
              
              const script = iframeDocument.createElement('script');
              script.id = 'react-dev-insight-injector';
              script.textContent = scriptContent;
              iframeDocument.head.appendChild(script);
              
              console.log('[React Dev Insight Pro] Injector script injected successfully');
              addNotification('success', 'Injector script loaded');
            } catch (fetchError) {
              console.error('[React Dev Insight Pro] Failed to fetch injector script:', fetchError);
              addNotification('error', 'Failed to load injector script. Use Chrome DevTools instead.');
            }
          }
        } catch (error) {
          // Cross-origin restrictions - this is expected if the React app is on a different origin
          console.warn('[React Dev Insight Pro] Cannot access iframe content (cross-origin):', error);
          addNotification('warning', 'Cross-origin restrictions detected. Use Chrome DevTools instead.');
        }
      };
      
      injectScript();
    };
    
    const handleError = () => {
      setIsLoading(false);
      setConnectionError('CONNECTION_REFUSED');
    };
    
    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);
    
    // Set a timeout to detect connection issues
    const timeout = setTimeout(() => {
      if (isLoading) {
        setConnectionError('TIMEOUT');
      }
    }, 5000);
    
    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
      clearTimeout(timeout);
    };
  }, [targetUrl, isLoading, addNotification]);
  
  if (!projectPath) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900/30 text-center p-8">
        <div className="w-20 h-20 mb-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
          <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-300 mb-2">
          No Project Connected
        </h2>
        <p className="text-sm text-slate-500 max-w-[300px] mb-6">
          Configure your project path in Settings to connect to your React application.
        </p>
        <div className="text-xs text-slate-600 space-y-1">
          <p>1. Open Settings (⌘4)</p>
          <p>2. Enter your project path</p>
          <p>3. Start your React dev server</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* URL Bar */}
      <div className="flex-shrink-0 h-10 bg-slate-800/50 border-b border-slate-700/50 px-4 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button 
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            onClick={() => {
              const iframe = document.querySelector<HTMLIFrameElement>('#target-app-iframe');
              if (iframe?.contentWindow) {
                iframe.contentWindow.history.back();
              }
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            onClick={() => {
              const iframe = document.querySelector<HTMLIFrameElement>('#target-app-iframe');
              if (iframe?.contentWindow) {
                iframe.contentWindow.history.forward();
              }
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button 
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            onClick={() => {
              const iframe = document.querySelector<HTMLIFrameElement>('#target-app-iframe');
              if (iframe) {
                iframe.src = iframe.src;
              }
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <input
          type="text"
          value={targetUrl}
          onChange={(e) => {
            setTargetUrl(e.target.value);
            setConnectionError(null);
            setIsLoading(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              localStorage.setItem('targetAppUrl', targetUrl);
              setIsLoading(true);
              setConnectionError(null);
            }
          }}
          className="flex-1 px-3 py-1.5 bg-slate-900/50 border border-slate-700/50 rounded-md text-sm text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          placeholder="http://localhost:3000"
        />
      </div>
      
      {/* Iframe */}
      <div className="flex-1 relative">
        {connectionError && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-8 z-10">
            <div className="w-16 h-16 mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Connection Failed</h3>
            <p className="text-sm text-slate-400 mb-6 text-center max-w-md">
              {connectionError === 'CONNECTION_REFUSED' 
                ? 'Unable to connect to the React app. This is usually caused by X-Frame-Options blocking iframe embedding.'
                : 'Connection timeout. Please check if your React dev server is running.'}
            </p>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 max-w-2xl w-full text-left">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">To fix this issue:</h4>
              <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside">
                <li className="ml-2">
                  <strong className="text-slate-300">For Create React App:</strong> Add this to your <code className="bg-slate-900 px-1 rounded">public/index.html</code>:
                  <pre className="mt-1 bg-slate-900 p-2 rounded text-xs overflow-x-auto">
{`<meta http-equiv="X-Frame-Options" content="ALLOW-FROM http://localhost:5173">
<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'self' http://localhost:5173;">`}
                  </pre>
                </li>
                <li className="ml-2">
                  <strong className="text-slate-300">For Vite:</strong> Add this to your <code className="bg-slate-900 px-1 rounded">index.html</code>:
                  <pre className="mt-1 bg-slate-900 p-2 rounded text-xs overflow-x-auto">
{`<meta http-equiv="X-Frame-Options" content="ALLOW-FROM http://localhost:5173">
<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'self' http://localhost:5173;">`}
                  </pre>
                </li>
                <li className="ml-2">
                  <strong className="text-slate-300">For Next.js:</strong> Add this to <code className="bg-slate-900 px-1 rounded">next.config.js</code>:
                  <pre className="mt-1 bg-slate-900 p-2 rounded text-xs overflow-x-auto">
{`headers: async () => [
  {
    source: '/:path*',
    headers: [
      {
        key: 'X-Frame-Options',
        value: 'ALLOW-FROM http://localhost:5173'
      },
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'self' http://localhost:5173"
      }
    ]
  }
]`}
                  </pre>
                </li>
                <li className="ml-2">
                  Make sure your React dev server is running on <code className="bg-slate-900 px-1 rounded">{targetUrl}</code>
                </li>
              </ol>
            </div>
            <button
              onClick={() => {
                setConnectionError(null);
                setIsLoading(true);
                const iframe = document.querySelector<HTMLIFrameElement>('#target-app-iframe');
                if (iframe) {
                  iframe.src = targetUrl;
                }
              }}
              className="mt-4 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-md text-sm transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}
        
        {isLoading && !connectionError && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10">
            <div className="text-center">
              <svg className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-slate-400">Loading...</p>
            </div>
          </div>
        )}
        
        <iframe
          id="target-app-iframe"
          src={targetUrl}
          className="w-full h-full border-0 bg-white"
          title="Target Application"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          onLoad={() => setIsLoading(false)}
        />
        
        {/* Overlay for inspection mode */}
        <div 
          id="inspection-overlay" 
          className="absolute inset-0 pointer-events-none"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

export default function App() {
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  
  // Initialize Git operations
  const { refreshStatus } = useGitOperations();
  
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);
  
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Left Panel */}
        <div className="w-80 h-full bg-slate-900/30 border-r border-slate-700/50 flex-shrink-0 overflow-hidden">
          <PanelContent />
        </div>
        
        {/* Main Area - Target App */}
        <div className="flex-1 overflow-hidden">
          <TargetAppFrame />
        </div>
      </div>
      
      {/* Status Bar */}
      <StatusBar />
      
      {/* Modals & Overlays */}
      <ApprovalDialog />
      <Notifications />
    </div>
  );
}
