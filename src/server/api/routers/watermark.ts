import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { VerificationOutcome as DisplayVerificationOutcome } from "c2pa-react-component-types";
import { ObjectId } from "mongodb";

import { verifyInputSchema } from "~/lib/manifest";
import { runVerifyForDisplay } from "~/server/api/routers/manifest";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { mongoDb } from "~/server/db/mongo";
import { embedWatermark, verifyWatermark } from "~/server/watermark/client";

interface WatermarkDocument {
	_id: ObjectId;
	userId: string;
	watermarkMessage: string;
	activeManifestId: string;
	fileName: string;
	outcome: DisplayVerificationOutcome;
	createdAt: Date;
}

const watermarks = () => mongoDb.collection<WatermarkDocument>("watermarks");

/**
 * The watermark payload audiowmark embeds is a fixed 128-bit (32 hex char)
 * field, but a C2PA activeManifest ID is an opaque, arbitrarily-shaped
 * string (see c2pa-rs-javascript-library's ManifestStoreJson) — not
 * guaranteed to already be 128 bits of hex. Hashing it down to 128 bits
 * keeps the watermark deterministically derived from the manifest ID (per
 * the "for now the watermark is the activeManifest ID" requirement) while
 * always fitting the field, regardless of the ID's actual format.
 */
function deriveWatermarkMessage(activeManifestId: string): string {
	return createHash("sha256")
		.update(activeManifestId)
		.digest("hex")
		.slice(0, 32);
}

export interface WatermarkStoredRecord {
	fileName: string;
	activeManifestId: string;
	outcome: DisplayVerificationOutcome;
}

export const watermarkRouter = createTRPCRouter({
	/**
	 * Runs on every upload to the Watermark page: checks the file for its own
	 * embedded C2PA manifest (same logic the Verify page uses) *and* checks
	 * water-marker for an existing audio watermark. If a watermark is found
	 * and we have a matching DB record, that record's manifest is returned
	 * too — this is what lets the page recover provenance for a file whose
	 * own C2PA metadata no longer matches or is gone, as long as the audio
	 * watermark survived.
	 */
	inspect: protectedProcedure
		.input(verifyInputSchema)
		.mutation(async ({ input }) => {
			const displayResult = await runVerifyForDisplay(input);
			const activeManifestId =
				displayResult.supported && displayResult.hasManifest
					? (displayResult.outcome.manifestStore?.activeManifest ?? null)
					: null;

			const bytes = Buffer.from(input.dataBase64, "base64");
			const watermarkResult = await verifyWatermark(bytes, input.fileName);

			let stored: WatermarkStoredRecord | null = null;
			if (watermarkResult?.detected && watermarkResult.bestMessage) {
				const doc = await watermarks().findOne({
					watermarkMessage: watermarkResult.bestMessage,
				});
				if (doc) {
					stored = {
						fileName: doc.fileName,
						activeManifestId: doc.activeManifestId,
						outcome: doc.outcome,
					};
				}
			}

			return {
				displayResult,
				activeManifestId,
				watermark: {
					detected: watermarkResult?.detected ?? false,
					message: watermarkResult?.bestMessage ?? null,
					stored,
				},
			};
		}),

	/**
	 * Embeds a watermark (message = hash of the file's own activeManifest ID)
	 * via water-marker, then persists {watermarkMessage -> manifest} so a
	 * later `inspect` on any copy of this watermarked audio — even one that's
	 * lost its own C2PA metadata — can look the manifest back up. Re-verifies
	 * the file server-side rather than trusting a client-supplied manifest ID,
	 * so what's stored always matches what's actually embedded in these bytes.
	 */
	add: protectedProcedure
		.input(verifyInputSchema)
		.mutation(async ({ ctx, input }) => {
			const displayResult = await runVerifyForDisplay(input);
			if (!displayResult.supported || !displayResult.hasManifest) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "This file has no C2PA manifest to watermark.",
				});
			}
			const activeManifestId =
				displayResult.outcome.manifestStore?.activeManifest;
			if (!activeManifestId) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "This file's manifest has no active manifest ID.",
				});
			}

			const message = deriveWatermarkMessage(activeManifestId);
			const bytes = Buffer.from(input.dataBase64, "base64");
			let embedded: Awaited<ReturnType<typeof embedWatermark>>;
			try {
				embedded = await embedWatermark(bytes, input.fileName, message);
			} catch (error) {
				console.error("[watermark] embed failed", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Watermarking failed. Try again in a moment.",
				});
			}

			await watermarks().insertOne({
				_id: new ObjectId(),
				userId: ctx.session.user.id,
				watermarkMessage: message,
				activeManifestId,
				fileName: input.fileName,
				outcome: displayResult.outcome,
				createdAt: new Date(),
			});

			return {
				watermarkMessage: message,
				contentType: embedded.contentType,
				dataBase64: embedded.bytes.toString("base64"),
			};
		}),
});
