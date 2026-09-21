"use client";

import { useState } from "react";
import { ProfileForm } from "~/app/dashboard/_components/profile-form";
import {
	ACTIONS,
	HUMAN_OVERSIGHT_LEVELS,
} from "~/app/dashboard/author/_lib/c2pa";
import {
	COMMERCIAL_MODEL_TYPES,
	PARENTAL_WARNING_TYPES,
	RELEASE_IDENTIFIER_TYPES,
	USE_TYPES,
} from "~/app/walkthrough/_lib/ddex";
import { defaultTrainingPreferences, type ProfileInput } from "~/lib/profile";

/**
 * Shared between /walkthrough/rights-holder/addManifest (first Content
 * Credential onto a clean file) and /walkthrough/rights-holder/updateManifest
 * (a new manifest onto a file that already has one, keeping the old one as a
 * parentOf ingredient) — everything below is identical between the two flows;
 * only the audio upload/verification gate and (for AI disclosure) whether a
 * digital source type picker exists to recommend it from differ per page.
 */

export interface DdexData {
	artistName: string;
	isrc: string;
	releaseIdentifierType: string;
	releaseIdentifierValue: string;
	label: string;
	genre: string;
	parentalWarning: string;
	pLine: string;
	cLine: string;
	territory: string;
	commercialModelType: string;
	useType: string;
	price: string;
	currency: string;
	dealStartDate: string;
}

export function defaultDdexData(): DdexData {
	return {
		artistName: "",
		isrc: "",
		releaseIdentifierType: RELEASE_IDENTIFIER_TYPES[0]?.value ?? "",
		releaseIdentifierValue: "",
		label: "",
		genre: "",
		parentalWarning: PARENTAL_WARNING_TYPES[0]?.value ?? "",
		pLine: "",
		cLine: "",
		territory: "Worldwide",
		commercialModelType: COMMERCIAL_MODEL_TYPES[0]?.value ?? "",
		useType: USE_TYPES[0]?.value ?? "",
		price: "",
		currency: "USD",
		dealStartDate: "",
	};
}

/** What the "Fill with Test Info" button on DdexFields fills in — plausible
 * values for every field so the walkthrough can be clicked through without
 * having to invent a fake release. */
function testDdexData(): DdexData {
	return {
		artistName: "Test Artist",
		isrc: "US-ABC-26-00001",
		releaseIdentifierType: "UPC",
		releaseIdentifierValue: "00602547000000",
		label: "Test Records",
		genre: "Electronic",
		parentalWarning: "NotExplicit",
		pLine: "2026 Test Records",
		cLine: "2026 Test Records",
		territory: "Worldwide",
		commercialModelType: "PayAsYouGoModel",
		useType: "OnDemandStream",
		price: "9.99",
		currency: "USD",
		dealStartDate: new Date().toISOString().slice(0, 10),
	};
}

export interface AiDisclosureState {
	modelType: string;
	modelName: string;
	modelIdentifier: string;
	humanOversightLevel: string;
}

export function defaultAiDisclosure(): AiDisclosureState {
	return {
		modelType: "",
		modelName: "",
		modelIdentifier: "",
		humanOversightLevel: HUMAN_OVERSIGHT_LEVELS[0]?.value ?? "",
	};
}

/** What the "Fill with Test Info" button on AiDisclosureFields fills in. */
function testAiDisclosure(): AiDisclosureState {
	return {
		modelType: "text-to-audio",
		modelName: "SynthMix Studio",
		modelIdentifier: "https://example.com/models/synthmix-studio-v2",
		humanOversightLevel: "human_validated",
	};
}

/** What the "Fill with Test Info" button on CawgFields fills the embedded
 * ProfileForm with. */
function testProfileInput(): ProfileInput {
	return {
		kind: "person",
		displayName: "Jordan Rivera",
		akaName: "DJ Testtrack",
		website: "https://example.com/jordan-rivera",
		identifier: "",
		defaultRoles: ["cawg.creator"],
		verifiedIdentities: [],
		training: defaultTrainingPreferences(),
	};
}

