import type {
	Manifest as DisplayManifest,
	VerificationOutcome as DisplayOutcome,
	ManifestEntry,
} from "c2pa-react-component-types";
import type {
	VerificationOutcome as LibraryOutcome,
	RecognizedManifest,
} from "c2pa-rs-javascript-library";

/**
 * c2pa-rs-javascript-library's VerificationOutcome and
 * c2pa-react-component-types' VerificationOutcome describe the same C2PA
 * data but with different shapes: fields typed as Map in the library's
 * .d.ts are actually plain objects at runtime (verified empirically), and
 * the display types want thinner/differently-shaped ingredients,
 * thumbnails, and claim generator info than the library exposes. This
 * reshapes one into the other so C2paManifest / C2paProvenanceGraph can
 * render what verifyAsset() actually returns.
 *
 * Some fields (per-ingredient format/relationship) don't exist on the
 * library's output at all — they're filled with reasonable best-effort
 * placeholders rather than left to break the component. The `as unknown as`
 * casts below bridge a few spots where the two packages' type definitions
 * are stricter than the runtime data actually is (e.g. `credentials`/
 * `ingredients` typed as literal `[]`, `claimGeneratorInfo` typed as `Value`
 * but actually a plain array at runtime).
 */
export function toDisplayOutcome(outcome: LibraryOutcome): DisplayOutcome {
	const manifests = outcome.manifests.map((manifest) =>
		toDisplayManifest(manifest),
	);
	const manifestsById: Record<string, ManifestEntry> = {};
	for (const manifest of outcome.manifests) {
		manifestsById[manifest.id] = toDisplayManifest(
			manifest,
		) as unknown as ManifestEntry;
	}

	return {
		state: outcome.state,
		manifests,
		manifestStore: outcome.manifestStore
			? {
					activeManifest: outcome.manifestStore.activeManifest ?? "",
					manifests: manifestsById,
					validation_state: outcome.state ? "Valid" : "Unknown",
				}
			: undefined,
	};
}

function toDisplayManifest(manifest: RecognizedManifest): DisplayManifest {
	const signatureInfo = (manifest.signatureInfo ?? {}) as Record<
		string,
		string
	>;
	const thumbnailDataUri = manifest.thumbnail
		? `data:${manifest.thumbnail.format};base64,${Buffer.from(manifest.thumbnail.data).toString("base64")}`
		: null;

	const claimGeneratorInfo = (manifest.claimGeneratorInfo ??
		[]) as unknown as DisplayManifest["claimGeneratorInfo"];

	return {
		id: manifest.id,
		title: manifest.title ?? "",
		claimGenerator: manifest.claimGenerator ?? null,
		claimGeneratorInfo,
		instanceId: manifest.instanceId,
		signatureInfo: {
			alg: signatureInfo.alg ?? "",
			issuer: signatureInfo.issuer ?? "",
			common_name: signatureInfo.common_name ?? "",
			cert_serial_number: signatureInfo.cert_serial_number ?? "",
		},
		assertions: manifest.assertions as unknown as Record<string, unknown>,
		credentials:
			manifest.credentials as unknown as DisplayManifest["credentials"],
		thumbnail: thumbnailDataUri,
		ingredients: manifest.ingredients.map((ingredient) => ({
			title: ingredient.title ?? undefined,
			document_id: ingredient.manifestId ?? undefined,
		})) as unknown as DisplayManifest["ingredients"],
	};
}
