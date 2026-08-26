/** Browser-only. Reads a File into a base64 string, chunked to avoid
 * blowing the call stack on String.fromCharCode for large files. */
export async function fileToBase64(file: File): Promise<string> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	let binary = "";
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

/** Browser-only. The reverse of fileToBase64 — rebuilds a File from a
 * server-supplied base64 payload (e.g. downloading a Link upload back into
 * the Author page as though the user had picked it themselves). */
export function base64ToFile(
	base64: string,
	fileName: string,
	contentType: string,
): File {
	return new File([base64ToBytes(base64)], fileName, { type: contentType });
}

/** Browser-only. Standard (not base64url) base64 decode to raw bytes — for
 * server payloads like an ICA signing session's `toSign` bytes that don't
 * need to become a File. */
export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/** Browser-only. Standard (not base64url) base64 encode of raw bytes, e.g.
 * an Ed25519 signature going back to finalizeIcaSigning. */
export function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}
