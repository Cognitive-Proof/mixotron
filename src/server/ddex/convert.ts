import { randomUUID } from "node:crypto";

/**
 * Flat, form-friendly shape — mirrors the fields captured by the DDEX
 * section of the walkthrough's addManifest page (see
 * src/app/walkthrough/rights-holder/addManifest/page.tsx), plus the two
 * pieces of context DDEX needs that live outside that section (the track's
 * title and its credited artist name).
 */
export interface DdexReleaseInput {
	title: string;
	artistName: string;

	// Identifiers
	isrc: string;
	/** ICPN | UPC | EAN | GRid | ProprietaryId */
	releaseIdentifierType: string;
	releaseIdentifierValue: string;

	// Release details
	label: string;
	genre: string;
	/** NotExplicit | Explicit | ExplicitContentEdited | Unknown */
	parentalWarning: string;
	pLine: string;
	cLine: string;

	// Deal terms
	territory: string;
	commercialModelType: string;
	useType: string;
	price: string;
	currency: string;
	/** yyyy-mm-dd */
	dealStartDate: string;
}

/**
 * A single JSON object shaped like a (deliberately simplified) DDEX ERN
 * NewReleaseMessage — see https://ern.ddex.net/. Real ERN is XML with a much
 * larger surface area (see ERN 4.3 Part 1 §6.2); this keeps just the
 * sections and fields a single-track release actually needs: one party
 * (the artist), one sound recording resource, one release, one deal.
 *
 * Reference anchors follow DDEX convention: the sole party is "P1", the
 * sole resource is "A1", the sole release is "R0" (an album-level release
 * reference, reused here for a standalone track).
 */
export interface DdexNewReleaseMessage {
	MessageHeader: {
		MessageId: string;
		MessageCreatedDateTime: string;
	};
	PartyList: {
		PartyReference: string;
		PartyName: { FullName: string };
	}[];
	ResourceList: {
		SoundRecording: {
			ResourceReference: string;
			ISRC: string;
			DisplayTitleText: string;
			DisplayArtist: { ArtistPartyReference: string }[];
		}[];
	};
	ReleaseList: {
		Release: {
			ReleaseReference: string;
			ReleaseId: Record<string, string>;
			DisplayTitleText: string;
			DisplayArtist: { ArtistPartyReference: string }[];
			LabelName: string;
			DisplayGenre: string;
			ParentalWarningType: string;
			PLine: string;
			CLine: string;
			ReleaseResourceReferenceList: string[];
		}[];
	};
	DealList: {
		ReleaseDeal: {
			DealReleaseReference: string;
			Deal: {
				Territory: string[];
				DealTerms: {
					CommercialModelType: string;
					UseType: string[];
					PriceInformation: {
						WholesalePrice: { Amount: string; CurrencyCode: string };
					};
					ValidityPeriod: { StartDate: string };
				};
			};
		}[];
	};
}

const PARTY_REFERENCE = "P1";
const RESOURCE_REFERENCE = "A1";
const RELEASE_REFERENCE = "R0";

/** Converts the flat form data into a structured DDEX-shaped JSON object. */
export function toDdexMessage(input: DdexReleaseInput): DdexNewReleaseMessage {
	return {
		MessageHeader: {
			MessageId: randomUUID(),
			MessageCreatedDateTime: new Date().toISOString(),
		},
		PartyList: [
			{
				PartyReference: PARTY_REFERENCE,
				PartyName: { FullName: input.artistName },
			},
		],
		ResourceList: {
			SoundRecording: [
				{
					ResourceReference: RESOURCE_REFERENCE,
					ISRC: input.isrc,
					DisplayTitleText: input.title,
					DisplayArtist: [{ ArtistPartyReference: PARTY_REFERENCE }],
				},
			],
		},
		ReleaseList: {
			Release: [
				{
					ReleaseReference: RELEASE_REFERENCE,
					ReleaseId: {
						[input.releaseIdentifierType]: input.releaseIdentifierValue,
					},
					DisplayTitleText: input.title,
					DisplayArtist: [{ ArtistPartyReference: PARTY_REFERENCE }],
					LabelName: input.label,
					DisplayGenre: input.genre,
					ParentalWarningType: input.parentalWarning,
					PLine: input.pLine,
					CLine: input.cLine,
					ReleaseResourceReferenceList: [RESOURCE_REFERENCE],
				},
			],
		},
		DealList: {
			ReleaseDeal: [
				{
					DealReleaseReference: RELEASE_REFERENCE,
					Deal: {
						Territory: [input.territory],
						DealTerms: {
							CommercialModelType: input.commercialModelType,
							UseType: [input.useType],
							PriceInformation: {
								WholesalePrice: {
									Amount: input.price,
									CurrencyCode: input.currency,
								},
							},
							ValidityPeriod: { StartDate: input.dealStartDate },
						},
					},
				},
			],
		},
	};
}

/**
 * Converts a DDEX-shaped JSON object back into the flat form shape.
 * Reads the first party/resource/release/deal — the only cardinality
 * toDdexMessage() ever produces — so this is a faithful inverse of it, but
 * it will silently drop extra entries in a hand-edited multi-item message.
 */
export function fromDdexMessage(
	message: DdexNewReleaseMessage,
): DdexReleaseInput {
	const party = message.PartyList[0];
	const resource = message.ResourceList.SoundRecording[0];
	const release = message.ReleaseList.Release[0];
	const releaseDeal = message.DealList.ReleaseDeal[0];
	const deal = releaseDeal?.Deal;
	const dealTerms = deal?.DealTerms;

	const [releaseIdentifierType, releaseIdentifierValue] = release?.ReleaseId
		? (Object.entries(release.ReleaseId)[0] ?? ["", ""])
		: ["", ""];

	return {
		title: resource?.DisplayTitleText ?? release?.DisplayTitleText ?? "",
		artistName: party?.PartyName.FullName ?? "",

		isrc: resource?.ISRC ?? "",
		releaseIdentifierType,
		releaseIdentifierValue,

		label: release?.LabelName ?? "",
		genre: release?.DisplayGenre ?? "",
		parentalWarning: release?.ParentalWarningType ?? "",
		pLine: release?.PLine ?? "",
		cLine: release?.CLine ?? "",

		territory: deal?.Territory[0] ?? "",
		commercialModelType: dealTerms?.CommercialModelType ?? "",
		useType: dealTerms?.UseType[0] ?? "",
		price: dealTerms?.PriceInformation.WholesalePrice.Amount ?? "",
		currency: dealTerms?.PriceInformation.WholesalePrice.CurrencyCode ?? "",
		dealStartDate: dealTerms?.ValidityPeriod.StartDate ?? "",
	};
}
