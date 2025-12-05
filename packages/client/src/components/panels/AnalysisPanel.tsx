/**
 * Analysis Panel Component
 * 
 * Displays AI-generated analysis results including suggestions,
 * code previews, and quick actions for applying changes.
 */

import React, { useState } from 'react';
import { Button, Badge, Card, Spinner, DiffViewer, CodeBlock } from '../ui';
import { useCodeAnalysis, useModifications } from '../../hooks';
import { useStore, useAnalysisResult, useSelectedSuggestion } from '../../stores';
import type { CodeSuggestion, OptimizationCategory } from '../../types';

// Icons
const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" 
    />
  </svg>
);

const categoryColors: Record<OptimizationCategory, string> = {
  'performance': 'emerald',
  'accessibility': 'blue',
  'maintainability': 'violet',
  'bundle-size': 'amber',
  'ux': 'rose',
  'code-quality': 'cyan'
};

const priorityConfig = {
  high: { color: 'red', label: 'High Priority' },
  medium: { color: 'amber', label: 'Medium' },
  low: { color: 'slate', label: 'Low' }
};

interface SuggestionCardProps {
  suggestion: CodeSuggestion;
  isSelected: boolean;
  isApplied: boolean;
  onClick: () => void;
  onApply: () => void;
}

function SuggestionCard({ 
  suggestion, 
  isSelected, 
  isApplied,
  onClick, 
  onApply 
}: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(isSelected);
  const color = categoryColors[suggestion.category] || 'slate';
  const priority = priorityConfig[suggestion.priority];
  
  return (
    <Card
      className={`
        transition-all duration-200
        ${isSelected ? `ring-2 ring-${color}-500/50` : ''}
        ${isApplied ? 'opacity-60' : ''}
      `}
    >
      {/* Header */}
      <button
        onClick={() => {
          onClick();
          setExpanded(!expanded);
        }}
        className="w-full p-4 text-left flex items-start gap-3"
      >
        <span className={`
          mt-0.5 transition-transform duration-200
          ${expanded ? 'rotate-90' : ''}
        `}>
          <ChevronRightIcon />
        </span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge 
              variant={suggestion.priority === 'high' ? 'error' : suggestion.priority === 'medium' ? 'warning' : 'default'}
              size="sm"
            >
              {priority.label}
            </Badge>
            <Badge variant="info" size="sm">
              {suggestion.category}
            </Badge>
            {isApplied && (
              <Badge variant="success" size="sm">
                <CheckIcon /> Applied
              </Badge>
            )}
          </div>
          
          <h4 className="text-sm font-medium text-slate-200 mb-1">
            {suggestion.title}
          </h4>
          
          <p className="text-xs text-slate-400 line-clamp-2">
            {suggestion.description}
          </p>
          
          {suggestion.confidence && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-${color}-500 transition-all duration-500`}
                  style={{ width: `${suggestion.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">
                {Math.round(suggestion.confidence * 100)}% confidence
              </span>
            </div>
          )}
        </div>
      </button>
      
      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/50 pt-4 ml-7">
          {/* Explanation */}
          <div>
            <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Explanation
            </h5>
            <p className="text-sm text-slate-300">
              {suggestion.explanation}
            </p>
          </div>
          
          {/* Code diff */}
          <div>
            <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Code Changes
            </h5>
            <DiffViewer
              original={suggestion.originalCode}
              modified={suggestion.modifiedCode}
              className="max-h-[300px]"
            />
          </div>
          
          {/* Location info */}
          {suggestion.lineRange && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Lines {suggestion.lineRange.start}–{suggestion.lineRange.end}</span>
            </div>
          )}
          
          {/* Apply button */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              icon={<CheckIcon />}
              onClick={(e) => {
                e.stopPropagation();
                onApply();
              }}
              disabled={isApplied}
            >
              {isApplied ? 'Applied' : 'Apply Change'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(suggestion.modifiedCode);
              }}
            >
              Copy Code
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function AnalysisPanel() {
  const analysisResult = useAnalysisResult();
  const selectedSuggestion = useSelectedSuggestion();
  const { isAnalyzing, analysisError } = useCodeAnalysis();
  const { 
    appliedSuggestions, 
    selectSuggestion, 
    openApprovalDialog 
  } = useModifications();
  const selectedElement = useStore(state => state.selectedElement);
  
  // Filter and sort suggestions
  const [filterCategory, setFilterCategory] = useState<OptimizationCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'confidence'>('priority');
  
  const filteredSuggestions = React.useMemo(() => {
    if (!analysisResult?.suggestions) return [];
    
    let suggestions = [...analysisResult.suggestions];
    
    // Filter
    if (filterCategory !== 'all') {
      suggestions = suggestions.filter(s => s.category === filterCategory);
    }
    
    // Sort
    suggestions.sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return (b.confidence || 0) - (a.confidence || 0);
    });
    
    return suggestions;
  }, [analysisResult?.suggestions, filterCategory, sortBy]);
  
  // Loading state
  if (isAnalyzing) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-slate-400">
          Analyzing component...
        </p>
        <p className="text-xs text-slate-500 mt-1">
          This may take a few seconds
        </p>
      </div>
    );
  }
  
  // Error state
  if (analysisError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          Analysis Failed
        </h3>
        <p className="text-xs text-slate-500 max-w-[250px]">
          {analysisError}
        </p>
      </div>
    );
  }
  
  // Empty state
  if (!analysisResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-500">
          <SparklesIcon />
        </div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          No Analysis Yet
        </h3>
        <p className="text-xs text-slate-500 max-w-[250px]">
          {selectedElement 
            ? 'Click "Analyze Component" to get AI-powered suggestions.'
            : 'Select a component to analyze it for optimization opportunities.'
          }
        </p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <SparklesIcon />
            Analysis Results
          </h2>
          <Badge variant="success">
            {filteredSuggestions.length} suggestions
          </Badge>
        </div>
        
        {/* Summary */}
        {analysisResult.analysis && (
          <p className="text-sm text-slate-400 mb-4">
            {analysisResult.analysis.summary}
          </p>
        )}
        
        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as OptimizationCategory | 'all')}
            className="px-3 py-1.5 text-xs bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300"
          >
            <option value="all">All Categories</option>
            <option value="performance">Performance</option>
            <option value="accessibility">Accessibility</option>
            <option value="maintainability">Maintainability</option>
            <option value="bundle-size">Bundle Size</option>
            <option value="ux">UX</option>
            <option value="code-quality">Code Quality</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'priority' | 'confidence')}
            className="px-3 py-1.5 text-xs bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300"
          >
            <option value="priority">Sort by Priority</option>
            <option value="confidence">Sort by Confidence</option>
          </select>
        </div>
      </div>
      
      {/* Suggestions List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredSuggestions.length > 0 ? (
          filteredSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              isSelected={selectedSuggestion?.id === suggestion.id}
              isApplied={appliedSuggestions.includes(suggestion.id)}
              onClick={() => selectSuggestion(suggestion)}
              onApply={() => openApprovalDialog(suggestion)}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">
              No suggestions match the current filter.
            </p>
          </div>
        )}
      </div>
      
      {/* Batch Apply */}
      {filteredSuggestions.filter(s => !appliedSuggestions.includes(s.id)).length > 1 && (
        <div className="flex-shrink-0 p-4 border-t border-slate-700/50 bg-slate-800/30">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              // TODO: Implement batch apply dialog
            }}
          >
            Apply All ({filteredSuggestions.filter(s => !appliedSuggestions.includes(s.id)).length} suggestions)
          </Button>
        </div>
      )}
    </div>
  );
}
