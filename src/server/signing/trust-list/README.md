# C2PA trust list

`c2pa-trust-list.pem` is the real, official C2PA production trust list —
the X.509 root/intermediate certificates authorized to issue signing
certificates to conformant C2PA generator products (Adobe, Google, etc.).

Source: https://github.com/c2pa-org/conformance-public/blob/main/trust-list/C2PA-TRUST-LIST.pem
Fetched: 2026-08-21

This is a point-in-time snapshot, not a live feed — the C2PA org adds and
removes signers over time, so this should be periodically re-fetched from
the URL above. There's no code here that fetches it automatically; treat
it the same as any other dependency that needs manual updating.

Passed into `verifyAsset()`/`verifyIdentityAssertions()` alongside our own
`../test-certs/es256_certs.pem` (see `../trusted-certificates.ts`) — one
covers real-world signers, the other covers content mixotron signed itself
with the local test cert. Content signed by anyone else — including a
real C2PA conformant signer whose specific issuing CA isn't in this
snapshot yet — will still verify successfully but show as untrusted
("Unknown"), which is the correct, honest result for a trust anchor list
that's out of date or genuinely doesn't cover them.
