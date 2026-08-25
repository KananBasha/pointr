interface ComponentInfo {
  name: string;
  file: string;
  props: Record<string, unknown>;
  hooks: string[];
}

function findFiberKey(element: HTMLElement): string | null {
  const keys = Object.keys(element);
  return keys.find(key => key.startsWith('__reactFiber$')) || null;
}

function extractComponentName(fiber: any): string {
  if (!fiber) return 'Unknown';
  if (typeof fiber.type === 'string') return fiber.type;
  if (typeof fiber.type === 'function') return fiber.type.name || 'Anonymous';
  if (fiber.type && typeof fiber.type.render === 'function') return fiber.type.render.name || 'ForwardRef';
  if (fiber.elementType && typeof fiber.elementType.name === 'string') return fiber.elementType.name;
  return 'Unknown';
}

function extractProps(fiber: any): Record<string, unknown> {
  const props = fiber.memoizedProps || {};
  const safeProps: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children') continue;
    if (typeof value === 'function') continue;
    try {
      JSON.stringify(value);
      safeProps[key] = value;
    } catch {
      safeProps[key] = '[Complex Object]';
    }
  }
  return safeProps;
}

function extractHooks(fiber: any): string[] {
  const hooks: string[] = [];
  let currentHook = fiber.memoizedState;
  while (currentHook) {
    hooks.push('hook');
    currentHook = currentHook.next;
  }
  return hooks;
}

function getSourceFile(fiber: any): string {
  return fiber._debugSource?.fileName || 'Unknown file';
}

export function readFiberTree(element: HTMLElement): ComponentInfo[] {
  try {
    const fiberKey = findFiberKey(element);
    if (!fiberKey) return [];

    let fiber = (element as any)[fiberKey];
    const tree: ComponentInfo[] = [];
    let depth = 0;

    while (fiber && depth < 10) {
      if (fiber.type && (typeof fiber.type === 'function' || typeof fiber.type === 'object')) {
        tree.push({
          name: extractComponentName(fiber),
          file: getSourceFile(fiber),
          props: extractProps(fiber),
          hooks: extractHooks(fiber)
        });
        depth++;
      }
      fiber = fiber.return;
    }

    return tree.reverse();
  } catch (e) {
    console.warn('Pointr: Failed to read fiber tree', e);
    return [];
  }
}
