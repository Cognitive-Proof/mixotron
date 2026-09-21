import type { OptionInfo } from "~/app/dashboard/author/_lib/c2pa";

/**
 * Same IPTC/C2PA digitalSourceType values as the dashboard's
 * DIGITAL_SOURCE_TYPES (src/app/dashboard/author/_lib/c2pa.ts), but with
 * longer, example-driven hints aimed at someone new to C2PA rather than
 * someone already authoring a manifest.
 */
export const WALKTHROUGH_DIGITAL_SOURCE_TYPES: OptionInfo[] = [
	{
		value: "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture",
		label: "Digital capture",
		hint: "Audio recorded from a real-world performance or sound using a digital recording device, such as a microphone, field recorder, or digital mixing console.",
	},
	{
		value: "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCreation",
		label: "Digital creation",
		hint: "Audio created by a person using non-generative digital tools, such as a DAW, synthesizer, sequencer, or virtual instrument.",
	},
	{
		value: "http://cv.iptc.org/newscodes/digitalsourcetype/humanEdits",
		label: "Human-edited media",
		hint: "Existing audio that was edited, corrected, or enhanced by a person using non-generative tools, such as cutting, mixing, equalization, or manual pitch correction.",
	},
	{
		value: "http://cv.iptc.org/newscodes/digitalsourcetype/compositeSynthetic",
		label: "Composite including AI-generated media",
		hint: "Audio assembled from multiple elements where at least one element was generated using AI—for example, a human performance mixed with AI-generated vocals.",
	},
	{
		value:
			"http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
		label: "Created using generative AI",
		hint: "Audio created primarily by a generative AI model, such as an AI-generated song, instrumental passage, voice, or sound effect.",
	},
	{
		value:
			"http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia",
		label: "Edited using generative AI",
		hint: "Existing audio that was corrected, extended, transformed, or enhanced using a generative AI model, such as AI stem replacement, voice transformation, or generative restoration.",
	},
	{
		value: "http://c2pa.org/digitalsourcetype/empty",
		label: "Empty project",
		hint: "The work began with a blank project or timeline, with no existing media used as its starting point.",
	},
];
