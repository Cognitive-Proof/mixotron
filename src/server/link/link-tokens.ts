import { randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { env } from "~/env";

/** The only product a Link token can be issued for right now. */
export const LINK_PRODUCTS = ["audacity"] as const;
export type LinkProduct = (typeof LINK_PRODUCTS)[number];

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function getSecretKey(): Uint8Array {
	if (!env.LINK_TOKEN_SECRET) {
		throw new Error(
			"LINK_TOKEN_SECRET is not set — required to create or verify Link tokens.",
		);
	}
	return new TextEncoder().encode(env.LINK_TOKEN_SECRET);
}

export interface CreateLinkTokenResult {
	token: string;
	jti: string;
	expiresAt: Date;
}

/**
 * Creates a Link token: a JWT carrying the user's id (`sub`) and the
 * product it's for, valid for one year. `jti` is also returned so the
 * caller can store it — a JWT is self-contained (a valid signature is
 * enough to prove who it's for), but that also means it can't be revoked
 * without something to check against, so verifyLinkToken() requires the
 * jti to still be present (and unrevoked) in the linkTokens collection.
 */
export async function createLinkToken(
	userId: string,
	product: LinkProduct,
): Promise<CreateLinkTokenResult> {
	const jti = randomUUID();
	const expiresAt = new Date(Date.now() + ONE_YEAR_MS);

	const token = await new SignJWT({ product })
		.setProtectedHeader({ alg: "HS256" })
		.setSubject(userId)
		.setJti(jti)
		.setIssuedAt()
		.setExpirationTime(expiresAt)
		.sign(getSecretKey());

	return { token, jti, expiresAt };
}

export interface LinkTokenPayload {
	userId: string;
	product: LinkProduct;
	jti: string;
}

/**
 * Verifies a Link token's signature and expiry. Does NOT check revocation —
 * callers must separately confirm the returned `jti` is still an
 * active row in the linkTokens collection (see manifest of the /api/link
 * router, which does this lookup against Mongo where the request context
 * lives).
 */
export async function verifyLinkToken(
	token: string,
): Promise<LinkTokenPayload | null> {
	try {
		const { payload } = await jwtVerify(token, getSecretKey());
		if (
			typeof payload.sub !== "string" ||
			typeof payload.jti !== "string" ||
			typeof payload.product !== "string" ||
			!LINK_PRODUCTS.includes(payload.product as LinkProduct)
		) {
			return null;
		}
		return {
			userId: payload.sub,
			product: payload.product as LinkProduct,
			jti: payload.jti,
		};
	} catch {
		return null;
	}
}
