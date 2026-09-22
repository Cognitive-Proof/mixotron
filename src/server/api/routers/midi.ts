import { TRPCError } from "@trpc/server";
import { verifyAsset } from "c2pa-rs-javascript-library";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { buildStandardMidiFile } from "~/server/signing/build-midi-file";
import { buildManifestDefinition } from "~/server/signing/manifest-definition";
import { signContentCredential } from "~/server/signing/sign";
import { getTrustedCertificates } from "~/server/signing/trusted-certificates";

const MAX_STEPS = 64;
const MAX_NOTES = MAX_STEPS * 13;

/** Loosely mirrors the Tone.js oscillator types the /info/midi arranger
 * offers — mapped to a plausible General MIDI program so the exported file
 * plays back with a similarly-flavored instrument. */
const VOICE_TO_GM_PROGRAM: Record<string, number> = {
	sine: 73, // Flute
	triangle: 79, // Ocarina
	square: 80, // Lead 1 (square)
	sawtooth: 81, // Lead 2 (sawtooth)
};

export const midiRouter = createTRPCRouter({
	/**
	 * Public (unauthenticated) — the /info/midi arranger is a no-account-
	 * required demo page. Builds a real Standard MIDI File from the
	 * arrangement and signs it with the shared test key, the same way the
	 * dashboard Author flow signs a profile-less asset (see sign.ts).
	 */
	exportSigned: publicProcedure
		.input(
			z.object({
				bpm: z.number().int().min(40).max(240),
				steps: z.number().int().min(1).max(MAX_STEPS),
				notes: z
					.array(
						z.object({
							note: z.string().min(1).max(4),
							step: z.number().int().min(0),
						}),
					)
					.max(MAX_NOTES),
				voice: z.enum(["sine", "triangle", "square", "sawtooth"]),
			}),
		)
		.mutation(async ({ input }) => {
			if (input.notes.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Arrangement is empty — place at least one note first.",
				});
			}
			if (input.notes.some((n) => n.step >= input.steps)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "A note step is out of range for the given step count.",
				});
			}

			const midiBytes = buildStandardMidiFile({
				bpm: input.bpm,
				steps: input.steps,
				notes: input.notes,
				program: VOICE_TO_GM_PROGRAM[input.voice] ?? 0,
			});

			const manifestDefinition = buildManifestDefinition({
				title: "Mix-O-Tron MIDI Arrangement",
				description: "",
				creationOrigin: "created",
				digitalSourceType:
					"http://cv.iptc.org/newscodes/digitalsourcetype/digitalCreation",
				actions: [],
				aiDisclosure: null,
				hashOnlyIngredients: [],
				profile: null,
				ddex: null,
			});

			const result = await signContentCredential({
				format: "audio/midi",
				asset: midiBytes,
				manifestDefinition,
				ingredients: [],
				identity: null,
			});

			let manifestId: string | null = null;
			try {
				const outcome = await verifyAsset(
					"audio/midi",
					result.signedAsset,
					getTrustedCertificates(),
				);
				manifestId = outcome.manifests[0]?.id ?? null;
			} catch (error) {
				console.warn(
					"[midi] Could not re-verify freshly signed MIDI export",
					error,
				);
			}

			return {
				signedAssetBase64: Buffer.from(result.signedAsset).toString("base64"),
				fileName: "midi-arrangement.mid",
				manifestId,
			};
		}),
});
