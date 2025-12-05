/**
 * Settings Panel Component
 * 
 * Configuration panel for project path, Git settings,
 * and other preferences.
 */

import { useState, useEffect } from 'react';
import { Button, Input, Toggle, Card, Badge } from '../ui';
import { useStore } from '../../stores';
import { useGitOperations } from '../../hooks';
import * as api from '../../services/api';

// Icons
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const GitBranchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 9v10m8-6a3 3 0 100-6 3 3 0 000 6zm0 0v2a2 2 0 01-2 2H10"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ServerIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
    />
  </svg>
);

export function SettingsPanel() {
  const { projectPath, setProjectPath, addNotification } = useStore();
  const { gitStatus, refreshStatus } = useGitOperations();

  const [localPath, setLocalPath] = useState(projectPath || '');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [serverStatus, setServerStatus] = useState<{
    status: string;
    version: string;
    uptime: number;
  } | null>(null);

  // Settings state
  const [autoCommit, setAutoCommit] = useState(true);
  const [createBackups, setCreateBackups] = useState(true);
  const [requireCleanWorkdir, setRequireCleanWorkdir] = useState(true);

  // Check server health on mount
  useEffect(() => {
    api.healthCheck()
      .then(setServerStatus)
      .catch(() => setServerStatus(null));
  }, []);

  const validatePath = async () => {
    if (!localPath.trim()) {
      setIsValid(false);
      return;
    }

    setIsValidating(true);
    try {
      const files = await api.listReactFiles(localPath);
      setIsValid(files.length > 0);
      if (files.length > 0) {
        setProjectPath(localPath);
        refreshStatus();
        addNotification('success', `Found ${files.length} React files`);
      } else {
        addNotification('warning', 'No React files found in this directory');
      }
    } catch {
      setIsValid(false);
      addNotification('error', 'Invalid project path');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <SettingsIcon />
          Settings
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Server Status */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              ${serverStatus ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}
            `}>
              <ServerIcon />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-200">Server Status</h3>
              <p className="text-xs text-slate-400">
                {serverStatus
                  ? `Connected • v${serverStatus.version}`
                  : 'Not connected'
                }
              </p>
            </div>
            <Badge
              variant={serverStatus ? 'success' : 'error'}
              className="ml-auto"
            >
              {serverStatus ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </Card>

        {/* Project Path */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FolderIcon />
            Project Configuration
          </h3>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={localPath}
                onChange={(e) => {
                  setLocalPath(e.target.value);
                  setIsValid(null);
                }}
                placeholder="/path/to/react/project"
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={validatePath}
                loading={isValidating}
                disabled={!localPath.trim()}
              >
                {isValidating ? 'Checking...' : 'Connect'}
              </Button>
            </div>

            {isValid !== null && (
              <div className={`
                flex items-center gap-2 text-xs
                ${isValid ? 'text-emerald-400' : 'text-red-400'}
              `}>
                {isValid ? (
                  <>
                    <CheckIcon />
                    <span>Valid React project</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Invalid path or no React files found</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Git Status */}
        {gitStatus && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <GitBranchIcon />
              Git Status
            </h3>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Branch</span>
                <code className="text-sm text-emerald-400 font-mono">
                  {gitStatus.branch}
                </code>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Status</span>
                <Badge variant={gitStatus.isClean ? 'success' : 'warning'}>
                  {gitStatus.isClean ? 'Clean' : 'Modified'}
                </Badge>
              </div>

              {!gitStatus.isClean && (
                <>
                  {gitStatus.staged && gitStatus.staged.length > 0 && (
                    <div className="text-xs text-slate-400">
                      {gitStatus.staged.length} staged
                    </div>
                  )}
                  {gitStatus.modified && gitStatus.modified.length > 0 && (
                    <div className="text-xs text-slate-400">
                      {gitStatus.modified.length} modified
                    </div>
                  )}
                  {gitStatus.untracked && gitStatus.untracked.length > 0 && (
                    <div className="text-xs text-slate-400">
                      {gitStatus.untracked.length} untracked
                    </div>
                  )}
                </>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={refreshStatus}
                className="w-full"
              >
                Refresh Status
              </Button>
            </Card>
          </div>
        )}

        {/* Modification Settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Modification Settings
          </h3>

          <Card className="p-4 space-y-4">
            <Toggle
              checked={autoCommit}
              onChange={setAutoCommit}
              label="Auto-commit changes"
            />

            <Toggle
              checked={createBackups}
              onChange={setCreateBackups}
              label="Create backups before modifications"
            />

            <Toggle
              checked={requireCleanWorkdir}
              onChange={setRequireCleanWorkdir}
              label="Require clean working directory"
            />
          </Card>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Keyboard Shortcuts
          </h3>

          <Card className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Toggle inspection</span>
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300 text-xs font-mono">
                  ⌘ + Shift + I
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Analyze selected</span>
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300 text-xs font-mono">
                  ⌘ + Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cancel / Close</span>
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300 text-xs font-mono">
                  Esc
                </kbd>
              </div>
            </div>
          </Card>
        </div>

        {/* Version Info */}
        <div className="pt-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 text-center">
            React Dev Insight Pro v1.0.0
          </p>
          <p className="text-xs text-slate-600 text-center mt-1">
            Powered by Claude AI
          </p>
        </div>
      </div>
    </div>
  );
}
