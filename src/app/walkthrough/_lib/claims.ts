export type C2paClaim =
	| "no-c2pa"
	| "some-c2pa"
	| "complete-c2pa"
	| "unknown-c2pa";

/**
 * The verify page only ever checks one of three things — the "some" vs
 * "complete" claims both just mean "should have a manifest" as far as
 * verification is concerned, so they share a page state and a URL hash.
 */
export type VerifyState = "hasManifest" | "noManifest" | "unknown";

export interface ClaimConfig {
	id: C2paClaim;
	/** The statement shown as a choice on the Rights Holder page. */
	choiceLabel: string;
	/** Which verify page state (and #hash) this choice links to. */
	verifyState: VerifyState;
}

export const CLAIM_ORDER: C2paClaim[] = [
	"no-c2pa",
	"some-c2pa",
	"complete-c2pa",
	"unknown-c2pa",
];

export const CLAIMS: Record<C2paClaim, ClaimConfig> = {
	"no-c2pa": {
		id: "no-c2pa",
		choiceLabel: "I have an audio track with no C2PA information.",
		verifyState: "noManifest",
	},
	"some-c2pa": {
		id: "some-c2pa",
		choiceLabel: "I have an audio track with some C2PA information.",
		verifyState: "hasManifest",
	},
	"complete-c2pa": {
		id: "complete-c2pa",
		choiceLabel: "I have an audio track with complete C2PA information.",
		verifyState: "hasManifest",
	},
	"unknown-c2pa": {
		id: "unknown-c2pa",
		choiceLabel:
			"I have an audio track, but I don’t know whether it contains C2PA information.",
		verifyState: "unknown",
	},
};

export interface VerifyStateConfig {
	/** Heading shown on the verify page for this state. */
	heading: string;
	/** Helper text shown under the heading on the verify page. */
	description: string;
	/**
	 * What we'd expect verification to find if the claim is accurate.
	 * `null` means there's nothing to compare against (the user said they
	 * don't know), so no correction is ever shown.
	 */
	expectedHasManifest: boolean | null;
}

export const VERIFY_STATES: Record<VerifyState, VerifyStateConfig> = {
	noManifest: {
		heading: "Upload the track with no C2PA information",
		description:
			"Drop the track below and we'll confirm whether it's really free of a Content Credential.",
		expectedHasManifest: false,
	},
	hasManifest: {
		heading: "Upload the track with C2PA information",
		description:
			"Drop the track below and we'll show you the Content Credential it carries.",
		expectedHasManifest: true,
	},
	unknown: {
		heading: "Upload the track to find out",
		description:
			"Drop the track below and we'll tell you exactly what — if anything — it contains.",
		expectedHasManifest: null,
	},
};

export function isVerifyState(value: string): value is VerifyState {
	return Object.hasOwn(VERIFY_STATES, value);
}
