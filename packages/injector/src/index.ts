/**
 * React Dev Insight Pro - Injector Script
 * 
 * This script is injected into the target React application to enable
 * element inspection and component identification. It communicates with
 * the parent frame (the dev tool) via postMessage.
 */

// Types for React Fiber internals
interface FiberNode {
  tag: number;
  type: string | Function | null;
  stateNode: HTMLElement | null;
  return: FiberNode | null;
  child: FiberNode | null;
  sibling: FiberNode | null;
  memoizedProps: Record<string, unknown>;
  memoizedState: unknown;
  _debugSource?: {
    fileName: string;
    lineNumber: number;
    columnNumber?: number;
  };
  _debugOwner?: FiberNode;
}

interface ReactDevInsightState {
  isInspecting: boolean;
  hoveredElement: HTMLElement | null;
  overlay: HTMLDivElement | null;
  tooltip: HTMLDivElement | null;
}

// React Fiber tag constants
const FIBER_TAGS = {
  FunctionComponent: 0,
  ClassComponent: 1,
  HostRoot: 3,
  HostComponent: 5,
  HostText: 6,
  ForwardRef: 11,
  MemoComponent: 14,
  SimpleMemoComponent: 15,
  LazyComponent: 16
};

// State
const state: ReactDevInsightState = {
  isInspecting: false,
  hoveredElement: null,
  overlay: null,
  tooltip: null
};

/**
 * Find the React Fiber node for a DOM element
 */
function findFiberNode(element: HTMLElement): FiberNode | null {
  // React 18+ uses __reactFiber$ prefix
  const fiberKey = Object.keys(element).find(
    key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
  );
  
  if (fiberKey) {
    return (element as unknown as Record<string, FiberNode>)[fiberKey] ?? null;
  }
  
  return null;
}

/**
 * Find the nearest React component (function or class) from a fiber node
 */
function findNearestComponent(fiber: FiberNode | null): FiberNode | null {
  let current = fiber;
  
  while (current) {
    const { tag } = current;
    
    // Check if this is a function or class component
    if (
      tag === FIBER_TAGS.FunctionComponent ||
      tag === FIBER_TAGS.ClassComponent ||
      tag === FIBER_TAGS.ForwardRef ||
      tag === FIBER_TAGS.MemoComponent ||
      tag === FIBER_TAGS.SimpleMemoComponent
    ) {
      // Skip anonymous or internal components
      const name = getComponentName(current);
      if (name && !name.startsWith('_') && name !== 'Anonymous') {
        return current;
      }
    }
    
    current = current.return;
  }
  
  return null;
}

/**
 * Get the display name of a component from its fiber
 */
function getComponentName(fiber: FiberNode): string {
  const { type } = fiber;
  
  if (!type) return 'Unknown';
  
  if (typeof type === 'string') {
    return type; // Host component (div, span, etc.)
  }
  
  if (typeof type === 'function') {
    return (type as { displayName?: string; name?: string }).displayName || type.name || 'Anonymous';
  }
  
  // Handle ForwardRef, Memo, etc.
  if (typeof type === 'object') {
    if ('displayName' in type) {
      return (type as { displayName: string }).displayName;
    }
    if ('render' in type && typeof (type as { render: Function }).render === 'function') {
      const render = (type as { render: Function }).render;
      return (render as { displayName?: string; name?: string }).displayName || render.name || 'ForwardRef';
    }
    if ('type' in type) {
      return getComponentName({ ...fiber, type: (type as { type: FiberNode['type'] }).type });
    }
  }
  
  return 'Unknown';
}

/**
 * Extract props from a fiber node (sanitized for display)
 */
function extractProps(fiber: FiberNode): Record<string, unknown> {
  const props = fiber.memoizedProps || {};
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(props)) {
    // Skip children and internal props
    if (key === 'children' || key.startsWith('__')) continue;
    
    // Sanitize values for display
    if (typeof value === 'function') {
      sanitized[key] = '[Function]';
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        sanitized[key] = `[Array(${value.length})]`;
      } else {
        sanitized[key] = '[Object]';
      }
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Get the source file location for a component
 */
function getSourceLocation(fiber: FiberNode): { fileName: string; lineNumber: number } | null {
  // Check for debug source info (development builds)
  if (fiber._debugSource) {
    return {
      fileName: fiber._debugSource.fileName,
      lineNumber: fiber._debugSource.lineNumber
    };
  }
  
  // Try to get from component function
  const { type } = fiber;
  if (typeof type === 'function' && '__source' in type) {
    const source = (type as { __source: { fileName: string; lineNumber: number } }).__source;
    return source;
  }
  
  return null;
}

/**
 * Create the highlight overlay element
 */
function createOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.id = 'react-dev-insight-overlay';
  overlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 999999;
    background: rgba(16, 185, 129, 0.1);
    border: 2px solid rgba(16, 185, 129, 0.8);
    border-radius: 4px;
    transition: all 0.1s ease-out;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
  `;
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * Create the tooltip element
 */
function createTooltip(): HTMLDivElement {
  const tooltip = document.createElement('div');
  tooltip.id = 'react-dev-insight-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    z-index: 999999;
    pointer-events: none;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 8px;
    padding: 8px 12px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 12px;
    color: #f1f5f9;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    max-width: 300px;
    backdrop-filter: blur(8px);
  `;
  document.body.appendChild(tooltip);
  return tooltip;
}

/**
 * Position the overlay over an element
 */
