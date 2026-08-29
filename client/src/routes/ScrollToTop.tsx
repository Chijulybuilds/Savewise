import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets scroll position on navigation.
 *
 * A single-page app keeps the scroll offset across route changes, so following
 * a link from halfway down the landing page lands you halfway down the next
 * one. The browser does this for free on a real page load; we have to do it
 * ourselves.
 *
 * An in-page hash (`/#pricing`) is left alone — that navigation is *meant* to
 * scroll somewhere specific.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    // `instant` rather than smooth: a page change is not a scroll, and
    // animating it makes navigation feel sluggish.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
}
