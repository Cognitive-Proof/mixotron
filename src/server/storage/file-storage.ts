import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Storage } from "@google-cloud/storage";
import { env } from "~/env";

/**
 * Where an uploaded file's bytes actually live. Stored alongside each
 * upload's DB record so we know how to read it back — switching
 * MIX_O_TRON_UPLOAD_BUCKET later shouldn't strand files saved under the old
 * backend.
 */
export type UploadStorageBackend = "gcs" | "filesystem";

const LOCAL_UPLOAD_DIR = join(process.cwd(), ".uploads");

let storageClient: Storage | undefined;
function getStorageClient(): Storage {
	storageClient ??= new Storage();
	return storageClient;
}

/**
 * Saves an uploaded file's bytes under `fileId` (a UUID, not the user's
 * original filename — avoids path traversal and collisions). Uses GCS when
 * MIX_O_TRON_UPLOAD_BUCKET is set, otherwise the local filesystem.
 *
 * The filesystem path is only appropriate for local development —
 * Cloud Run's filesystem is ephemeral, so anything written there disappears
 * on the next deploy or cold start. Production must set the bucket env var.
 */
export async function saveUploadedFile(
	fileId: string,
	bytes: Buffer,
	contentType: string,
): Promise<UploadStorageBackend> {
	if (env.MIX_O_TRON_UPLOAD_BUCKET) {
		const bucket = getStorageClient().bucket(env.MIX_O_TRON_UPLOAD_BUCKET);
		await bucket.file(fileId).save(bytes, { contentType });
		return "gcs";
	}

	await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
	await writeFile(join(LOCAL_UPLOAD_DIR, fileId), bytes);
	return "filesystem";
}

export async function readUploadedFile(
	fileId: string,
	backend: UploadStorageBackend,
): Promise<Buffer> {
	if (backend === "gcs") {
		if (!env.MIX_O_TRON_UPLOAD_BUCKET) {
			throw new Error(
				`Upload ${fileId} was stored in GCS, but MIX_O_TRON_UPLOAD_BUCKET isn't set — can't read it back.`,
			);
		}
		const bucket = getStorageClient().bucket(env.MIX_O_TRON_UPLOAD_BUCKET);
		const [bytes] = await bucket.file(fileId).download();
		return bytes;
	}

	return readFile(join(LOCAL_UPLOAD_DIR, fileId));
}
