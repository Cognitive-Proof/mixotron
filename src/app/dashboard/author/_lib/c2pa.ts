export interface OptionInfo {
	value: string;
	label: string;
	hint: string;
}

/**
 * c2pa.actions — Standard_Assertions/Actions.adoc, "Mandatory presence of at
 * least one actions assertion". The first action in a manifest must be either
 * c2pa.created (de novo) or c2pa.opened (editing an existing parentOf
 * ingredient).
 */
export const CREATION_ORIGINS = [
	{
		value: "created",
		label: "Created from scratch",
		hint: "A new file — first created, captured, or generated.",
	},
	{
		value: "opened",
		label: "Opened an existing recording",
		hint: "Editing an existing asset, which becomes the parentOf ingredient.",
	},
] as const;
export type CreationOrigin = (typeof CREATION_ORIGINS)[number]["value"];

/**
 * digitalSourceType — Standard_Assertions/Actions.adoc "Digital Source Type".
 * Values are from the IPTC digital source type NewsCodes
 * (http://cv.iptc.org/newscodes/digitalsourcetype/), except the two
 * c2pa.org-prefixed values, which are C2PA-specific. Limited to the values
 * that actually appear in the C2PA spec's own text/examples.
 */
export const DIGITAL_SOURCE_TYPES: OptionInfo[] = [
	{
		value: "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture",
		label: "Digital capture",
		hint: "Recorded live, straight to digital — e.g. a live take.",
	},
	{
		value: "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCreation",
		label: "Digital creation",
		hint: "Composed or produced directly in digital form.",
	},
	{
		value: "http://cv.iptc.org/newscodes/digitalsourcetype/humanEdits",
		label: "Human edits",
		hint: "Edited by a person, without an AI model.",
	},
	{
		value: "http://cv.iptc.org/newscodes/digitalsourcetype/compositeSynthetic",
		label: "Composite synthetic",
		hint: "A mix of synthetic and other elements.",
	},
	{
		value:
			"http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
		label: "AI-generated",
		hint: "Produced by a generative AI model (trained algorithmic media).",
	},
	{
		value:
			"http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia",
		label: "Composite with AI-generated media",
		hint: "Combines AI-generated material with other sources.",
	},
	{
		value: "http://c2pa.org/digitalsourcetype/empty",
		label: "Empty",
		hint: "Starting from a blank project — nothing recorded yet.",
	},
];

const AI_DIGITAL_SOURCE_TYPES = new Set([
	"http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
	"http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia",
]);

export function digitalSourceTypeInvolvesAI(value: string): boolean {
	return AI_DIGITAL_SOURCE_TYPES.has(value);
}

/**
 * c2pa.actions — Standard_Assertions/actions.yaml. Curated to the
 * non-deprecated actions most relevant to music, podcast, and video
 * authoring (image/font-only actions like cropped, filtered, drawing are
 * omitted).
 */
export const ACTIONS: OptionInfo[] = [
	{
		value: "c2pa.remixed",
		label: "Remixed",
		hint: "Re-arranged, sampled, looped, or reinterpreted a prior recording.",
	},
	{
		value: "c2pa.mixed",
		label: "Mixed",
		hint: "Combined multiple placed audio ingredients (stems, vocals, drums, etc).",
	},
	{
		value: "c2pa.dubbed",
		label: "Dubbed",
		hint: "Changes to one or more audio tracks.",
	},
	{
		value: "c2pa.mastered",
		label: "Mastered",
		hint: "Quality-control changes prior to delivery or distribution.",
	},
	{
		value: "c2pa.edited",
		label: "Edited",
		hint: "General editorial changes to the content.",
	},
	{
		value: "c2pa.enhanced",
		label: "Enhanced",
		hint: "Noise reduction, compression, sharpening, and similar.",
	},
	{
		value: "c2pa.trimmed",
		label: "Trimmed",
		hint: "Removed a range from the start and/or end.",
	},
	{
		value: "c2pa.changedSpeed",
		label: "Changed speed",
		hint: "Sped up or slowed down playback.",
	},
	{
		value: "c2pa.translated",
		label: "Translated",
		hint: "Changed the language of the content.",
	},
	{
		value: "c2pa.transcoded",
		label: "Transcoded",
		hint: "Converted encoding, resolution, or bitrate.",
	},
	{
		value: "c2pa.converted",
		label: "Converted",
		hint: "Changed the file format.",
	},
	{
		value: "c2pa.repackaged",
		label: "Repackaged",
		hint: "Changed container format without transcoding.",
	},
	{
		value: "c2pa.watermarked.bound",
		label: "Watermarked",
		hint: "Inserted an invisible watermark tied to a soft binding.",
	},
	{
		value: "c2pa.reviewed",
		label: "Reviewed",
		hint: "Read and assessed without modification.",
	},
	{
		value: "c2pa.published",
		label: "Published",
		hint: "Released to a wider audience.",
	},
];

/**
 * Ingredient relationship — Standard_Assertions/Ingredient.adoc,
 * "Relationship".
 */
export const INGREDIENT_RELATIONSHIPS = [
	{
		value: "parentOf",
		label: "Original",
		hint: "This release is a derived asset or rendition of this ingredient.",
	},
	{
		value: "componentOf",
		label: "Component",
		hint: "One of several parts composed into this release.",
	},
	{
		value: "inputTo",
		label: "AI/ML input",
		hint: "Used as input to a computational or AI/ML process.",
	},
] as const;
export type IngredientRelationship =
	(typeof INGREDIENT_RELATIONSHIPS)[number]["value"];

/**
 * c2pa.ai-disclosure — Standard_Assertions/AIDisclosure.adoc,
 * content-profile-map.humanOversightLevel.
 */
export const HUMAN_OVERSIGHT_LEVELS: OptionInfo[] = [
	{
		value: "fully_autonomous",
		label: "Fully autonomous",
		hint: "No human review after the model's output.",
	},
	{
		value: "prompt_guided",
		label: "Prompt-guided",
		hint: "A human provided prompts or settings but did not give final approval.",
	},
	{
		value: "human_validated",
		label: "Human-validated",
		hint: "A human reviewed and approved the final output before release.",
	},
];
