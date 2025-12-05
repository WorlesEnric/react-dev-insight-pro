/**
 * Global Store
 * 
 * Zustand-based state management for React Dev Insight Pro.
 * Manages selected elements, analysis results, modification history,
 * and UI state.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  SelectedElement, 
  AnalysisResult, 
  CodeSuggestion, 
  ModificationEntry,
  GitStatus,
  OptimizationCategory 
} from '../types';

interface InspectorState {
  // Connection
  isConnected: boolean;
  projectPath: string | null;
  
  // Selection
  selectedElement: SelectedElement | null;
  isInspecting: boolean;
  
  // Analysis
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  selectedCategories: OptimizationCategory[];
  
  // Suggestions
  selectedSuggestion: CodeSuggestion | null;
  appliedSuggestions: string[];
  
  // Git
  gitStatus: GitStatus | null;
  
  // History
  modificationHistory: ModificationEntry[];
  
  // UI State
  activePanel: 'inspector' | 'analysis' | 'history' | 'settings';
  showApprovalDialog: boolean;
  pendingModification: CodeSuggestion | null;
  
  // Toast notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    timestamp: number;
  }>;
}

interface InspectorActions {
  // Connection
  setConnected: (connected: boolean) => void;
  setProjectPath: (path: string | null) => void;
  
  // Selection
  setSelectedElement: (element: SelectedElement | null) => void;
  setInspecting: (inspecting: boolean) => void;
  clearSelection: () => void;
  
  // Analysis
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setAnalysisError: (error: string | null) => void;
  setSelectedCategories: (categories: OptimizationCategory[]) => void;
  toggleCategory: (category: OptimizationCategory) => void;
  
  // Suggestions
  selectSuggestion: (suggestion: CodeSuggestion | null) => void;
  markSuggestionApplied: (suggestionId: string) => void;
  resetAppliedSuggestions: () => void;
  
  // Git
  setGitStatus: (status: GitStatus | null) => void;
  
  // History
  addModificationEntry: (entry: ModificationEntry) => void;
  clearHistory: () => void;
  
  // UI State
  setActivePanel: (panel: InspectorState['activePanel']) => void;
  openApprovalDialog: (suggestion: CodeSuggestion) => void;
  closeApprovalDialog: () => void;
  
  // Notifications
  addNotification: (type: InspectorState['notifications'][0]['type'], message: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Reset
  reset: () => void;
}

const initialState: InspectorState = {
  isConnected: false,
  projectPath: null,
  selectedElement: null,
  isInspecting: false,
  analysisResult: null,
  isAnalyzing: false,
  analysisError: null,
  selectedCategories: ['performance', 'accessibility', 'maintainability'],
  selectedSuggestion: null,
  appliedSuggestions: [],
  gitStatus: null,
  modificationHistory: [],
  activePanel: 'inspector',
  showApprovalDialog: false,
  pendingModification: null,
  notifications: []
};

export const useStore = create<InspectorState & InspectorActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Connection
        setConnected: (connected) => set({ isConnected: connected }),
        setProjectPath: (path) => set({ projectPath: path }),
        
        // Selection
        setSelectedElement: (element) => set({ 
          selectedElement: element,
          analysisResult: null,
          analysisError: null,
          selectedSuggestion: null
        }),
        setInspecting: (inspecting) => set({ isInspecting: inspecting }),
        clearSelection: () => set({ 
          selectedElement: null, 
          analysisResult: null,
          selectedSuggestion: null 
        }),
        
        // Analysis
        setAnalysisResult: (result) => set({ 
          analysisResult: result,
          isAnalyzing: false,
          analysisError: null
        }),
        setAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
        setAnalysisError: (error) => set({ 
          analysisError: error,
          isAnalyzing: false
        }),
        setSelectedCategories: (categories) => set({ selectedCategories: categories }),
        toggleCategory: (category) => {
          const current = get().selectedCategories;
          const updated = current.includes(category)
            ? current.filter(c => c !== category)
            : [...current, category];
          set({ selectedCategories: updated });
        },
        
        // Suggestions
        selectSuggestion: (suggestion) => set({ selectedSuggestion: suggestion }),
        markSuggestionApplied: (suggestionId) => set(state => ({
          appliedSuggestions: [...state.appliedSuggestions, suggestionId]
        })),
        resetAppliedSuggestions: () => set({ appliedSuggestions: [] }),
        
        // Git
        setGitStatus: (status) => set({ gitStatus: status }),
        
        // History
        addModificationEntry: (entry) => set(state => ({
          modificationHistory: [entry, ...state.modificationHistory].slice(0, 100)
        })),
        clearHistory: () => set({ modificationHistory: [] }),
        
        // UI State
        setActivePanel: (panel) => set({ activePanel: panel }),
        openApprovalDialog: (suggestion) => set({ 
          showApprovalDialog: true,
          pendingModification: suggestion
        }),
        closeApprovalDialog: () => set({ 
          showApprovalDialog: false,
          pendingModification: null
        }),
        
        // Notifications
        addNotification: (type, message) => {
          const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          set(state => ({
            notifications: [
              ...state.notifications,
              { id, type, message, timestamp: Date.now() }
            ].slice(-5) // Keep only last 5 notifications
          }));
          
          // Auto-remove after 5 seconds
          setTimeout(() => {
            get().removeNotification(id);
          }, 5000);
        },
        removeNotification: (id) => set(state => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
        clearNotifications: () => set({ notifications: [] }),
        
        // Reset
        reset: () => set(initialState)
      }),
      {
        name: 'react-dev-insight-storage',
        partialize: (state) => ({
          projectPath: state.projectPath,
          selectedCategories: state.selectedCategories,
          modificationHistory: state.modificationHistory
        })
      }
    )
  )
);

// Selector hooks for optimized re-renders
export const useSelectedElement = () => useStore(state => state.selectedElement);
export const useAnalysisResult = () => useStore(state => state.analysisResult);
export const useIsAnalyzing = () => useStore(state => state.isAnalyzing);
export const useSelectedSuggestion = () => useStore(state => state.selectedSuggestion);
export const useGitStatus = () => useStore(state => state.gitStatus);
export const useNotifications = () => useStore(state => state.notifications);
export const useActivePanel = () => useStore(state => state.activePanel);
