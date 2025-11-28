import crypto from "crypto";

/**
 * Generate a unique user ID based on IP address and browser fingerprint
 * This allows us to track users across sessions even if they're not logged in
 */
export const generateUserId = (ipAddress: string, browserFingerprint: string): string => {
  const combined = `${ipAddress}:${browserFingerprint}`;
  return crypto.createHash("sha256").update(combined).digest("hex");
};

/**
 * Extract client IP address from request
 * Handles proxies and various header configurations
 */
export const getClientIp = (req: any): string => {
  // Check for IP from a proxy
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // Check for IP from CloudFlare
  const cfConnectingIp = req.headers["cf-connecting-ip"];
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to socket remote address
  return req.socket?.remoteAddress || "unknown";
};

