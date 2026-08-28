/**
 * Resolves a did:web identifier to its DID document and checks whether a
 * given public key is one of its verification methods — the server-side
 * check behind profile.linkDidWeb, so a profile can't just claim a did:web
 * it doesn't actually control a listed key for.
 */

const FETCH_TIMEOUT_MS = 5000;

export class DidWebResolutionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DidWebResolutionError";
	}
}

export interface DidWebVerificationMethod {
	id: string;
	type: string;
	controller: string;
	publicKeyJwk?: { crv?: string; x?: string; [key: string]: unknown };
}

export interface DidWebDocument {
	id: string;
	verificationMethod?: DidWebVerificationMethod[];
}

/**
 * did:web -> HTTPS URL, per the did:web method spec: everything after
 * "did:web:" is colon-separated segments, each percent-decoded. A bare
 * host resolves via /.well-known/did.json; any additional segments become
 * a path, resolved via <path>/did.json instead.
 *
 * did:web:example.com          -> https://example.com/.well-known/did.json
 * did:web:example.com:user:abc -> https://example.com/user/abc/did.json
 */
export function didWebToUrl(did: string): string {
	const prefix = "did:web:";
	if (!did.startsWith(prefix)) {
		throw new DidWebResolutionError(`Not a did:web identifier: "${did}"`);
	}
	const rest = did.slice(prefix.length);
	if (!rest) {
		throw new DidWebResolutionError("did:web identifier has no host");
	}

	let segments: string[];
	try {
		segments = rest.split(":").map((segment) => decodeURIComponent(segment));
	} catch {
		throw new DidWebResolutionError(`Malformed did:web identifier: "${did}"`);
	}

	const [host, ...path] = segments;
	if (!host) {
		throw new DidWebResolutionError(`did:web identifier has no host: "${did}"`);
	}

	const pathPart =
		path.length > 0 ? `/${path.join("/")}/did.json` : "/.well-known/did.json";
	return `https://${host}${pathPart}`;
}

/** Fetches and minimally validates a did:web document. Throws
 * DidWebResolutionError (message safe to surface to a caller) on any
 * network failure, non-2xx response, or malformed body. */
export async function resolveDidWeb(did: string): Promise<DidWebDocument> {
	const url = didWebToUrl(did);

	let response: Response;
	try {
		response = await fetch(url, {
			headers: { Accept: "application/did+json, application/json" },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
	} catch (error) {
		throw new DidWebResolutionError(
			`Couldn't reach ${url}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	if (!response.ok) {
		throw new DidWebResolutionError(
			`${url} returned ${response.status} ${response.statusText}`,
		);
	}

	const body: unknown = await response.json().catch(() => null);
	if (
		!body ||
		typeof body !== "object" ||
		typeof (body as { id?: unknown }).id !== "string"
	) {
		throw new DidWebResolutionError(
			`${url} did not return a valid DID document`,
		);
	}

	return body as DidWebDocument;
}

/** True if any of the document's verification methods is the given
 * base64url-encoded raw Ed25519 public key — the same encoding
 * @cognitiveproof/webauthn-prf-identity's publicKey already uses, so no
 * format conversion is needed on mix-o-tron's side. */
export function didWebListsPublicKey(
	document: DidWebDocument,
	publicKeyBase64Url: string,
): boolean {
	return (document.verificationMethod ?? []).some(
		(method) =>
			method.publicKeyJwk?.crv === "Ed25519" &&
			method.publicKeyJwk?.x === publicKeyBase64Url,
	);
}
