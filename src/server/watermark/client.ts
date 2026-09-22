import { GoogleAuth } from "google-auth-library";
import { env } from "~/env";

/**
 * The water-marker Cloud Run service is restricted (no
 * --allow-unauthenticated) — every call needs a Google-signed identity token
 * audienced to its URL. `GoogleAuth` resolves this the same way regardless
 * of environment: the instance metadata server when this app itself is
 * running on Cloud Run (its runtime service account holds roles/run.invoker
 * on water-marker), or Application Default Credentials
 * (`gcloud auth application-default login`) locally.
 */
const auth = new GoogleAuth();

async function authorizedFetch(
	path: string,
	init: { method: string; body: FormData },
): Promise<Response> {
	if (!env.WATER_MARKER_URL) {
		throw new Error("WATER_MARKER_URL is not configured");
	}
	const client = await auth.getIdTokenClient(env.WATER_MARKER_URL);
	const idToken = await client.idTokenProvider.fetchIdToken(
		env.WATER_MARKER_URL,
	);
	return fetch(`${env.WATER_MARKER_URL}${path}`, {
		...init,
		headers: { Authorization: `Bearer ${idToken}` },
	});
}

function audioForm(bytes: Buffer, fileName: string): FormData {
	const form = new FormData();
	form.set("file", new Blob([Uint8Array.from(bytes)]), fileName);
	return form;
}

export interface WatermarkVerifyResult {
	detected: boolean;
	bestMessage: string | null;
}

/** Returns null (rather than throwing) when the service is unreachable or
 * unconfigured — callers treat that the same as "no watermark found", since
 * detection is a best-effort enhancement, not something the rest of the
 * inspect flow should hard-fail on. */
export async function verifyWatermark(
	bytes: Buffer,
	fileName: string,
): Promise<WatermarkVerifyResult | null> {
	if (!env.WATER_MARKER_URL) return null;
	try {
		const res = await authorizedFetch("/verify", {
			method: "POST",
			body: audioForm(bytes, fileName),
		});
		if (!res.ok) {
			console.warn(
				`[watermark] verify failed: ${res.status} ${await res.text()}`,
			);
			return null;
		}
		const json = (await res.json()) as {
			detected: boolean;
			best_message: string | null;
		};
		return { detected: json.detected, bestMessage: json.best_message };
	} catch (error) {
		console.warn("[watermark] verify request failed", error);
		return null;
	}
}

export interface WatermarkEmbedResult {
	bytes: Buffer;
	contentType: string;
}

/** Throws on failure — unlike verifyWatermark, embedding is the action the
 * user explicitly asked for, so a failure here should surface as an error,
 * not be silently swallowed. */
export async function embedWatermark(
	bytes: Buffer,
	fileName: string,
	message: string,
): Promise<WatermarkEmbedResult> {
	const form = audioForm(bytes, fileName);
	form.set("message", message);
	const res = await authorizedFetch("/watermark", {
		method: "POST",
		body: form,
	});
	if (!res.ok) {
		throw new Error(
			`water-marker /watermark failed: ${res.status} ${await res.text()}`,
		);
	}
	const contentType =
		res.headers.get("content-type") ?? "application/octet-stream";
	const arrayBuffer = await res.arrayBuffer();
	return { bytes: Buffer.from(arrayBuffer), contentType };
}
