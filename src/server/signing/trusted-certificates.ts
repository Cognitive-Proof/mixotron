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
 *
 * Reads lazily (not at module scope) — matching sign.ts's own
 * signViaLocalTestCerts, which reads its certs inside the function rather
 * than at import time. `next build` statically evaluates every route
 * module during page-data collection, so a module-scope read here would
 * run then too; the API route that uses this doesn't need these files
 * until an actual verify request comes in at runtime.
 */
export function getTrustedCertificates(): string[] {
	return [
		readFileSync(
			join(process.cwd(), "src/server/signing/test-certs/es256_certs.pem"),
			"utf8",
		),
		readFileSync(
			join(process.cwd(), "src/server/signing/trust-list/c2pa-trust-list.pem"),
			"utf8",
		),
	];
}
