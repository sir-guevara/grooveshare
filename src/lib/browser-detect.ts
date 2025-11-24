export interface BrowserInfo {
  name: string;
  version: string;
}

export const detectBrowser = (): BrowserInfo => {
  const ua = navigator.userAgent;
  let browserName = "Unknown";
  let browserVersion = "Unknown";

  // Chrome
  if (/Chrome/.test(ua) && !/Chromium/.test(ua)) {
    browserName = "Chrome";
    const match = ua.match(/Chrome\/(\d+)/);
    if (match) browserVersion = match[1];
  }
  // Safari
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    browserName = "Safari";
    const match = ua.match(/Version\/(\d+)/);
    if (match) browserVersion = match[1];
  }
  // Firefox
  else if (/Firefox/.test(ua)) {
    browserName = "Firefox";
    const match = ua.match(/Firefox\/(\d+)/);
    if (match) browserVersion = match[1];
  }
  // Edge
  else if (/Edg/.test(ua)) {
    browserName = "Edge";
    const match = ua.match(/Edg\/(\d+)/);
    if (match) browserVersion = match[1];
  }
  // Opera
  else if (/OPR/.test(ua)) {
    browserName = "Opera";
    const match = ua.match(/OPR\/(\d+)/);
    if (match) browserVersion = match[1];
  }

  return { name: browserName, version: browserVersion };
};

