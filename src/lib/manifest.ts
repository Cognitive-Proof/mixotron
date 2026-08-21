import type { VerificationOutcome as DisplayVerificationOutcome } from "c2pa-react-component-types";
import { z } from "zod";

/**
 * Formats c2pa-rs-javascript-library can currently verify (its
 * `SupportedFormat` union). See dist-node/c2pa_rs_wasm.d.ts. Audio support
 * (mpeg/wav/flac) landed in 0.2.3.
 */
export const SUPPORTED_VERIFY_FORMATS = [
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/svg+xml",
	"image/x-adobe-dng",
	"jsonc",
	"xml",
	"md",
	"audio/mpeg",
	"audio/wav",
	"audio/flac",
] as const;
export type SupportedVerifyFormat = (typeof SUPPORTED_VERIFY_FORMATS)[number];

const EXTENSION_TO_FORMAT: Record<string, SupportedVerifyFormat> = {
	pdf: "application/pdf",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	svg: "image/svg+xml",
	dng: "image/x-adobe-dng",
	jsonc: "jsonc",
	json: "jsonc",
	xml: "xml",
	md: "md",
	markdown: "md",
	mp3: "audio/mpeg",
	wav: "audio/wav",
	flac: "audio/flac",
};

/** Extension-based detection — more reliable across OSes than file.type. */
export function detectVerifyFormat(
	fileName: string,
): SupportedVerifyFormat | null {
	const ext = fileName.split(".").pop()?.toLowerCase();
	if (!ext) return null;
	return EXTENSION_TO_FORMAT[ext] ?? null;
}

export const MANIFEST_STATUS_VALUES = [
	"verified",
	"unverified",
	"unsupported",
] as const;
export type ManifestStatus = (typeof MANIFEST_STATUS_VALUES)[number];

export interface ManifestIngredientRef {
	title: string | null;
	manifestId: string | null;
}

/** What the verify procedure returns to the client. */
export interface ManifestVerificationResult {
	status: ManifestStatus;
	cached: boolean;
	hash: string;
	fileName: string;
	format: string;
	/** Our database record id — this is what later gets used to reference the
	 * ingredient when authoring a new manifest. Present only when status is
	 * "verified" or "unverified" (i.e. the format was checkable at all). */
	id: string | null;
	/** Display name — the embedded manifest's title, falling back to the
	 * uploaded file name. */
	name: string;
	manifestId: string | null;
	claimGenerator: string | null;
	ingredients: ManifestIngredientRef[];
}

export const verifyInputSchema = z.object({
	fileName: z.string().min(1),
	dataBase64: z.string().min(1),
});
export type VerifyInput = z.infer<typeof verifyInputSchema>;

/** What the verifyForDisplay procedure returns — shaped for c2pa-react-component. */
export type VerifyForDisplayResult =
	| { supported: false; fileName: string; format: string }
	| {
			supported: true;
			fileName: string;
			format: SupportedVerifyFormat;
			outcome: DisplayVerificationOutcome;
	  };
