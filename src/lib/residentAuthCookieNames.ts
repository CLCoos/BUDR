export const SESSION_COOKIE_NAME = 'budr_resident_session';
export const LEGACY_COOKIE_NAME = 'budr_resident_id';

export const RESIDENT_LOGOUT_API = '/api/resident-session';

export function residentLogoutFetchInit(): RequestInit {
  return { method: 'DELETE', credentials: 'same-origin' };
}
