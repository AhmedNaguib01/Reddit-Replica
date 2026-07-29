// Route chunks are fetched on demand, which puts a network round trip between
// the click and the new page appearing. Starting that fetch when the pointer
// touches a link usually finishes it before the click lands, so navigation
// costs nothing extra.
//
// The importers below are the same ones App.jsx passes to React.lazy. Because
// dynamic import() caches its module, calling one here means React.lazy resolves
// synchronously later.

const routeImporters = [
  [/^\/r\/popular$/, () => import('../pages/PopularPage')],
  [/^\/explore$/, () => import('../pages/ExplorePage')],
  [/^\/search/, () => import('../pages/SearchResultsPage')],
  [/^\/manage-communities$/, () => import('../pages/ManageCommunitiesPage')],
  [/^\/communities$/, () => import('../pages/AllCommunitiesPage')],
  [/^\/about$/, () => import('../pages/AboutPage')],
  [/^\/help$/, () => import('../pages/HelpPage')],
  [/^\/blog$/, () => import('../pages/BlogPage')],
  [/^\/careers$/, () => import('../pages/CareersPage')],
  [/^\/rules$/, () => import('../pages/RulesPage')],
  [/^\/privacy$/, () => import('../pages/PrivacyPage')],
  [/^\/user-agreement$/, () => import('../pages/UserAgreementPage')],
  [/^\/saved$/, () => import('../pages/SavedPostsPage')],
  [/^\/feed\//, () => import('../pages/CustomFeedPage')],
  [/^\/chat$/, () => import('../pages/ChatPage')],
  [/^\/reset-password\//, () => import('../pages/ResetPasswordPage')],
  [/^\/post\//, () => import('../pages/PostDetailPage')],
  [/^\/r\//, () => import('../pages/CommunityPage')],
  [/^\/(user|u)\//, () => import('../pages/UserProfilePage')],
];

const alreadyPrefetched = new Set();

export const prefetchRoute = (pathname) => {
  if (!pathname || alreadyPrefetched.has(pathname)) return;

  const match = routeImporters.find(([pattern]) => pattern.test(pathname));
  if (!match) return;

  alreadyPrefetched.add(pathname);
  // Failures are ignored - this is an optimisation, and the real navigation
  // will surface any genuine loading error through the router.
  match[1]().catch(() => {});
};

// Watches for intent to navigate anywhere in the app. One delegated listener
// beats wiring a handler onto every Link.
export const installRoutePrefetching = () => {
  const handleIntent = (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || !href.startsWith('/')) return; // in-app routes only

    prefetchRoute(href.split('?')[0]);
  };

  // pointerenter-style hover for mouse users, focus for keyboard users, and
  // touchstart so mobile gets the head start too
  document.addEventListener('pointerover', handleIntent, { passive: true });
  document.addEventListener('focusin', handleIntent, { passive: true });
  document.addEventListener('touchstart', handleIntent, { passive: true });

  return () => {
    document.removeEventListener('pointerover', handleIntent);
    document.removeEventListener('focusin', handleIntent);
    document.removeEventListener('touchstart', handleIntent);
  };
};
