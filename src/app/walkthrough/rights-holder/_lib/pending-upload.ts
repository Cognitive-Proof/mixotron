/**
 * A one-shot, in-memory hand-off for the file a user already dropped on
 * /walkthrough/rights-holder/verifyTrack. That page is a filter — it checks
 * what the track actually contains, then sends the user on to whichever of
 * addManifest/updateManifest fits — so this lets the destination page pick
 * the same file back up instead of making the user find and drop it again.
 *
 * Deliberately plain module-scoped state, not persisted storage: Next's
 * <Link> navigation is a client-side transition that keeps this module's
 * state alive, but a hard refresh or opening the destination in a new tab
 * loses it. Either page just falls back to its normal empty-upload state
 * when that happens — there's nothing to recover, so no error handling is
 * needed on the read side.
 */
let pendingFile: File | null = null;

export function setPendingUpload(file: File): void {
	pendingFile = file;
}

/** Reads and clears the pending file in one step, so a later visit to the
 * same page (without a fresh hand-off from verifyTrack) doesn't pick up a
 * stale file left over from a previous one. */
export function takePendingUpload(): File | null {
	const file = pendingFile;
	pendingFile = null;
	return file;
}
