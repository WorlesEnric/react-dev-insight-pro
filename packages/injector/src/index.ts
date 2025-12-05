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

// State
const state: ReactDevInsightState = {
  isInspecting: false,
  hoveredElement: null,
  overlay: null,
  tooltip: null
};

/**
 * Robustly find the source location using React's internal Debug Source
 * which is present in almost all Dev builds.
 */
function getSourceFromElement(element: HTMLElement) {
  let current: HTMLElement | null = element;

  // Traverse up the DOM tree
  while (current) {
    // Method 1: Check for React Fiber instance (Standard React Dev Mode)
    const fiberKey = Object.keys(current).find(key =>
      key.startsWith('__reactFiber$')
    );

    if (fiberKey) {
      // @ts-ignore
      const fiber = current[fiberKey] as FiberNode;

      // Traverse up the Fiber tree from this DOM node
      let fiberNode: FiberNode | null = fiber;
      while (fiberNode) {
        // _debugSource contains { fileName, lineNumber }
        if (fiberNode._debugSource) {
          return {
            fileName: fiberNode._debugSource.fileName,
            lineNumber: fiberNode._debugSource.lineNumber,
            // Try to get the component name from the function/class type
            componentName: getComponentName(fiberNode)
          };
        }
        fiberNode = fiberNode.return;
      }
    }

    // Method 2: Check for explicit data attributes (if Method 1 fails)
    // This requires the babel plugin mentioned in Step 1
    if (current.dataset.sourceFile) {
      return {
        fileName: current.dataset.sourceFile,
        lineNumber: parseInt(current.dataset.sourceLine || '0', 10),
        componentName: current.dataset.componentName || 'Unknown'
      };
    }

    current = current.parentElement;
  }

  return null;
}

/**
 * Helper to extract component name from fiber type
 */
function getComponentName(fiber: FiberNode): string {
  const { type } = fiber;

  if (!type) return 'Unknown';
  if (typeof type === 'string') return type;
  if (typeof type === 'function') {
    return (type as { displayName?: string; name?: string }).displayName || type.name || 'Anonymous';
  }
  if (typeof type === 'object') {
    // @ts-ignore
    if (type.displayName) return type.displayName;
    // @ts-ignore
    if (type.type) return getComponentName({ ...fiber, type: type.type });
  }
  return 'Anonymous';
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
 * Handle mouse move during inspection
 */
function handleMouseMove(event: MouseEvent): void {
  if (!state.isInspecting) return;

  const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;

  if (!element || element === state.hoveredElement) return;
  if (element.id === 'react-dev-insight-overlay' || element.id === 'react-dev-insight-tooltip') return;

  state.hoveredElement = element;

  const sourceInfo = getSourceFromElement(element);

  if (sourceInfo) {
    positionOverlay(element);
    positionTooltip(event.clientX, event.clientY, sourceInfo.componentName, sourceInfo.fileName);
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

  const element = state.hoveredElement || (event.target as HTMLElement);
  const sourceInfo = getSourceFromElement(element);

  if (sourceInfo) {
    window.parent.postMessage({
      type: 'ELEMENT_SELECTED',
      payload: {
        componentName: sourceInfo.componentName,
        filePath: sourceInfo.fileName,
        lineNumber: sourceInfo.lineNumber,
        tagName: element.tagName.toLowerCase()
      }
    }, '*');
  } else {
    // Fallback
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
  getSourceFromElement
};
