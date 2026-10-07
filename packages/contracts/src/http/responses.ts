/**
 * Wire format of the API's JSON responses. The API's mappers return these
 * shapes and the web app types its client with them, so a contract change is a
 * compile error on both sides. Dates are ISO-8601 strings on the wire.
 */

export interface AdminResponse {
  id: string;
  email: string;
  name: string | null;
  photo: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResponse {
  id: string;
  agent: string;
  location: string;
  ipAddress: string;
  lastActivity: string;
  expiresAt: string;
  isActive: boolean;
  /** True for the session that made the request. */
  current: boolean;
}

export interface MessageResponse {
  message: string;
}

/** RFC 7807 problem document — the shape of every error response. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string | null;
  instance: string;
  requestId?: string;
}