import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * Test environment setup.
 *
 * jsdom implements the DOM but not the browser APIs around it. The stubs below
 * are the ones this app actually touches, and they are installed at **module
 * scope** rather than inside a `beforeAll`.
 *
 * That distinction matters: setup files are evaluated before test modules are
 * imported, but `beforeAll` runs after. The theme store reads `matchMedia`
 * while it is being imported — to resolve the initial theme before first paint —
 * so a stub registered in `beforeAll` would arrive far too late.
 */

// Motion, the theme store and the responsive charts all read `matchMedia`.
// Reporting "no match" resolves to the light theme and full motion, which is
// the state the assertions are written against.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

/** Motion's `useInView` and Recharts' container both observe elements jsdom never lays out. */
class MockObserver {
  observe(): void {
    return undefined;
  }
  unobserve(): void {
    return undefined;
  }
  disconnect(): void {
    return undefined;
  }
  takeRecords(): [] {
    return [];
  }
}

vi.stubGlobal('IntersectionObserver', MockObserver);
vi.stubGlobal('ResizeObserver', MockObserver);

// jsdom has no layout engine, so every element measures zero and
// `ResponsiveContainer` renders nothing. A fixed size lets charts mount.
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 400 });

window.scrollTo = vi.fn();

// Unmounts everything between tests so a leaked component from one test cannot
// satisfy a query in the next.
afterEach(() => {
  cleanup();
});
