/**
 * Shared singleton fakes for flow-level tests.
 *
 * vi.mock() factories can't close over top-of-file variables (the mock
 * is hoisted above all imports), so instead we centralise the fake
 * instances here and have both the test file AND the mock factory
 * import this module. Because ES modules are cached, both imports
 * resolve to the same instance, giving test code a direct handle on the
 * state that the action-under-test will mutate.
 */

import {
  FakeDB,
  makePrismaMock,
  FakeSupabaseAuth,
  FakeCookies,
  FakeHeaders,
} from './flow-mocks';

export const fakeDB = new FakeDB();
export const prismaMock = makePrismaMock(fakeDB);
export const fakeSupabase = new FakeSupabaseAuth();
export const fakeCookies = new FakeCookies();
export const fakeHeaders = new FakeHeaders();

/** Wipe every fake back to a clean slate — call in `beforeEach`. */
export function resetAll() {
  fakeDB.reset();
  fakeSupabase.reset();
  fakeCookies.reset();
}
