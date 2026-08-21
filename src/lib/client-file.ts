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
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new File([bytes], fileName, { type: contentType });
}
