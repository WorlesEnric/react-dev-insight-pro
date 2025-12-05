/**
 * Element Inspector Component
 * 
 * Displays information about the currently selected React component
 * and provides controls for inspection mode and analysis.
 */

import React from 'react';
import { Button, Badge, Card, IconButton, Spinner } from '../ui';
import { useElementSelection, useCodeAnalysis } from '../../hooks';
import { useStore } from '../../stores';
import type { OptimizationCategory } from '../../types';

// Icons
const InspectIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" 
    />
  </svg>
);

const AnalyzeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
    />
  </svg>
);

const ClearIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const LayersIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
    />
  </svg>
);

// Category configuration
const CATEGORIES: Array<{
  id: OptimizationCategory;
  label: string;
  color: string;
  icon: React.ReactNode;
}> = [
  { 
    id: 'performance', 
    label: 'Performance', 
    color: 'emerald',
    icon: <span>⚡</span>
  },
  { 
    id: 'accessibility', 
    label: 'A11y', 
    color: 'blue',
    icon: <span>♿</span>
  },
  { 
    id: 'maintainability', 
    label: 'Maintainability', 
    color: 'violet',
    icon: <span>🔧</span>
  },
  { 
    id: 'bundle-size', 
    label: 'Bundle', 
    color: 'amber',
    icon: <span>📦</span>
  },
  { 
    id: 'ux', 
    label: 'UX', 
    color: 'rose',
    icon: <span>✨</span>
  },
  { 
    id: 'code-quality', 
    label: 'Quality', 
    color: 'cyan',
    icon: <span>💎</span>
  }
];

export function ElementInspector() {
  const { 
    selectedElement, 
    isInspecting, 
    startInspection, 
    stopInspection,
    clearSelection 
  } = useElementSelection();
  
  const { 
    isAnalyzing, 
    selectedCategories, 
    toggleCategory,
    analyzeSelected 
  } = useCodeAnalysis();
  
  const projectPath = useStore(state => state.projectPath);
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <LayersIcon />
            Element Inspector
          </h2>
          
          <div className="flex items-center gap-2">
            {selectedElement && (
              <IconButton
                icon={<ClearIcon />}
                tooltip="Clear selection"
                onClick={clearSelection}
              />
            )}
          </div>
        </div>
        
        {/* Inspect Button */}
        <div className="space-y-2">
          <Button
            variant={isInspecting ? 'primary' : 'secondary'}
            className="w-full"
            icon={<InspectIcon />}
            onClick={isInspecting ? stopInspection : startInspection}
          >
            {isInspecting ? 'Click Element to Select...' : 'Start Inspection'}
          </Button>
          
          {!isInspecting && (
            <button
              onClick={() => {
                const targetUrl = localStorage.getItem('targetAppUrl') || 'http://localhost:3000';
                window.open(targetUrl, '_blank');
              }}
              className="w-full px-3 py-2 text-xs text-slate-400 hover:text-slate-300 border border-slate-700/50 hover:border-slate-600/50 rounded-md transition-colors flex items-center justify-center gap-2"
              title="Open in new window to use Chrome DevTools"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Use Chrome DevTools Instead
            </button>
          )}
        </div>
        
        {isInspecting && (
          <p className="mt-2 text-xs text-slate-400 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">Esc</kbd> to cancel
          </p>
        )}
      </div>
      
      {/* Selected Element Info */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {selectedElement ? (
          <>
            {/* Component Card */}
            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white font-mono">
                    {'<'}{selectedElement.componentName}{' />'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono truncate">
                    {selectedElement.filePath}
                    {selectedElement.lineNumber && `:${selectedElement.lineNumber}`}
                  </p>
                </div>
                <Badge variant="info">{selectedElement.tagName}</Badge>
              </div>
              
              {/* Props preview */}
              {selectedElement.props && Object.keys(selectedElement.props).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <CodeIcon /> Props
                  </h4>
                  <div className="space-y-1">
                    {Object.entries(selectedElement.props).slice(0, 5).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-emerald-400">{key}</span>
                        <span className="text-slate-500">=</span>
                        <span className="text-amber-300 truncate">
                          {typeof value === 'string' ? `"${value}"` : String(value)}
                        </span>
                      </div>
                    ))}
                    {Object.keys(selectedElement.props).length > 5 && (
                      <span className="text-xs text-slate-500">
                        +{Object.keys(selectedElement.props).length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>
            
            {/* Optimization Categories */}
            <div>
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                Optimization Focus
              </h4>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-1.5
                      text-xs font-medium
                      rounded-lg border
                      transition-all duration-200
                      ${selectedCategories.includes(cat.id)
                        ? `bg-${cat.color}-500/20 border-${cat.color}-500/40 text-${cat.color}-300`
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-300'
                      }
                    `}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Analyze Button */}
            <Button
              variant="primary"
              className="w-full"
              icon={isAnalyzing ? <Spinner size="sm" /> : <AnalyzeIcon />}
              onClick={() => analyzeSelected()}
              disabled={isAnalyzing || !projectPath || selectedCategories.length === 0}
              loading={isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Component'}
            </Button>
            
            {!projectPath && (
              <p className="text-xs text-amber-400 text-center">
                Configure project path in settings to enable analysis
              </p>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
              <InspectIcon />
            </div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">
              No Element Selected
            </h3>
            <p className="text-xs text-slate-500 max-w-[200px]">
              Click "Start Inspection" and select a React component in your application to analyze it.
            </p>
            
            <div className="mt-6 text-xs text-slate-600">
              <p className="mb-1">Keyboard shortcut:</p>
              <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-slate-400">
                ⌘ + Shift + I
              </kbd>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
