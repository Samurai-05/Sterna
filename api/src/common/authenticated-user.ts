/**
 * Who the bearer token says is calling.
 *
 * Populated by JwtAuthGuard, read through @CurrentUser(). It is the token's
 * claims and nothing more: no database row is loaded to build it.
 */
export interface AuthenticatedUser {
  /** users.id, as a decimal string. */
  id: string;

  email: string;
}

// Declaration merging, the same mechanism Express.Multer.File already relies on
// in photos.controller.ts: it is what lets the guard assign `request.user` and
// the decorator read it back without either side casting.
declare global {
  // Augmenting a global namespace is the only way to extend Express's Request,
  // and it is what @types/multer does for Express.Multer.File — the type
  // photos.controller.ts already relies on. There is no module-syntax
  // equivalent, so the rule is off for this block only.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
