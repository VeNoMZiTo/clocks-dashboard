/**
 * Auth stub module
 * 
 * TODO: Configure proper authentication for production
 * For now, provides mock implementation for development
 */

import { NextRequest } from "next/server";

export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Extract Bearer token from authorization header string
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Extract Bearer token from NextRequest
 */
export function extractBearerTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  return extractBearerToken(authHeader);
}

/**
 * Verify access token and return user
 * 
 * TODO: Implement proper JWT verification
 */
export async function verifyAccessToken(token: string): Promise<AuthUser | null> {
  if (!token) {
    return null;
  }
  
  // Mock user for development
  return {
    id: "dev-user",
    email: "dev@example.com"
  };
}

/**
 * Get current user from request
 */
export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  const token = extractBearerTokenFromRequest(request);
  if (!token) {
    return null;
  }
  return verifyAccessToken(token);
}
