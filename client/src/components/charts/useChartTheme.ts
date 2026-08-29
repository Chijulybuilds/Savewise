import { useEffect, useState } from 'react';

import { useThemeStore } from '@/store/themeStore';

/**
 * Chart colours, read from the live theme.
 *
 * Recharts writes its colours into SVG presentation attributes (`fill`,
 * `stroke`), and CSS custom properties are *not* resolved there — a literal
 * `hsl(var(--chart-1))` renders as nothing. So the tokens are read off the root
 * element with `getComputedStyle` and handed to Recharts as concrete colours.
 *
 * Re-reading on every theme change is what keeps a chart correct when the user
 * flips to dark mode with a dashboard already on screen.
 */

export interface ChartTheme {
  series: string[];
  grid: string;
  axis: string;
  surface: string;
  border: string;
  ink: string;
  inkMuted: string;
  primary: string;
  positive: string;
  critical: string;
  accent: string;
}

function readToken(styles: CSSStyleDeclaration, name: string, alpha?: number): string {
  const value = styles.getPropertyValue(name).trim();
  if (!value) return 'transparent';
  return alpha === undefined ? `hsl(${value})` : `hsl(${value} / ${alpha})`;
}

function readTheme(): ChartTheme {
  // A safe palette for the server-render / test path where there is no layout.
  if (typeof window === 'undefined') {
    return {
      series: ['#146b4b', '#c9722b', '#2b7ea8', '#7a5ea8', '#b08a1e', '#a8456a'],
      grid: '#e5e2db',
      axis: '#6b7370',
      surface: '#ffffff',
      border: '#e5e2db',
      ink: '#111917',
      inkMuted: '#5f6764',
      primary: '#146b4b',
      positive: '#1c6b4a',
      critical: '#b53f36',
      accent: '#c9722b',
    };
  }

  const styles = getComputedStyle(document.documentElement);

  return {
    series: [
      readToken(styles, '--chart-1'),
      readToken(styles, '--chart-2'),
      readToken(styles, '--chart-3'),
      readToken(styles, '--chart-4'),
      readToken(styles, '--chart-5'),
      readToken(styles, '--chart-6'),
    ],
    grid: readToken(styles, '--chart-grid'),
    axis: readToken(styles, '--ink-subtle'),
    surface: readToken(styles, '--surface'),
    border: readToken(styles, '--border'),
    ink: readToken(styles, '--ink'),
    inkMuted: readToken(styles, '--ink-muted'),
    primary: readToken(styles, '--primary'),
    positive: readToken(styles, '--positive'),
    critical: readToken(styles, '--critical'),
    accent: readToken(styles, '--accent'),
  };
}

export function useChartTheme(): ChartTheme {
  const resolved = useThemeStore((state) => state.resolved);
  const [theme, setTheme] = useState<ChartTheme>(readTheme);

  useEffect(() => {
    // The `dark` class is applied to <html> by the store in the same tick, but
    // the computed styles are only correct after the browser has recalculated —
    // one frame is enough, and avoids a chart painted in the old palette.
    const frame = requestAnimationFrame(() => setTheme(readTheme()));
    return () => cancelAnimationFrame(frame);
  }, [resolved]);

  return theme;
}
