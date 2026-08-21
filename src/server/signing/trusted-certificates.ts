import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Combined trust anchors for verifyAsset()/verifyIdentityAssertions(): our
 * own local test cert (so content mixotron signs itself verifies as
 * trusted) plus the real C2PA production trust list (so content signed by
 * an actual C2PA-conformant generator can verify as trusted too). Without
 * either, `state`/`validation_state` comes back false/"Unknown" for
 * everything, signature validity notwithstanding — trust-chain evaluation
 * is a separate check from "is this signature cryptographically valid",
 * and needs an explicit trust anchor list either way.
 */
export const TRUSTED_CERTIFICATES: string[] = [
	readFileSync(
		join(process.cwd(), "src/server/signing/test-certs/es256_certs.pem"),
		"utf8",
	),
	readFileSync(
		join(process.cwd(), "src/server/signing/trust-list/c2pa-trust-list.pem"),
		"utf8",
	),
];
