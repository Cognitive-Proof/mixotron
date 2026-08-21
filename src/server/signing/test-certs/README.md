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
