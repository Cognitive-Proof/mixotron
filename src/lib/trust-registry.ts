/**
 * did:jwk derived from src/server/signing/test-certs/ica_issuer_ed25519.seed
 * via c2pa-rs-javascript-library's computeIcaIssuerDid(). Hardcoded (rather
 * than computed at runtime) so this can be imported client-side, where the
 * WASM signing library isn't bundled (it's server-only — see
 * serverExternalPackages in next.config.js). Regenerate this if that seed
 * file is ever regenerated.
 */
export const MIXOTRON_ICA_ISSUER_DID =
	"did:jwk:eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6Imx0RzZINmxHSFZKUDdETDhycjV0WWdYSHh4ZDdrSlEwUG53RVQyd3RiM2MifQ";

export const MIXOTRON_TRUST_AUTHORITY_ID = "https://mix-o-tron.com";