export function TitleAndDescriptionFields({
	title,
	description,
	onTitleChange,
	onDescriptionChange,
}: {
	title: string;
	description: string;
	onTitleChange: (value: string) => void;
	onDescriptionChange: (value: string) => void;
}) {
	return (
		<fieldset className="field">
			<div className="field">
				<legend className="section-legend">Title</legend>
				<input
					id="walkthrough-title"
					onChange={(e) => onTitleChange(e.target.value)}
					required
					type="text"
					value={title}
				/>
			</div>
			<div className="field">
				<legend className="section-legend">Description</legend>
				<textarea
					id="walkthrough-description"
					onChange={(e) => onDescriptionChange(e.target.value)}
					value={description}
				/>
			</div>
		</fieldset>
	);
}

export function ActionsPerformedPicker({
	selected,
	onToggle,
}: {
	selected: Set<string>;
	onToggle: (value: string) => void;
}) {
	return (
		<fieldset className="field">
			<legend className="section-legend">Actions performed</legend>
			<div className="pick-grid">
				{ACTIONS.map((action) => {
					const isSelected = selected.has(action.value);
					return (
						<label
							className={`pick-card ${isSelected ? "selected" : ""}`}
							key={action.value}
						>
							<span className="pick-card-head">
								<input
									checked={isSelected}
									onChange={() => onToggle(action.value)}
									type="checkbox"
								/>
								<span className="pick-card-label">{action.label}</span>
							</span>
							<span className="pick-card-hint">{action.hint}</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

export function AiDisclosureFields({
	enabled,
	onEnabledChange,
	recommended,
	value,
	onChange,
}: {
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
	recommended: boolean;
	value: AiDisclosureState;
	onChange: (patch: Partial<AiDisclosureState>) => void;
}) {
	return (
		<fieldset className="field">
			<label className="checkbox-chip enable-toggle">
				<input
					checked={enabled}
					onChange={(e) => onEnabledChange(e.target.checked)}
					type="checkbox"
				/>
				Add AI disclosure
			</label>
			{recommended && !enabled && (
				<p className="field-note">
					Recommended — one of the digital source types you picked above
					involves AI.
				</p>
			)}

			{enabled && (
				<div className="toggle-fields">
					<p className="field-note">
						This complements — it doesn&apos;t replace — the digital source type
						and actions: it discloses which model was used and how much human
						review its output got before release.
					</p>
					<button
						className="btn btn-ghost btn-sm"
						onClick={() => onChange(testAiDisclosure())}
						style={{ marginBottom: "1rem" }}
						type="button"
					>
						Fill with Test Info
					</button>
					<div className="field">
						<label htmlFor="ai-model-type">Model type</label>
						<input
							id="ai-model-type"
							onChange={(e) => onChange({ modelType: e.target.value })}
							placeholder="e.g. text-to-audio"
							type="text"
							value={value.modelType}
						/>
					</div>
					<div className="field-row">
						<div className="field">
							<label htmlFor="ai-model-name">Model name</label>
							<input
								id="ai-model-name"
								onChange={(e) => onChange({ modelName: e.target.value })}
								type="text"
								value={value.modelName}
							/>
						</div>
						<div className="field">
							<label htmlFor="ai-model-identifier">Model identifier</label>
							<input
								id="ai-model-identifier"
								onChange={(e) => onChange({ modelIdentifier: e.target.value })}
								placeholder="URI or PURL"
								type="text"
								value={value.modelIdentifier}
							/>
						</div>
					</div>
					<div className="field">
						<label htmlFor="ai-human-oversight">Human oversight</label>
						<select
							id="ai-human-oversight"
							onChange={(e) =>
								onChange({ humanOversightLevel: e.target.value })
							}
							value={value.humanOversightLevel}
						>
							{HUMAN_OVERSIGHT_LEVELS.map((level) => (
								<option key={level.value} value={level.value}>
									{level.label}
								</option>
							))}
						</select>
						<span className="field-hint">
							{
								HUMAN_OVERSIGHT_LEVELS.find(
									(level) => level.value === value.humanOversightLevel,
								)?.hint
							}
						</span>
					</div>
				</div>
			)}
		</fieldset>
	);
}

export function CawgFields({
	enabled,
	onEnabledChange,
	profile,
	onProfileChange,
}: {
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
	profile: ProfileInput | null;
	onProfileChange: (profile: ProfileInput) => void;
}) {
	// ProfileForm owns its own field state internally (initialValues only
	// seeds it on mount) — so filling it with test data means forcing a
	// remount with fresh initialValues, by giving it a new `key` each click,
	// rather than pushing values into it directly.
	const [fillCount, setFillCount] = useState(0);

	return (
		<fieldset className="field">
			<label className="checkbox-chip enable-toggle">
				<input
					checked={enabled}
					onChange={(e) => onEnabledChange(e.target.checked)}
					type="checkbox"
				/>
				Enable CAWG identity
			</label>

			{enabled && (
				<div className="toggle-fields">
					<p className="field-note">
						CAWG (Creator Assertions Working Group) identity attaches a named
						actor — a person or organization — to this manifest, the same way a
						saved Profile does when you author a release. Filling this out and
						submitting it below creates a real, reusable Profile — but instead
						of a WebAuthn device key, its signing key is generated and held on
						the server, so it can sign without a passkey each time. That&apos;s
						a real reduction in identity assurance compared to a WebAuthn
						profile; use it for this walkthrough, not for anything you need
						strong custody guarantees on.
					</p>
					<button
						className="btn btn-ghost btn-sm"
						onClick={() => setFillCount((n) => n + 1)}
						style={{ marginBottom: "1rem" }}
						type="button"
					>
						Fill with Test Info
					</button>
					<ProfileForm
						initialValues={fillCount > 0 ? testProfileInput() : undefined}
						key={fillCount}
						onSubmit={(profileValues) => onProfileChange(profileValues)}
						submitLabel={
							profile ? "Identity ready — update" : "Use this identity"
						}
					/>
					{profile && (
						<p className="field-note">
							&ldquo;{profile.displayName || "Untitled"}&rdquo; will be created
							as a new profile and used to sign below.
						</p>
					)}
				</div>
			)}
		</fieldset>
	);
}

export function DdexFields({
	enabled,
	onEnabledChange,
	data,
	onChange,
}: {
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
	data: DdexData;
	onChange: <K extends keyof DdexData>(key: K, value: DdexData[K]) => void;
}) {
	return (
		<fieldset className="field">
			<label className="checkbox-chip enable-toggle">
				<input
					checked={enabled}
					onChange={(e) => onEnabledChange(e.target.checked)}
					type="checkbox"
				/>
				Enable DDEX release information
			</label>

			{enabled && (
				<div className="toggle-fields">
					<p className="field-note">
						DDEX (ERN) is the format distributors and DSPs use to receive
						release metadata. A manifest alone can&apos;t produce a submittable
						DDEX message — a real release also needs an assigned ISRC, a release
						identifier, and deal terms from your distributor. These fields are
						embedded in the manifest as a custom claim (org.mixotron.ddex)
						alongside it.
					</p>
					<button
						className="btn btn-ghost btn-sm"
						onClick={() => {
							const test = testDdexData();
							for (const key of Object.keys(test) as (keyof DdexData)[]) {
								onChange(key, test[key]);
							}
						}}
						style={{ marginBottom: "1rem" }}
						type="button"
					>
						Fill with Test Info
					</button>

					<h3>Identifiers</h3>
					<div className="field">
						<label htmlFor="ddex-artist-name">Artist name</label>
						<input
							id="ddex-artist-name"
							onChange={(e) => onChange("artistName", e.target.value)}
							type="text"
							value={data.artistName}
						/>
						<span className="field-hint">
							Credited recording artist for this release.
						</span>
					</div>
					<div className="field">
						<label htmlFor="ddex-isrc">ISRC</label>
						<input
							id="ddex-isrc"
							onChange={(e) => onChange("isrc", e.target.value)}
							placeholder="e.g. US-ABC-26-00001"
							type="text"
							value={data.isrc}
						/>
						<span className="field-hint">
							Identifies this specific sound recording. Assigned by your label,
							distributor, or a national ISRC agency — Mix-O-Tron doesn&apos;t
							issue these itself.
						</span>
					</div>
					<div className="field-row">
						<div className="field">
							<label htmlFor="ddex-release-id-type">
								Release identifier type
							</label>
							<select
								id="ddex-release-id-type"
								onChange={(e) =>
									onChange("releaseIdentifierType", e.target.value)
								}
								value={data.releaseIdentifierType}
							>
								{RELEASE_IDENTIFIER_TYPES.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div className="field">
							<label htmlFor="ddex-release-id-value">Release identifier</label>
							<input
								id="ddex-release-id-value"
								onChange={(e) =>
									onChange("releaseIdentifierValue", e.target.value)
								}
								placeholder="e.g. 00602547000000"
								type="text"
								value={data.releaseIdentifierValue}
							/>
						</div>
					</div>
					<span className="field-hint">
						Identifies the release itself (the &ldquo;product&rdquo;), separate
						from the recording. Usually assigned by your distributor when the
						release is set up for sale.
					</span>

					<h3>Release details</h3>
					<div className="field">
						<label htmlFor="ddex-label">Label</label>
						<input
							id="ddex-label"
							onChange={(e) => onChange("label", e.target.value)}
							type="text"
							value={data.label}
						/>
					</div>
					<div className="field">
						<label htmlFor="ddex-genre">Genre</label>
						<input
							id="ddex-genre"
							onChange={(e) => onChange("genre", e.target.value)}
							type="text"
							value={data.genre}
						/>
					</div>
					<div className="field">
						<label htmlFor="ddex-parental-warning">Parental advisory</label>
						<select
							id="ddex-parental-warning"
							onChange={(e) => onChange("parentalWarning", e.target.value)}
							value={data.parentalWarning}
						>
							{PARENTAL_WARNING_TYPES.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
					<div className="field-row">
						<div className="field">
							<label htmlFor="ddex-pline">℗ line</label>
							<input
								id="ddex-pline"
								onChange={(e) => onChange("pLine", e.target.value)}
								placeholder="e.g. 2026 Example Records"
								type="text"
								value={data.pLine}
							/>
							<span className="field-hint">
								Sound recording copyright credit.
							</span>
						</div>
						<div className="field">
							<label htmlFor="ddex-cline">© line</label>
							<input
								id="ddex-cline"
								onChange={(e) => onChange("cLine", e.target.value)}
								placeholder="e.g. 2026 Example Records"
								type="text"
								value={data.cLine}
							/>
							<span className="field-hint">
								Artwork/liner-notes copyright credit.
							</span>
						</div>
					</div>

					<h3>Deal terms</h3>
					<p className="field-note">
						Deal terms describe when, where, and how a DSP may make this release
						available — they come from your distribution agreement, not from the
						manifest.
					</p>
					<div className="field">
						<label htmlFor="ddex-territory">Territory</label>
						<input
							id="ddex-territory"
							onChange={(e) => onChange("territory", e.target.value)}
							type="text"
							value={data.territory}
						/>
					</div>
					<div className="field-row">
						<div className="field">
							<label htmlFor="ddex-commercial-model">Commercial model</label>
							<select
								id="ddex-commercial-model"
								onChange={(e) =>
									onChange("commercialModelType", e.target.value)
								}
								value={data.commercialModelType}
							>
								{COMMERCIAL_MODEL_TYPES.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div className="field">
							<label htmlFor="ddex-use-type">Use type</label>
							<select
								id="ddex-use-type"
								onChange={(e) => onChange("useType", e.target.value)}
								value={data.useType}
							>
								{USE_TYPES.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</div>
					<div className="field-row">
						<div className="field">
							<label htmlFor="ddex-price">Price</label>
							<input
								id="ddex-price"
								inputMode="decimal"
								onChange={(e) => onChange("price", e.target.value)}
								type="text"
								value={data.price}
							/>
						</div>
						<div className="field">
							<label htmlFor="ddex-currency">Currency</label>
							<input
								id="ddex-currency"
								maxLength={3}
								onChange={(e) =>
									onChange("currency", e.target.value.toUpperCase())
								}
								type="text"
								value={data.currency}
							/>
						</div>
						<div className="field">
							<label htmlFor="ddex-deal-start">Deal start date</label>
							<input
								id="ddex-deal-start"
								onChange={(e) => onChange("dealStartDate", e.target.value)}
								type="date"
								value={data.dealStartDate}
							/>
						</div>
					</div>
				</div>
			)}
		</fieldset>
	);
}
