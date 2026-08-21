import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { env } from "~/env";
import type { LinkIngredientRef } from "~/server/api/routers/link";
import { mongoDb } from "~/server/db/mongo";
import { verifyLinkToken } from "~/server/link/link-tokens";
import { saveUploadedFile } from "~/server/storage/file-storage";

export const runtime = "nodejs";

const ingredientSchema = z.object({
	name: z.string().min(1),
	sha256: z.string().min(1),
});

function errorResponse(status: number, message: string): Response {
	return Response.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<Response> {
	const authHeader = request.headers.get("authorization") ?? "";
	const match = /^Bearer (.+)$/i.exec(authHeader);
	if (!match?.[1]) {
		return errorResponse(401, "Missing Authorization: Bearer <token> header.");
	}

	const claims = await verifyLinkToken(match[1]);
	if (!claims) {
		return errorResponse(401, "Invalid or expired token.");
	}

	const tokenDoc = await mongoDb.collection("linkTokens").findOne({
		jti: claims.jti,
		userId: claims.userId,
		revokedAt: null,
	});
	if (!tokenDoc) {
		return errorResponse(401, "This token has been revoked.");
	}

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return errorResponse(400, "Expected multipart/form-data.");
	}

	const file = form.get("file");
	const name = form.get("name");
	if (!(file instanceof File)) {
		return errorResponse(400, 'Missing required "file" field.');
	}
	if (typeof name !== "string" || name.trim().length === 0) {
		return errorResponse(400, 'Missing required "name" field.');
	}

	let ingredients: LinkIngredientRef[] = [];
	const ingredientsField = form.get("ingredients");
	if (typeof ingredientsField === "string" && ingredientsField.trim()) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(ingredientsField);
		} catch {
			return errorResponse(
				400,
				'"ingredients" must be a JSON array of {name, sha256} objects.',
			);
		}
		const result = z.array(ingredientSchema).safeParse(parsed);
		if (!result.success) {
			return errorResponse(
				400,
				'"ingredients" must be a JSON array of {name, sha256} objects.',
			);
		}
		ingredients = result.data;
	}

	const bytes = Buffer.from(await file.arrayBuffer());
	const fileId = randomUUID();
	const contentType = file.type || "audio/wav";
	const storage = await saveUploadedFile(fileId, bytes, contentType);

	const uploadDoc = {
		_id: new ObjectId(),
		userId: claims.userId,
		product: claims.product,
		name: name.trim(),
		fileId,
		storage,
		contentType,
		ingredients,
		createdAt: new Date(),
	};
	await mongoDb.collection("linkUploads").insertOne(uploadDoc);

	await mongoDb
		.collection("linkTokens")
		.updateOne({ jti: claims.jti }, { $set: { lastUsedAt: new Date() } });

	const baseUrl = env.BETTER_AUTH_URL ?? new URL(request.url).origin;
	const url = `${baseUrl}/dashboard/link/upload/${uploadDoc._id.toString()}`;

	return Response.json({ url });
}
