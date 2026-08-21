"use client";

import { useState } from "react";
import {
	CREATOR_ROLE_LABELS,
	CREATOR_ROLES,
	type CreatorRole,
	defaultTrainingPreferences,
	type ProfileInput,
	TRAINING_CATEGORIES,
	TRAINING_CATEGORY_LABELS,
	TRAINING_USE_VALUES,
	type TrainingUse,
	VERIFIED_IDENTITY_FIELD_LABELS,
	VERIFIED_IDENTITY_LABELS,
	VERIFIED_IDENTITY_TYPES,
	type VerifiedIdentityEntry,
} from "~/lib/profile";

interface ProfileFormProps {
	initialValues?: ProfileInput;
	submitLabel: string;
	onSubmit: (values: ProfileInput) => void;
}

const EMPTY: ProfileInput = {
	kind: "person",
	displayName: "",
	akaName: "",
	website: "",
	identifier: "",
	defaultRoles: [],
	verifiedIdentities: [],
	training: defaultTrainingPreferences(),
};

const TRAINING_USE_LABELS: Record<TrainingUse, string> = {
	allowed: "Allowed",
	notAllowed: "Not allowed",
	constrained: "Constrained",
};

export function ProfileForm({
	initialValues,
	submitLabel,
	onSubmit,
}: ProfileFormProps) {
	const [values, setValues] = useState<ProfileInput>(initialValues ?? EMPTY);

	function set<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
		setValues((prev) => ({ ...prev, [key]: value }));
	}

	function toggleRole(role: CreatorRole) {
		setValues((prev) => ({
			...prev,
			defaultRoles: prev.defaultRoles.includes(role)
				? prev.defaultRoles.filter((r) => r !== role)
				: [...prev.defaultRoles, role],
		}));
	}

	function addIdentity() {
		const entry: VerifiedIdentityEntry = {
			id: crypto.randomUUID(),
			type: "cawg.social_media",
			provider: "",
			value: "",
		};
		setValues((prev) => ({
			...prev,
			verifiedIdentities: [...prev.verifiedIdentities, entry],
		}));
	}

	function updateIdentity(id: string, patch: Partial<VerifiedIdentityEntry>) {
		setValues((prev) => ({
			...prev,
			verifiedIdentities: prev.verifiedIdentities.map((entry) =>
				entry.id === id ? { ...entry, ...patch } : entry,
			),
		}));
	}

	function removeIdentity(id: string) {
		setValues((prev) => ({
			...prev,
			verifiedIdentities: prev.verifiedIdentities.filter(
				(entry) => entry.id !== id,
			),
		}));
	}

	function updateTrainingUse(
		category: (typeof TRAINING_CATEGORIES)[number],
		use: TrainingUse,
	) {
		setValues((prev) => ({
			...prev,
			training: {
				...prev.training,
				[category]: { ...prev.training[category], use },
			},
		}));
	}

	function updateTrainingConstraint(
		category: (typeof TRAINING_CATEGORIES)[number],
		constraintInfo: string,
	) {
		setValues((prev) => ({
			...prev,
			training: {
				...prev.training,
				[category]: { ...prev.training[category], constraintInfo },
			},
		}));
	}

	return (
		<form
			className="dash-form"
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit(values);
			}}
		>
			<div className="field">
				<label htmlFor="kind">Profile type</label>
				<div className="segmented" id="kind">
					<button
						className={values.kind === "person" ? "active" : ""}
						onClick={() => set("kind", "person")}
						type="button"
					>
						Person
					</button>
					<button
						className={values.kind === "organization" ? "active" : ""}
						onClick={() => set("kind", "organization")}
						type="button"
					>
						Organization
					</button>
				</div>
			</div>

			<div className="field">
				<label htmlFor="displayName">
					{values.kind === "organization" ? "Organization name" : "Artist name"}
				</label>
				<input
					id="displayName"
					onChange={(e) => set("displayName", e.target.value)}
					required
					type="text"
					value={values.displayName}
				/>
			</div>

			{values.kind === "person" && (
				<div className="field">
					<label htmlFor="akaName">Also known as</label>
					<input
						id="akaName"
						onChange={(e) => set("akaName", e.target.value)}
						placeholder="Release, band, or label name"
						type="text"
						value={values.akaName}
					/>
				</div>
			)}

			<div className="field">
				<label htmlFor="website">Website</label>
				<input
					id="website"
					onChange={(e) => set("website", e.target.value)}
					placeholder="https://"
					type="url"
					value={values.website}
				/>
			</div>

			<div className="field">
				<label htmlFor="identifier">CAWG / DID identifier</label>
				<input
					id="identifier"
					onChange={(e) => set("identifier", e.target.value)}
					type="text"
					value={values.identifier}
				/>
				<span className="field-hint">
					A persistent identifier from an identity provider, if you have one.
				</span>
			</div>

			{values.kind === "organization" && (
				<p className="field-note">
					Under the CAWG Organizational Identity Profile, an organization's
					identity is established through the X.509 signing certificate used
					when authoring — not through profile fields. Sign-O-Tron handles that
					separately; the fields here just describe the organization for
					display.
				</p>
			)}

			{values.kind === "person" && (
				<>
					<fieldset className="field">
						<legend>Default roles</legend>
						<div className="checkbox-grid">
							{CREATOR_ROLES.map((role) => (
								<label className="checkbox-chip" key={role}>
									<input
										checked={values.defaultRoles.includes(role)}
										onChange={() => toggleRole(role)}
										type="checkbox"
									/>
									{CREATOR_ROLE_LABELS[role]}
								</label>
							))}
						</div>
						<span className="field-hint">
							Applied by default when you author a new release with this
							profile.
						</span>
					</fieldset>

					<div className="field">
						<span className="identity-legend">Verified identities</span>
						<span className="field-hint">
							Self-declared for now — not yet verified by an identity provider.
						</span>
						<div className="identity-list">
							{values.verifiedIdentities.map((entry) => {
								const fieldLabels = VERIFIED_IDENTITY_FIELD_LABELS[entry.type];
								return (
									<div className="identity-row" key={entry.id}>
										<select
											onChange={(e) =>
												updateIdentity(entry.id, {
													type: e.target.value as VerifiedIdentityEntry["type"],
												})
											}
											value={entry.type}
										>
											{VERIFIED_IDENTITY_TYPES.map((type) => (
												<option key={type} value={type}>
													{VERIFIED_IDENTITY_LABELS[type]}
												</option>
											))}
										</select>
										<input
											aria-label={fieldLabels.provider}
											onChange={(e) =>
												updateIdentity(entry.id, { provider: e.target.value })
											}
											placeholder={fieldLabels.provider}
											type="text"
											value={entry.provider}
										/>
										<input
											aria-label={fieldLabels.value}
											onChange={(e) =>
												updateIdentity(entry.id, { value: e.target.value })
											}
											placeholder={fieldLabels.value}
											type="text"
											value={entry.value}
										/>
										<button
											aria-label="Remove identity"
											className="btn btn-ghost btn-sm"
											onClick={() => removeIdentity(entry.id)}
											type="button"
										>
											&#215;
										</button>
									</div>
								);
							})}
						</div>
						<button
							className="btn btn-ghost btn-sm"
							onClick={addIdentity}
							type="button"
						>
							Add identity
						</button>
					</div>
				</>
			)}

			<fieldset className="field">
				<legend>Training &amp; data mining</legend>
				<span className="field-hint">
					Default permissions applied to releases authored with this profile.
				</span>
				<div className="training-grid">
					{TRAINING_CATEGORIES.map((category) => {
						const pref = values.training[category];
						return (
							<div className="training-row" key={category}>
								<span className="training-label">
									{TRAINING_CATEGORY_LABELS[category]}
								</span>
								<select
									aria-label={`${TRAINING_CATEGORY_LABELS[category]} use`}
									onChange={(e) =>
										updateTrainingUse(category, e.target.value as TrainingUse)
									}
									value={pref.use}
								>
									{TRAINING_USE_VALUES.map((use) => (
										<option key={use} value={use}>
											{TRAINING_USE_LABELS[use]}
										</option>
									))}
								</select>
								{pref.use === "constrained" && (
									<input
										aria-label={`${TRAINING_CATEGORY_LABELS[category]} constraint`}
										onChange={(e) =>
											updateTrainingConstraint(category, e.target.value)
										}
										placeholder="Constraint info, e.g. a license URL"
										type="text"
										value={pref.constraintInfo}
									/>
								)}
							</div>
						);
					})}
				</div>
			</fieldset>

			<button className="btn btn-primary btn-block" type="submit">
				{submitLabel}
			</button>
		</form>
	);
}
