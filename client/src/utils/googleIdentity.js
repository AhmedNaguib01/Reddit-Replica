// Loads the Google Identity Services client on demand.
//
// This script used to sit in index.html, so every visitor paid for it on every
// page view even though it is only needed inside the login modal. Loading it
// when the modal opens keeps it off the critical path.
//
// The promise is cached, so repeated opens reuse the first load. Rejection is a
// normal outcome, not an exception: ad blockers, privacy extensions and
// corporate firewalls block accounts.google.com routinely, and callers are
// expected to fall back to email/password sign-in.

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const LOAD_TIMEOUT_MS = 10000;

let loadPromise = null;

export const loadGoogleIdentity = () => {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // Someone else may have injected it already
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    const script = existing || document.createElement('script');
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Google Identity Services timed out'));
    }, LOAD_TIMEOUT_MS);

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      fn(value);
    };

    script.addEventListener('load', () => {
      // The script can load while still failing to expose the API
      if (window.google?.accounts?.id) {
        finish(resolve, window.google);
      } else {
        finish(reject, new Error('Google Identity Services loaded but is unavailable'));
      }
    });

    script.addEventListener('error', () => {
      // Let a later attempt retry from scratch
      loadPromise = null;
      finish(reject, new Error('Google Identity Services failed to load'));
    });

    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return loadPromise;
};
