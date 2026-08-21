# Test signing certificates

`es256_certs.pem` and `es256_private.key` are the public test fixtures from
[c2pa-rs-javascript-library](https://github.com/mrappard/c2pa-rs-js-binding-library)'s
own test suite (`test/assets/sample/`) — self-signed, not tied to any real
identity, and used throughout that library's own tests.

They exist here so the local signing path (`signViaLocalTestCerts` in
`../sign.ts`) works out of the box without a real signing service. Once
`SIGN_O_TRON_URL` points at a real external signing API, this directory and
the local path become dev/test-only fallbacks.

**Do not use these for anything that needs to be trusted.** They're
intentionally public test material.

## `ica_issuer_ed25519.seed`

A raw 32-byte Ed25519 seed, generated locally for this project (not from
the library's test suite), used as the ICA (Identity Claims Aggregation)
issuer key for `cawg.identity` assertions — see `computeIcaIssuerDid` /
`signAsset`'s `issuerDid`/`issuerPrivateKey` options in
`c2pa-rs-javascript-library`.

An ICA credential is supposed to represent an aggregator that has
independently verified a creator's claims (site ownership, a social
account, an ID document). Mixotron has no such verification step today —
a profile's "verified identities" are just what the account holder typed
into a form. Signing with this key means mixotron is self-issuing those
claims, not vouching for anything it actually checked. It exists so the
`cawg.identity` assertion and the CAWG plugin's identity UI have real,
consistently-shaped data to render locally, the same "stand-in for a
not-yet-built real service" role the ES256 certs and Sign-O-Tron already
play elsewhere in this signing path — **not** a real identity-verification
service. Its DID (`did:jwk:...`, derived from this seed) is the one entry
in `src/lib/trust-registry.ts`'s local trust-registry stub.

**Do not use this key for anything that needs to be trusted**, same as the
ES256 certs above.
