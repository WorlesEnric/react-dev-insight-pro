/**
 * History Panel Component
 * 
 * Displays modification history with the ability to view details
 * and revert changes.
 */

import { useState, useEffect } from 'react';
import { Button, Badge, Card, Spinner } from '../ui';
import { useStore } from '../../stores';
import { useModifications, useGitOperations } from '../../hooks';

import type { ModificationEntry } from '../../types';

// Icons
const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RevertIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const XCircleIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const FileIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const GitCommitIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return 'Just now';
  } else if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

interface HistoryItemProps {
  entry: ModificationEntry;
  onRevert: () => void;
  isReverting: boolean;
}

function HistoryItem({ entry, onRevert, isReverting }: HistoryItemProps) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    applied: { color: 'emerald', icon: <CheckCircleIcon />, label: 'Applied' },
    reverted: { color: 'amber', icon: <RevertIcon />, label: 'Reverted' },
    failed: { color: 'red', icon: <XCircleIcon />, label: 'Failed' }
  };

  const status = statusConfig[entry.status];

  return (
    <Card className={`${expanded ? 'ring-1 ring-slate-600/50' : ''}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={status.color as 'success' | 'warning' | 'error'} size="sm">
                {status.icon}
                {status.label}
              </Badge>
              {entry.suggestion && (
                <Badge variant="info" size="sm">
                  {entry.suggestion.category}
                </Badge>
              )}
            </div>

            <h4 className="text-sm font-medium text-slate-200 mb-1 truncate">
              {entry.suggestion?.title || 'Manual modification'}
            </h4>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <FileIcon />
                {entry.filePath.split('/').pop()}
              </span>
              {entry.commitHash && (
                <span className="flex items-center gap-1 font-mono">
                  <GitCommitIcon />
                  {entry.commitHash.slice(0, 7)}
                </span>
              )}
            </div>
          </div>

          <span className="text-xs text-slate-500 flex-shrink-0">
            {formatTime(entry.timestamp)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50 pt-3">
          {entry.suggestion && (
            <>
              <p className="text-sm text-slate-400">
                {entry.suggestion.description}
              </p>

              <div className="text-xs text-slate-500">
                <p>Confidence: {Math.round((entry.suggestion.confidence || 0) * 100)}%</p>
                {entry.suggestion.lineRange && (
                  <p>Lines: {entry.suggestion.lineRange.start}–{entry.suggestion.lineRange.end}</p>
                )}
              </div>
            </>
          )}

          {entry.status === 'applied' && entry.backupId && (
            <Button
              variant="secondary"
              size="sm"
              icon={isReverting ? <Spinner size="sm" /> : <RevertIcon />}
              onClick={(e) => {
                e.stopPropagation();
                onRevert();
              }}
              loading={isReverting}
              disabled={isReverting}
            >
              {isReverting ? 'Reverting...' : 'Revert Change'}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export function HistoryPanel() {
  const projectPath = useStore(state => state.projectPath);
  const { modificationHistory } = useStore();
  const { revert } = useModifications();
  const { getHistory } = useGitOperations();

  const [gitHistory, setGitHistory] = useState<Array<{
    hash: string;
    date: string;
    message: string;
    author: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'modifications' | 'commits'>('modifications');

  // Fetch Git history
  useEffect(() => {
    if (projectPath && activeTab === 'commits') {
      setIsLoading(true);
      getHistory(undefined, 20)
        .then(setGitHistory)
        .finally(() => setIsLoading(false));
    }
  }, [projectPath, activeTab, getHistory]);

  const handleRevert = async (entry: ModificationEntry) => {
    setRevertingId(entry.id);
    try {
      await revert(entry.id);
    } finally {
      setRevertingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <HistoryIcon />
            History
          </h2>
          <Badge variant="default">
            {modificationHistory.length} changes
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg">
          <button
            onClick={() => setActiveTab('modifications')}
            className={`
              flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
              ${activeTab === 'modifications'
                ? 'bg-slate-700/80 text-white'
                : 'text-slate-400 hover:text-slate-300'
              }
            `}
          >
            Modifications
          </button>
          <button
            onClick={() => setActiveTab('commits')}
            className={`
              flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
              ${activeTab === 'commits'
                ? 'bg-slate-700/80 text-white'
                : 'text-slate-400 hover:text-slate-300'
              }
            `}
          >
            Git Commits
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'modifications' ? (
          modificationHistory.length > 0 ? (
            <div className="space-y-3">
              {modificationHistory.map((entry) => (
                <HistoryItem
                  key={entry.id}
                  entry={entry}
                  onRevert={() => handleRevert(entry)}
                  isReverting={revertingId === entry.id}
                />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-500">
                <HistoryIcon />
              </div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">
                No Modifications Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-[200px]">
                Applied changes will appear here. You can revert them at any time.
              </p>
            </div>
          )
        ) : (
          isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : gitHistory.length > 0 ? (
            <div className="space-y-2">
              {gitHistory.map((commit) => (
                <div
                  key={commit.hash}
                  className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-1">
                    <code className="text-xs text-emerald-400 font-mono">
                      {commit.hash.slice(0, 7)}
                    </code>
                    <span className="text-xs text-slate-500">
                      {new Date(commit.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {commit.message}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    by {commit.author}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">
                No Git history available
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
