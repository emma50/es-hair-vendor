export type ActionResult<T = void> =
  | {
      success: true;
      data: T;
      /**
       * Optional informational note to surface on success (non-error,
       * non-blocking). Currently used for "side-effect happened"
       * messages — e.g. password change that revoked other sessions.
       */
      message?: string;
    }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
