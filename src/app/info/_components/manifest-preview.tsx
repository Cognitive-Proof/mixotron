"use client";

import { C2paManifest } from "c2pa-react-component";
import type { VerificationOutcome } from "c2pa-react-component-types";

export interface ExampleIngredient {
	title: string;
	format?: string;
	relationship: "parentOf" | "componentOf" | "inputTo";
	/** Id of another entry in the same `manifests` array — links this
	 * ingredient to its own node in the level-3 provenance graph. Omit for
	 * an ingredient whose own manifest isn't part of this example. */
	activeManifestId?: string;
}

export interface ExampleManifest {
	id: string;
	title: string;
	claimGenerator: string;
	assertions?: Record<string, unknown>;
	ingredients?: ExampleIngredient[];
}

/**
 * Wraps one or more hand-authored manifests (the guidance doc's JSON
 * examples) in the minimal VerificationOutcome shape C2paManifest expects,
 * so the doc can render the same provenance graph (level 3) and "Forensic
 * view" (level 4) Mix-O-Tron itself uses for a real verified manifest,
 * rather than hand-rolling a lookalike UI. Passing more than one manifest
 * (with ingredients cross-referencing each other's id) produces a real
 * multi-node graph, for examples that chain manifests together.
 *
 * This is illustrative only — no signing or verification actually happened,
 * so signature/thumbnail fields are left out and the components' own "No
 * signature info" fallbacks cover the gap.
 */
function buildExampleOutcome(
	manifests: ExampleManifest[],
	activeId: string,
): VerificationOutcome {
	const entries: Record<string, unknown> = {};
	for (const manifest of manifests) {
		entries[manifest.id] = {
			title: manifest.title,
			claimGenerator: manifest.claimGenerator,
			claimGeneratorInfo: [{ name: manifest.claimGenerator }],
			instanceId: `urn:uuid:${manifest.id}`,
			assertions: manifest.assertions ?? {},
			ingredients: (manifest.ingredients ?? []).map((ingredient) => ({
				title: ingredient.title,
				format: ingredient.format,
				relationship: ingredient.relationship,
				active_manifest: ingredient.activeManifestId,
			})),
		};
	}

	return {
		state: true,
		manifests: manifests.map((manifest) => ({
			id: manifest.id,
			...(entries[manifest.id] as object),
		})),
		manifestStore: {
			activeManifest: activeId,
			manifests: entries,
			validation_state: "Valid",
		},
	} as unknown as VerificationOutcome;
}

export function ManifestPreview({
	manifests,
	activeId,
}: {
	manifests: ExampleManifest[];
	activeId: string;
}) {
	const outcome = buildExampleOutcome(manifests, activeId);
	return (
		<div className="doc-preview">
			<div className="doc-preview-label">
				Rendered with c2pa-react-component — illustrative, not a real signed
				file
			</div>
			<div className="doc-preview-section">
				<C2paManifest level={3} manifest={outcome} />
			</div>
			<div className="doc-preview-label doc-preview-label--divider">
				Forensic view
			</div>
			<div className="doc-preview-section">
				<C2paManifest level={4} manifest={outcome} />
			</div>
		</div>
	);
}