function positionOverlay(element: HTMLElement): void {
  if (!state.overlay) return;
  
  const rect = element.getBoundingClientRect();
  state.overlay.style.top = `${rect.top}px`;
  state.overlay.style.left = `${rect.left}px`;
  state.overlay.style.width = `${rect.width}px`;
  state.overlay.style.height = `${rect.height}px`;
  state.overlay.style.display = 'block';
}

/**
 * Position the tooltip near the cursor
 */
function positionTooltip(x: number, y: number, componentName: string, filePath?: string): void {
  if (!state.tooltip) return;
  
  let html = `<span style="color: #10b981; font-weight: 600;">&lt;${componentName} /&gt;</span>`;
  
  if (filePath) {
    const shortPath = filePath.split('/').slice(-2).join('/');
    html += `<br><span style="color: #64748b; font-size: 10px;">${shortPath}</span>`;
  }
  
  state.tooltip.innerHTML = html;
  
  // Position tooltip to avoid going off-screen
  const tooltipRect = state.tooltip.getBoundingClientRect();
  let tooltipX = x + 15;
  let tooltipY = y + 15;
  
  if (tooltipX + tooltipRect.width > window.innerWidth) {
    tooltipX = x - tooltipRect.width - 15;
  }
  
  if (tooltipY + tooltipRect.height > window.innerHeight) {
    tooltipY = y - tooltipRect.height - 15;
  }
  
  state.tooltip.style.left = `${tooltipX}px`;
  state.tooltip.style.top = `${tooltipY}px`;
  state.tooltip.style.display = 'block';
}

/**
 * Hide overlay and tooltip
 */
function hideHighlight(): void {
  if (state.overlay) {
    state.overlay.style.display = 'none';
  }
  if (state.tooltip) {
    state.tooltip.style.display = 'none';
  }
}

/**
 * Handle mouse move during inspection
 */
function handleMouseMove(event: MouseEvent): void {
  if (!state.isInspecting) return;
  
  const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;
  
  if (!element || element === state.hoveredElement) return;
  if (element.id === 'react-dev-insight-overlay' || element.id === 'react-dev-insight-tooltip') return;
  
  state.hoveredElement = element;
  
  // Find React fiber
  const fiber = findFiberNode(element);
  const componentFiber = findNearestComponent(fiber);
  
  if (componentFiber) {
    const name = getComponentName(componentFiber);
    const source = getSourceLocation(componentFiber);
    
    positionOverlay(element);
    positionTooltip(event.clientX, event.clientY, name, source?.fileName);
  } else {
    // Show native element info
    positionOverlay(element);
    positionTooltip(event.clientX, event.clientY, element.tagName.toLowerCase());
  }
}

/**
 * Handle click during inspection
 */
function handleClick(event: MouseEvent): void {
  if (!state.isInspecting) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  const element = state.hoveredElement;
  if (!element) return;
  
  // Find React component
  const fiber = findFiberNode(element);
  const componentFiber = findNearestComponent(fiber);
  
  if (componentFiber) {
    const name = getComponentName(componentFiber);
    const source = getSourceLocation(componentFiber);
    const props = extractProps(componentFiber);
    
    // Send selection to parent frame
    window.parent.postMessage({
      type: 'ELEMENT_SELECTED',
      payload: {
        componentName: name,
        filePath: source?.fileName || 'Unknown',
        lineNumber: source?.lineNumber,
        props,
        tagName: element.tagName.toLowerCase()
      }
    }, '*');
  } else {
    // Native element
    window.parent.postMessage({
      type: 'ELEMENT_SELECTED',
      payload: {
        componentName: element.tagName.toLowerCase(),
        filePath: 'Native HTML Element',
        tagName: element.tagName.toLowerCase()
      }
    }, '*');
  }
  
  stopInspection();
}

/**
 * Handle escape key to cancel inspection
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && state.isInspecting) {
    stopInspection();
    window.parent.postMessage({ type: 'INSPECTION_CANCELLED' }, '*');
  }
}

/**
 * Start inspection mode
 */
function startInspection(): void {
  if (state.isInspecting) return;
  
  state.isInspecting = true;
  state.overlay = createOverlay();
  state.tooltip = createTooltip();
  
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
  
  // Change cursor
  document.body.style.cursor = 'crosshair';
  
  window.parent.postMessage({ type: 'INSPECTION_STARTED' }, '*');
}

/**
 * Stop inspection mode
 */
function stopInspection(): void {
  if (!state.isInspecting) return;
  
  state.isInspecting = false;
  state.hoveredElement = null;
  
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);
  
  // Restore cursor
  document.body.style.cursor = '';
  
  // Remove overlay and tooltip
  if (state.overlay) {
    state.overlay.remove();
    state.overlay = null;
  }
  if (state.tooltip) {
    state.tooltip.remove();
    state.tooltip = null;
  }
}

/**
 * Handle messages from parent frame
 */
function handleMessage(event: MessageEvent): void {
  const { type } = event.data || {};
  
  switch (type) {
    case 'START_INSPECTION':
      startInspection();
      break;
    case 'STOP_INSPECTION':
      stopInspection();
      break;
    case 'PING':
      window.parent.postMessage({ type: 'PONG' }, '*');
      break;
  }
}

/**
 * Initialize the injector
 */
function initialize(): void {
  // Listen for messages from parent
  window.addEventListener('message', handleMessage);
  
  // Notify parent that injector is ready
  window.parent.postMessage({ type: 'INJECTOR_READY' }, '*');
  
  console.log('[React Dev Insight Pro] Injector initialized');
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Export for manual use
export {
  startInspection,
  stopInspection,
  findFiberNode,
  findNearestComponent,
  getComponentName
};
