/**
 * Advanced UI Components
 * 
 * Modal dialogs, tabbed interfaces, and specialized components
 * for the developer tools interface.
 */

import React, { useEffect, useCallback, useState, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './base';

// ============================================
// Modal Component
// ============================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showClose = true 
}: ModalProps) {
  // Handle escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className={`
        relative ${sizes[size]} w-full
        bg-gradient-to-b from-slate-800 to-slate-900
        border border-slate-700/50
        rounded-2xl
        shadow-2xl shadow-slate-950/50
        animate-in fade-in zoom-in-95 duration-200
      `}>
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
            {title && (
              <h2 className="text-lg font-semibold text-slate-100 tracking-tight">
                {title}
              </h2>
            )}
            {showClose && (
              <IconButton
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }
                onClick={onClose}
                tooltip="Close"
              />
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================
// Tabs Component
// ============================================

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  defaultTab?: string;
  children: React.ReactNode;
  className?: string;
  onChange?: (tabId: string) => void;
}

export function Tabs({ defaultTab, children, className = '', onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || '');
  
  const handleSetActiveTab = useCallback((id: string) => {
    setActiveTab(id);
    onChange?.(id);
  }, [onChange]);
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabList({ children, className = '' }: TabListProps) {
  return (
    <div className={`
      flex gap-1 p-1
      bg-slate-800/50 
      rounded-lg
      border border-slate-700/30
      ${className}
    `}>
      {children}
    </div>
  );
}

interface TabProps {
  id: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
}

export function Tab({ id, children, icon, badge }: TabProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');
  
  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === id;
  
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`
        flex items-center gap-2 px-4 py-2
        text-sm font-medium
        rounded-md
        transition-all duration-200
        ${isActive 
          ? 'bg-slate-700/80 text-white shadow-sm' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
        }
      `}
    >
      {icon}
      {children}
      {badge !== undefined && (
        <span className={`
          px-1.5 py-0.5 
          text-[10px] font-mono
          rounded-full
          ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-600/50 text-slate-400'}
        `}>
          {badge}
        </span>
      )}
    </button>
  );
}

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ id, children, className = '' }: TabPanelProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');
  
  if (context.activeTab !== id) return null;
  
  return (
    <div className={`animate-in fade-in duration-200 ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// DiffViewer Component
// ============================================

interface DiffViewerProps {
  original: string;
  modified: string;
  language?: string;
  className?: string;
}

export function DiffViewer({ original, modified, className = '' }: DiffViewerProps) {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  // Simple line-by-line diff
  const diffLines = computeDiff(originalLines, modifiedLines);
  
  return (
    <div className={`
      font-mono text-sm
      bg-slate-900/50
      border border-slate-700/50
      rounded-lg
      overflow-hidden
      ${className}
    `}>
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50" />
          <span>Removed</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
          <span>Added</span>
        </div>
      </div>
      
      {/* Diff content */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            {diffLines.map((line, index) => (
              <tr 
                key={index}
                className={`
                  ${line.type === 'removed' ? 'bg-red-500/10' : ''}
                  ${line.type === 'added' ? 'bg-emerald-500/10' : ''}
                `}
              >
                <td className="w-12 px-3 py-0.5 text-right text-slate-600 select-none border-r border-slate-700/30">
                  {line.oldLineNumber || ''}
                </td>
                <td className="w-12 px-3 py-0.5 text-right text-slate-600 select-none border-r border-slate-700/30">
                  {line.newLineNumber || ''}
                </td>
                <td className="w-6 px-2 py-0.5 text-center select-none">
                  {line.type === 'removed' && <span className="text-red-400">−</span>}
                  {line.type === 'added' && <span className="text-emerald-400">+</span>}
                </td>
                <td className={`
                  px-4 py-0.5 whitespace-pre
                  ${line.type === 'removed' ? 'text-red-300' : ''}
                  ${line.type === 'added' ? 'text-emerald-300' : ''}
                  ${line.type === 'unchanged' ? 'text-slate-400' : ''}
                `}>
                  {line.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  
  // Simple Myers-like diff algorithm
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex >= oldLines.length) {
      // Remaining new lines are additions
      result.push({
        type: 'added',
        content: newLines[newIndex]!,
        newLineNumber: newIndex + 1
      });
      newIndex++;
    } else if (newIndex >= newLines.length) {
      // Remaining old lines are removals
      result.push({
        type: 'removed',
        content: oldLines[oldIndex]!,
        oldLineNumber: oldIndex + 1
      });
      oldIndex++;
    } else if (oldLines[oldIndex] === newLines[newIndex]) {
      // Lines match
      result.push({
        type: 'unchanged',
        content: oldLines[oldIndex]!,
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1
      });
      oldIndex++;
      newIndex++;
    } else {
      // Lines differ - check if it's a modification or add/remove
      const oldInNew = newLines.indexOf(oldLines[oldIndex]!, newIndex);
      const newInOld = oldLines.indexOf(newLines[newIndex]!, oldIndex);
      
      if (oldInNew === -1 && newInOld === -1) {
        // Modified line - show as remove then add
        result.push({
          type: 'removed',
          content: oldLines[oldIndex]!,
          oldLineNumber: oldIndex + 1
        });
        result.push({
          type: 'added',
          content: newLines[newIndex]!,
          newLineNumber: newIndex + 1
        });
        oldIndex++;
        newIndex++;
      } else if (oldInNew === -1 || (newInOld !== -1 && newInOld < oldInNew)) {
        // Line removed
        result.push({
          type: 'removed',
          content: oldLines[oldIndex]!,
          oldLineNumber: oldIndex + 1
        });
        oldIndex++;
      } else {
        // Line added
        result.push({
          type: 'added',
          content: newLines[newIndex]!,
          newLineNumber: newIndex + 1
        });
        newIndex++;
      }
    }
  }
  
  return result;
}

// ============================================
// CodeBlock Component
// ============================================

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  className?: string;
  maxHeight?: string;
}

export function CodeBlock({ 
  code, 
  showLineNumbers = true,
  highlightLines = [],
  className = '',
  maxHeight = '400px'
}: CodeBlockProps) {
  const lines = code.split('\n');
  
  return (
    <div className={`
      font-mono text-sm
      bg-slate-900/80
      border border-slate-700/50
      rounded-lg
      overflow-hidden
      ${className}
    `}>
      <div 
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <table className="w-full">
          <tbody>
            {lines.map((line, index) => (
              <tr 
                key={index}
                className={highlightLines.includes(index + 1) ? 'bg-amber-500/10' : ''}
              >
                {showLineNumbers && (
                  <td className="w-12 px-3 py-0.5 text-right text-slate-600 select-none border-r border-slate-700/30 sticky left-0 bg-slate-900/80">
                    {index + 1}
                  </td>
                )}
                <td className="px-4 py-0.5 whitespace-pre text-slate-300">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// Select Component
// ============================================

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  className?: string;
}

export function Select({ 
  value, 
  onChange, 
  options, 
  placeholder,
  label,
  className = '' 
}: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-4 py-2.5
          bg-slate-800/50 
          border border-slate-700/50
          rounded-lg
          text-slate-200 text-sm
          focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
          transition-all duration-200
          appearance-none
          cursor-pointer
          ${className}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundPosition: 'right 12px center',
          backgroundSize: '16px',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================
// Toggle Component
// ============================================

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <label className={`
      inline-flex items-center gap-3 
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11
          items-center rounded-full
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-slate-900
          ${checked ? 'bg-emerald-500' : 'bg-slate-700'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 
            rounded-full bg-white
            shadow-sm
            transition-transform duration-200
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      {label && (
        <span className="text-sm text-slate-300">{label}</span>
      )}
    </label>
  );
}
