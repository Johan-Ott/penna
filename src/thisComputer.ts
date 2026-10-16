// The user agent answers this, not the system, so the browser version follows the same code.
// WKWebView and Safari are the only web views that say Macintosh.
export const isMacUserAgent = (userAgent: string) => /Macintosh|Mac OS X/i.test(userAgent);

/** A Mac, where the shortcut key is Cmd and the system numbers its io errors by errno. */
export const isMac = isMacUserAgent(navigator.userAgent);
