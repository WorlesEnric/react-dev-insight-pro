/**
 * Notifications Component
 * 
 * Toast notification system for displaying success, error,
 * and info messages to the user.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { useNotifications, useStore } from '../stores';

// Icons
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
    />
  </svg>
);

const typeConfig = {
  success: {
    icon: <CheckIcon />,
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20'
  },
  error: {
    icon: <ErrorIcon />,
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    iconBg: 'bg-red-500/20'
  },
  info: {
    icon: <InfoIcon />,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    iconBg: 'bg-blue-500/20'
  },
  warning: {
    icon: <WarningIcon />,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    iconBg: 'bg-amber-500/20'
  }
};

export function Notifications() {
  const notifications = useNotifications();
  const removeNotification = useStore(state => state.removeNotification);
  
  if (notifications.length === 0) return null;
  
  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.map((notification) => {
        const config = typeConfig[notification.type];
        
        return (
          <div
            key={notification.id}
            className={`
              pointer-events-auto
              flex items-center gap-3
              px-4 py-3
              ${config.bg} ${config.border}
              border rounded-lg
              shadow-lg shadow-slate-950/50
              backdrop-blur-sm
              animate-in slide-in-from-right fade-in duration-300
              max-w-sm
            `}
          >
            <div className={`
              flex-shrink-0 w-8 h-8 rounded-lg
              ${config.iconBg} ${config.text}
              flex items-center justify-center
            `}>
              {config.icon}
            </div>
            
            <p className={`flex-1 text-sm ${config.text}`}>
              {notification.message}
            </p>
            
            <button
              onClick={() => removeNotification(notification.id)}
              className={`
                flex-shrink-0 p-1 rounded
                ${config.text} opacity-60 hover:opacity-100
                transition-opacity
              `}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
