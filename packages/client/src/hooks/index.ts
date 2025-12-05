/**
 * Custom Hooks
 * 
 * React hooks for managing element selection, code analysis,
 * Git operations, and modification workflows.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../stores';
import * as api from '../services/api';
import type { CodeSuggestion, OptimizationCategory } from '../types';

// ============================================
// useElementSelection
// ============================================

interface MessageEvent {
  data: {
    type: string;
    payload?: {
      componentName?: string;
      filePath?: string;
      lineNumber?: number;
      props?: Record<string, unknown>;
      tagName?: string;
    };
  };
}

export function useElementSelection() {
  const {
    selectedElement,
    isInspecting,
    setSelectedElement,
    setInspecting,
    clearSelection,
    addNotification
  } = useStore();

  // Listen for messages from the injector iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'ELEMENT_SELECTED') {
        const { componentName, filePath, lineNumber, props, tagName } = event.data.payload || {};

        if (componentName && filePath) {
          setSelectedElement({
            componentName,
            filePath,
            ...(lineNumber ? { lineNumber } : {}),
            ...(props ? { props } : {}),
            tagName: tagName || 'div'
          });
          setInspecting(false);
          addNotification('success', `Selected: ${componentName}`);
        }
      }

      if (event.data?.type === 'INSPECTION_STARTED') {
        setInspecting(true);
      }

      if (event.data?.type === 'INSPECTION_CANCELLED') {
        setInspecting(false);
      }
    }

    window.addEventListener('message', handleMessage as unknown as EventListener);
    return () => window.removeEventListener('message', handleMessage as unknown as EventListener);
  }, [setSelectedElement, setInspecting, addNotification]);

  const startInspection = useCallback(() => {
    // Send message to injector iframe to start inspection mode
    const iframe = document.querySelector<HTMLIFrameElement>('#target-app-iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'START_INSPECTION' }, '*');
      setInspecting(true);
    } else {
      addNotification('error', 'Target application not connected');
    }
  }, [setInspecting, addNotification]);

  const stopInspection = useCallback(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('#target-app-iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'STOP_INSPECTION' }, '*');
    }
    setInspecting(false);
  }, [setInspecting]);

  return {
    selectedElement,
    isInspecting,
    startInspection,
    stopInspection,
    clearSelection
  };
}

// ============================================
// useCodeAnalysis
// ============================================

export function useCodeAnalysis() {
  const {
    projectPath,
    selectedElement,
    analysisResult,
    isAnalyzing,
    analysisError,
    selectedCategories,
    setAnalysisResult,
    setAnalyzing,
    setAnalysisError,
    setSelectedCategories,
    toggleCategory,
    addNotification
  } = useStore();

  const setSelectedElement = useStore(state => state.setSelectedElement);

  const analyzeSelected = useCallback(async (
    goal?: OptimizationCategory | string
  ) => {
    if (!projectPath) {
      addNotification('error', 'No project path configured');
      return;
    }

    if (!selectedElement) {
      addNotification('error', 'No element selected');
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await api.analyzeElement({
        projectPath,
        componentInfo: {
          name: selectedElement.componentName,
          filePath: selectedElement.filePath,
          ...(selectedElement.lineNumber ? { lineNumber: selectedElement.lineNumber } : {})
        },
        goal: goal || selectedCategories[0] || 'performance'
      });

      setAnalysisResult(result);

      // Update selectedElement with resolved filePath if it was missing or Unknown
      if (selectedElement && (!selectedElement.filePath || selectedElement.filePath === 'Unknown') && result.filePath) {
        setSelectedElement({
          ...selectedElement,
          filePath: result.filePath
        });
      }

      addNotification('success', `Found ${result.suggestions.length} suggestions`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      setAnalysisError(message);
      addNotification('error', message);
    }
  }, [
    projectPath,
    selectedElement,
    selectedCategories,
    setAnalyzing,
    setAnalysisError,
    setAnalysisResult,
    setSelectedElement,
    addNotification
  ]);

  const analyzeFile = useCallback(async (filePath: string, goal?: string) => {
    if (!projectPath) {
      addNotification('error', 'No project path configured');
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await api.analyzeFile(projectPath, filePath, goal);
      setAnalysisResult(result);
      addNotification('success', `Found ${result.suggestions.length} suggestions`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      setAnalysisError(message);
      addNotification('error', message);
    }
  }, [projectPath, setAnalyzing, setAnalysisError, setAnalysisResult, addNotification]);

  return {
    analysisResult,
    isAnalyzing,
    analysisError,
    selectedCategories,
    analyzeSelected,
    analyzeFile,
    setSelectedCategories,
    toggleCategory
  };
}

// ============================================
// useModifications
// ============================================

export function useModifications() {
  const {
    projectPath,
    selectedSuggestion,
    appliedSuggestions,
    modificationHistory,
    selectSuggestion,
    markSuggestionApplied,
    addModificationEntry,
    openApprovalDialog,
    closeApprovalDialog,
    addNotification
  } = useStore();

  const applySuggestion = useCallback(async (
    suggestion: CodeSuggestion,
    filePath: string
  ) => {
    if (!projectPath) {
      addNotification('error', 'No project path configured');
      return null;
    }

    try {
      const result = await api.applySuggestion(projectPath, filePath, suggestion);

      if (result.success) {
        markSuggestionApplied(suggestion.id);
        addModificationEntry({
          id: result.modificationId || suggestion.id,
          timestamp: Date.now(),
          filePath,
          suggestion,
          status: 'applied',
          ...(result.commitHash ? { commitHash: result.commitHash } : {}),
          ...(result.backupId ? { backupId: result.backupId } : {})
        });
        addNotification('success', 'Change applied successfully');
        closeApprovalDialog();
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply change';
      addNotification('error', message);
      return null;
    }
  }, [
    projectPath,
    markSuggestionApplied,
    addModificationEntry,
    closeApprovalDialog,
    addNotification
  ]);

  const applyMultiple = useCallback(async (
    suggestions: CodeSuggestion[],
    filePath: string
  ) => {
    if (!projectPath) {
      addNotification('error', 'No project path configured');
      return null;
    }

    try {
      const result = await api.applyMultipleSuggestions(
        projectPath,
        filePath,
        suggestions
      );

      if (result.success) {
        suggestions.forEach(s => markSuggestionApplied(s.id));
        addNotification('success', `Applied ${suggestions.length} changes`);
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply changes';
      addNotification('error', message);
      return null;
    }
  }, [projectPath, markSuggestionApplied, addNotification]);

  const revert = useCallback(async (modificationId: string) => {
    if (!projectPath) {
      addNotification('error', 'No project path configured');
      return false;
    }

    try {
      const result = await api.revertModification(projectPath, modificationId);

      if (result.reverted) {
        addNotification('success', 'Change reverted successfully');
      }

      return result.reverted;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revert';
      addNotification('error', message);
      return false;
    }
  }, [projectPath, addNotification]);

  const preview = useCallback(async (
    filePath: string,
    originalCode: string,
    modifiedCode: string
  ) => {
    if (!projectPath) return null;

    try {
      return await api.previewModification(
        projectPath,
        filePath,
        originalCode,
        modifiedCode
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Preview failed';
      addNotification('error', message);
      return null;
    }
  }, [projectPath, addNotification]);

  return {
    selectedSuggestion,
    appliedSuggestions,
    modificationHistory,
    selectSuggestion,
    applySuggestion,
    applyMultiple,
    revert,
    preview,
    openApprovalDialog,
    closeApprovalDialog
  };
}

// ============================================
// useGitOperations
// ============================================

export function useGitOperations() {
  const {
    projectPath,
    gitStatus,
    setGitStatus,
    addNotification
  } = useStore();

  const refreshStatus = useCallback(async () => {
    if (!projectPath) return;

    try {
      const status = await api.getGitStatus(projectPath);
      setGitStatus(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get Git status';
      addNotification('error', message);
    }
  }, [projectPath, setGitStatus, addNotification]);

  // Auto-refresh status periodically
  useEffect(() => {
    if (!projectPath) return;

    refreshStatus();
    const interval = setInterval(refreshStatus, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [projectPath, refreshStatus]);

  const createBranch = useCallback(async (name: string) => {
    if (!projectPath) {
      addNotification('error', 'No project path configured');
      return null;
    }

    try {
      const result = await api.createBranch(projectPath, name);
      addNotification('success', `Created branch: ${result.branchName}`);
      refreshStatus();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create branch';
      addNotification('error', message);
      return null;
    }
  }, [projectPath, addNotification, refreshStatus]);

  const commit = useCallback(async (message: string, files?: string[]) => {
    if (!projectPath) {
      addNotification('error', 'No project path configured');
      return null;
    }

    try {
      const result = await api.commitChanges(projectPath, message, files);
      addNotification('success', 'Changes committed');
      refreshStatus();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Commit failed';
      addNotification('error', message);
      return null;
    }
  }, [projectPath, addNotification, refreshStatus]);

  const revertCommit = useCallback(async (hash: string) => {
    if (!projectPath) {
      addNotification('error', 'No project path configured');
      return false;
    }

    try {
      await api.revertCommit(projectPath, hash);
      addNotification('success', 'Commit reverted');
      refreshStatus();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Revert failed';
      addNotification('error', message);
      return false;
    }
  }, [projectPath, addNotification, refreshStatus]);

  const getHistory = useCallback(async (filePath?: string, limit?: number) => {
    if (!projectPath) return [];

    try {
      return await api.getGitHistory(projectPath, filePath, limit);
    } catch {
      return [];
    }
  }, [projectPath]);

  return {
    gitStatus,
    refreshStatus,
    createBranch,
    commit,
    revertCommit,
    getHistory
  };
}

// ============================================
// useWebSocket
// ============================================

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const {
    setConnected,
    addNotification
  } = useStore();

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      addNotification('info', 'Connected to server');
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      addNotification('error', 'WebSocket connection error');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle different message types
        switch (message.type) {
          case 'FILE_CHANGED':
            addNotification('info', `File changed: ${message.payload.filePath}`);
            break;
          case 'ANALYSIS_COMPLETE':
            // Handle analysis completion
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch {
        console.error('Failed to parse WebSocket message');
      }
    };

    return () => {
      ws.close();
    };
  }, [url, setConnected, addNotification]);

  const send = useCallback((type: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  return { send };
}

// ============================================
// useKeyboardShortcuts
// ============================================

export function useKeyboardShortcuts() {
  const {
    startInspection,
    stopInspection,
    isInspecting
  } = useElementSelection();

  const { analyzeSelected } = useCodeAnalysis();

  const { setActivePanel } = useStore();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Cmd/Ctrl + Shift + I - Toggle inspection
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'i') {
        event.preventDefault();
        if (isInspecting) {
          stopInspection();
        } else {
          startInspection();
        }
      }

      // Cmd/Ctrl + Enter - Analyze selected
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        analyzeSelected();
      }

      // Escape - Cancel inspection or close dialogs
      if (event.key === 'Escape') {
        if (isInspecting) {
          stopInspection();
        }
      }

      // Number keys 1-4 for panel switching
      if (event.key >= '1' && event.key <= '4' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        const panels: Array<'inspector' | 'analysis' | 'history' | 'settings'> = [
          'inspector', 'analysis', 'history', 'settings'
        ];
        const panel = panels[parseInt(event.key) - 1];
        if (panel) {
          setActivePanel(panel);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isInspecting,
    startInspection,
    stopInspection,
    analyzeSelected,
    setActivePanel
  ]);
}
