import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Puts every new page at the top.
 *
 * Without this the window keeps whatever scroll offset the previous page had,
 * so opening a post from half way down the feed landed you half way down the
 * post. It also caused a visible jolt when switching tabs: the outgoing page
 * unmounts, the document briefly collapses, the browser clamps the scroll
 * position to the shorter document, and then it snaps back once the new page
 * renders.
 *
 * Back and forward navigations (POP) are left alone so the browser can restore
 * the position the user came from.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === 'POP') return;

    // 'instant' rather than smooth: this is a page change, not a scroll
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;
