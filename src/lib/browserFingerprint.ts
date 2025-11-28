/**
 * Generate a browser fingerprint based on user agent and other browser properties
 * This is used along with IP address to create a unique user ID
 */
export const generateBrowserFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.hardwareConcurrency || "unknown",
    navigator.deviceMemory || "unknown",
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ];

  return components.join("|");
};

/**
 * Get or create a persistent browser fingerprint stored in localStorage
 */
export const getPersistentBrowserFingerprint = (): string => {
  const storageKey = "browserFingerprint";
  let fingerprint = localStorage.getItem(storageKey);

  if (!fingerprint) {
    fingerprint = generateBrowserFingerprint();
    localStorage.setItem(storageKey, fingerprint);
  }

  return fingerprint;
};

