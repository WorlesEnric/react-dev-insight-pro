/**
 * Approval Dialog Component
 * 
 * Modal dialog for reviewing and approving code modifications
 * before they are applied to the codebase.
 */

import React, { useState } from 'react';
import { Modal, Button, Badge, DiffViewer, Toggle, Spinner } from '../ui';
import { useStore } from '../../stores';
import { useModifications, useGitOperations } from '../../hooks';

// Icons
const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const GitBranchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 9v10m8-6a3 3 0 100-6 3 3 0 000 6zm0 0v2a2 2 0 01-2 2H10" 
    />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
    />
  </svg>
);

const BackupIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" 
    />
  </svg>
);

export function ApprovalDialog() {
  const { 
    showApprovalDialog, 
    pendingModification,
    closeApprovalDialog 
  } = useStore();
  
  const selectedElement = useStore(state => state.selectedElement);
  const projectPath = useStore(state => state.projectPath);
  
  const { applySuggestion } = useModifications();
  const { gitStatus } = useGitOperations();
  
  const [isApplying, setIsApplying] = useState(false);
  const [createBranch, setCreateBranch] = useState(false);
  const [branchName, setBranchName] = useState('');
  
  if (!showApprovalDialog || !pendingModification) {
    return null;
  }
  
  const handleApply = async () => {
    if (!selectedElement?.filePath || !projectPath) return;
    
    setIsApplying(true);
    try {
      await applySuggestion(pendingModification, selectedElement.filePath);
    } finally {
      setIsApplying(false);
    }
  };
  
  const hasUncommittedChanges = gitStatus && !gitStatus.isClean;
  
  return (
    <Modal
      isOpen={showApprovalDialog}
      onClose={closeApprovalDialog}
      title="Review & Apply Change"
      size="xl"
    >
      <div className="space-y-6">
        {/* Suggestion Info */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant={pendingModification.priority === 'high' ? 'error' : 'warning'}
              >
                {pendingModification.priority}
              </Badge>
              <Badge variant="info">
                {pendingModification.category}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {pendingModification.title}
            </h3>
            <p className="text-sm text-slate-400">
              {pendingModification.description}
            </p>
          </div>
          
          {pendingModification.confidence && (
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">Confidence</p>
              <p className="text-2xl font-bold text-emerald-400">
                {Math.round(pendingModification.confidence * 100)}%
              </p>
            </div>
          )}
        </div>
        
        {/* Code Changes */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">
            Code Changes
          </h4>
          <DiffViewer
            original={pendingModification.originalCode}
            modified={pendingModification.modifiedCode}
            className="max-h-[300px]"
          />
        </div>
        
        {/* Safety Information */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <BackupIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Backup</span>
            </div>
            <p className="text-xs text-slate-400">
              Original file will be backed up before changes
            </p>
          </div>
          
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <ShieldIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Validation</span>
            </div>
            <p className="text-xs text-slate-400">
              Syntax and safety checks before applying
            </p>
          </div>
          
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
            <div className="flex items-center gap-2 text-violet-400 mb-2">
              <GitBranchIcon />
              <span className="text-xs font-medium uppercase tracking-wider">Git</span>
            </div>
            <p className="text-xs text-slate-400">
              Changes will be committed automatically
            </p>
          </div>
        </div>
        
        {/* Git Warning */}
        {hasUncommittedChanges && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-300">
                  Uncommitted Changes Detected
                </p>
                <p className="text-xs text-amber-400/70 mt-1">
                  You have {gitStatus?.modified?.length || 0} modified files. 
                  Consider committing or stashing them before applying changes.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Options */}
        <div className="space-y-3">
          <Toggle
            checked={createBranch}
            onChange={setCreateBranch}
            label="Create new branch for this change"
          />
          
          {createBranch && (
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Branch name (e.g., fix/button-accessibility)"
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/50">
          <Button
            variant="ghost"
            onClick={closeApprovalDialog}
            disabled={isApplying}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={isApplying ? <Spinner size="sm" /> : <CheckIcon />}
            onClick={handleApply}
            loading={isApplying}
            disabled={createBranch && !branchName.trim()}
          >
            {isApplying ? 'Applying...' : 'Apply Change'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
