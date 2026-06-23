import { describe, expect, it } from 'vitest';
import {
  RESIDENT_DEMO_ID,
  RESIDENT_DEMO_PATH,
  isResidentDemoPath,
  residentDemoSession,
} from './useResidentSession';

describe('resident demo session helpers', () => {
  it('recognizes only the isolated resident demo route', () => {
    expect(isResidentDemoPath(RESIDENT_DEMO_PATH)).toBe(true);
    expect(isResidentDemoPath('/park-hub')).toBe(false);
    expect(isResidentDemoPath('/resident-demo/extra')).toBe(false);
  });

  it('uses local storage identity instead of a logged-in resident cookie', () => {
    expect(residentDemoSession()).toEqual({
      isLoggedIn: false,
      residentId: null,
      guestId: RESIDENT_DEMO_ID,
      storageMode: 'local',
      activeId: RESIDENT_DEMO_ID,
    });
  });
});
