import { useEffect } from 'react';

/**
 * Per-route document metadata.
 *
 * A single-page app keeps whatever `<title>` the initial HTML shipped with, so
 * without this every route reads as "Savewise — Build the habit" in the tab, in
 * browser history and in a bookmark. Screen readers also announce the title on
 * navigation, so a stale one actively misleads.
 *
 * Deliberately small — a full head-management library would be several
 * kilobytes to set three tags.
 */

interface PageMeta {
  title: string;
  description?: string;
  /** Keeps a page out of search results — used for the authenticated app. */
  noIndex?: boolean;
}

function setMetaTag(
  selector: string,
  attribute: 'name' | 'property',
  key: string,
  content: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function usePageMeta({ title, description, noIndex }: PageMeta): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    if (description) {
      setMetaTag('meta[name="description"]', 'name', 'description', description);
      setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    }
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);

    // The canonical URL has to track the route, or every page in the app
    // presents itself to a crawler as the home page.
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + window.location.pathname;

    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noIndex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.name = 'robots';
        document.head.appendChild(robots);
      }
      robots.content = 'noindex, nofollow';
    } else {
      robots?.remove();
    }

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, noIndex]);
}
