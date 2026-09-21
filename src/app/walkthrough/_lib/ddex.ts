/**
 * Field options sourced from the DDEX ERN 4.3 Allowed Value Sets —
 * see https://ern.ddex.net/ (ParentalWarningType, CommercialModelType,
 * UseType) and Part 2 Release Profiles §7.4 (release/resource identifier
 * types). Trimmed to the values most relevant to a single-track release.
 */

export interface SelectOption {
	value: string;
	label: string;
}

export const RELEASE_IDENTIFIER_TYPES: SelectOption[] = [
	{ value: "ICPN", label: "ICPN" },
	{ value: "UPC", label: "UPC" },
	{ value: "EAN", label: "EAN" },
	{ value: "GRid", label: "GRid" },
];

export const PARENTAL_WARNING_TYPES: SelectOption[] = [
	{ value: "NotExplicit", label: "Not explicit" },
	{ value: "Explicit", label: "Explicit" },
	{ value: "ExplicitContentEdited", label: "Explicit content edited" },
	{ value: "Unknown", label: "Unknown" },
];

export const COMMERCIAL_MODEL_TYPES: SelectOption[] = [
	{ value: "PayAsYouGoModel", label: "Pay-as-you-go" },
	{ value: "SubscriptionModel", label: "Subscription" },
	{ value: "AdvertisementSupportedModel", label: "Advertisement-supported" },
	{ value: "FreeOfChargeModel", label: "Free of charge" },
	{ value: "DeviceFeeModel", label: "Device fee" },
];

export const USE_TYPES: SelectOption[] = [
	{ value: "PermanentDownload", label: "Permanent download" },
	{ value: "OnDemandStream", label: "On-demand stream" },
	{ value: "NonInteractiveStream", label: "Non-interactive stream" },
	{ value: "ConditionalDownload", label: "Conditional download" },
	{ value: "TetheredDownload", label: "Tethered download" },
];
