import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	computeIcaIssuerDid,
	type IcaVerifiedIdentity,
	type IngredientDescriptor,
	type SigningAlg,
	signAsset,
	signAssetWithIngredients,
} from "c2pa-rs-javascript-library";
import { env } from "~/env";
import type { SupportedVerifyFormat } from "~/lib/manifest";

export interface SignIngredientInput {
	format: SupportedVerifyFormat;
	asset: Uint8Array;
	title: string;
	relationship: "parentOf" | "componentOf" | "inputTo";
}

export interface SignIdentityInput {
	verifiedIdentities: IcaVerifiedIdentity[];
	roles: string[];
}

export interface SignRequest {
	format: SupportedVerifyFormat;
	asset: Uint8Array;
	manifestDefinition: Record<string, unknown>;
	ingredients: SignIngredientInput[];
	/**
	 * cawg.identity via the ICA path. Only takes effect when `ingredients` is
	 * empty — c2pa-rs-javascript-library's signAssetWithIngredients doesn't
	 * accept ICA options at all (checked its .d.ts: no issuerDid/
	 * verifiedIdentities/icaOptions params), only the plain signAsset does.
	 * So a signed asset with ingredients never gets a cawg.identity assertion
	 * today — a library limitation, not a choice made here.
	 */
	identity: SignIdentityInput | null;
}

export interface SignResult {
	signedAsset: Uint8Array;
	manifest: Uint8Array;
}

const TEST_CERTS_DIR = join(process.cwd(), "src/server/signing/test-certs");
const TEST_SIGNING_ALG: SigningAlg = "es256";

const ICA_ISSUER_PRIVATE_KEY = new Uint8Array(
	readFileSync(join(TEST_CERTS_DIR, "ica_issuer_ed25519.seed")),
);
const ICA_ISSUER_DID = computeIcaIssuerDid(ICA_ISSUER_PRIVATE_KEY);

/**
 * Signs a C2PA manifest onto an asset.
 *
 * There are two paths:
 * - If SIGN_O_TRON_URL is configured, delegates to that external signing
 *   service — the point of which is to keep private key material out of
 *   this process entirely.
 * - Otherwise (the only path that actually runs today, since Sign-O-Tron
 *   isn't deployed), signs locally with c2pa-rs-javascript-library using
 *   the test certificates bundled in ./test-certs.
 */
export async function signContentCredential(
	request: SignRequest,
): Promise<SignResult> {
	if (env.SIGN_O_TRON_URL) {
		return signViaExternalApi(request);
	}
	return signViaLocalTestCerts(request);
}

async function signViaExternalApi(_request: SignRequest): Promise<SignResult> {
	// Sign-O-Tron doesn't exist as a deployed service yet. This is the shape
	// the real call will take once it does: POST the asset, manifest
	// definition, and ingredients to SIGN_O_TRON_URL; the service holds the
	// signing key and returns the signed bytes, so this process never
	// touches key material.
	throw new Error(
		"SIGN_O_TRON_URL is set, but calling the external signing API isn't implemented yet — unset it to use the local test-cert signing path.",
	);
}

async function signViaLocalTestCerts(
	request: SignRequest,
): Promise<SignResult> {
	const signcert = new Uint8Array(
		readFileSync(join(TEST_CERTS_DIR, "es256_certs.pem")),
	);
	const pkey = new Uint8Array(
		readFileSync(join(TEST_CERTS_DIR, "es256_private.key")),
	);

	if (request.ingredients.length === 0) {
		const identityFields = request.identity
			? {
					issuerDid: ICA_ISSUER_DID,
					issuerPrivateKey: ICA_ISSUER_PRIVATE_KEY,
					verifiedIdentities: request.identity.verifiedIdentities,
					icaOptions: {
						sigType: "cawg.identity_claims_aggregation",
						reserveSize: 8192,
						roles: request.identity.roles,
					},
				}
			: {};

		const result = await signAsset({
			format: request.format,
			asset: request.asset,
			manifestDefinition: request.manifestDefinition,
			signcert,
			pkey,
			alg: TEST_SIGNING_ALG,
			...identityFields,
		});
		return { signedAsset: result.signedAsset, manifest: result.manifest };
	}

	const ingredients: IngredientDescriptor[] = request.ingredients.map(
		(ingredient) => ({
			format: ingredient.format,
			asset: ingredient.asset,
			title: ingredient.title,
			relationship: ingredient.relationship,
		}),
	);

	const result = await signAssetWithIngredients(
		request.format,
		request.asset,
		request.manifestDefinition,
		signcert,
		pkey,
		TEST_SIGNING_ALG,
		ingredients,
	);
	return { signedAsset: result.signedAsset, manifest: result.manifest };
}
