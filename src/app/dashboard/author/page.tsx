"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type DragEvent, useEffect, useRef, useState } from "react";
import {
	ACTIONS,
	CREATION_ORIGINS,
	type CreationOrigin,
	DIGITAL_SOURCE_TYPES,
	digitalSourceTypeInvolvesAI,
	HUMAN_OVERSIGHT_LEVELS,
	INGREDIENT_RELATIONSHIPS,
	type IngredientRelationship,
	type OptionInfo,
} from "~/app/dashboard/author/_lib/c2pa";
import { base64ToFile, fileToBase64 } from "~/lib/client-file";
import {
	detectVerifyFormat,
	type ManifestVerificationResult,
} from "~/lib/manifest";
import { api } from "~/trpc/react";

const MAX_INGREDIENTS = 20;

type VerificationState = "checking" | ManifestVerificationResult;

interface IngredientFile {
	id: string;
	file: File;
	relationship: IngredientRelationship;
	verification: VerificationState;
}

function formatSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function labelFor(options: readonly OptionInfo[], value: string) {
	return options.find((o) => o.value === value)?.label ?? value;
}

function unsupportedResult(fileName: string): ManifestVerificationResult {
	return {
		status: "unsupported",
		cached: false,
		hash: "",
		fileName,
		format: fileName.split(".").pop() ?? "unknown",
		id: null,
		name: fileName,
		manifestId: null,
		claimGenerator: null,
		ingredients: [],
	};
}

function verificationSummary(state: VerificationState): string {
	if (state === "checking") return "checking…";
	switch (state.status) {
		case "verified":
			return `verified: ${state.name}`;
		case "unverified":
			return "no manifest found";
		default:
			return "not verifiable yet";
	}
}

export default function AuthorPage() {
	const { data, isPending } = api.profile.list.useQuery();
	const profiles = data ?? [];
	const isReady = !isPending;
	const verifyManifest = api.manifest.verify.useMutation();
	const produceManifest = api.manifest.produce.useMutation();

	const [profileId, setProfileId] = useState("");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");

	const [creationOrigin, setCreationOrigin] =
		useState<CreationOrigin>("created");
	const [digitalSourceType, setDigitalSourceType] = useState(
		DIGITAL_SOURCE_TYPES[0]?.value ?? "",
	);
	const [selectedActions, setSelectedActions] = useState<string[]>([]);

	const [aiModelType, setAiModelType] = useState("");
	const [aiModelName, setAiModelName] = useState("");
	const [aiModelIdentifier, setAiModelIdentifier] = useState("");
	const [aiHumanOversight, setAiHumanOversight] = useState(
		HUMAN_OVERSIGHT_LEVELS[0]?.value ?? "",
	);

	const [finishedFile, setFinishedFile] = useState<File | null>(null);
	const [finishedActive, setFinishedActive] = useState(false);
	const finishedInputRef = useRef<HTMLInputElement>(null);

	// ?linkUpload=<id> arrives from the Link upload landing page — pulls the
	// file a tool like Audacity uploaded back down into the browser so it
	// behaves exactly as if the user had picked it themselves.
	const linkUploadId = useSearchParams().get("linkUpload");
	const linkUpload = api.link.downloadUpload.useQuery(
		{ uploadId: linkUploadId ?? "" },
		{ enabled: Boolean(linkUploadId) },
	);
	const [linkUploadApplied, setLinkUploadApplied] = useState(false);
	useEffect(() => {
		if (!linkUpload.data || linkUploadApplied) return;
		const { name, fileName, contentType, dataBase64 } = linkUpload.data;
		setFinishedFile(base64ToFile(dataBase64, fileName, contentType));
		setTitle((current) => current || name);
		setLinkUploadApplied(true);
	}, [linkUpload.data, linkUploadApplied]);

	const [ingredients, setIngredients] = useState<IngredientFile[]>([]);
	const [ingredientsActive, setIngredientsActive] = useState(false);
	const ingredientsInputRef = useRef<HTMLInputElement>(null);

	const [status, setStatus] = useState<"idle" | "producing" | "produced">(
		"idle",
	);
	const [produceError, setProduceError] = useState<string | null>(null);
	const [signedResult, setSignedResult] = useState<{
		base64: string;
		fileName: string;
		manifestId: string | null;
		skippedIngredients: string[];
	} | null>(null);

	const selectedProfile = profiles.find((p) => p.id === profileId);
	const showAiDisclosure =
		creationOrigin === "created" &&
		digitalSourceTypeInvolvesAI(digitalSourceType);
	const hasParentIngredient = ingredients.some(
		(i) => i.relationship === "parentOf",
	);
	const finishedFormatSupported = finishedFile
		? Boolean(detectVerifyFormat(finishedFile.name))
		: true;
	const canProduce = Boolean(
		profileId &&
			title &&
			finishedFile &&
			finishedFormatSupported &&
			(creationOrigin === "created" || hasParentIngredient),
	);

	function toggleAction(value: string) {
		setSelectedActions((prev) =>
			prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
		);
	}

	async function verifyIngredientFile(id: string, file: File) {
		const format = detectVerifyFormat(file.name);
		if (!format) {
			setIngredients((prev) =>
				prev.map((i) =>
					i.id === id
						? { ...i, verification: unsupportedResult(file.name) }
						: i,
				),
			);
			return;
		}
		try {
			const dataBase64 = await fileToBase64(file);
			const result = await verifyManifest.mutateAsync({
				fileName: file.name,
				dataBase64,
			});
			setIngredients((prev) =>
				prev.map((i) => (i.id === id ? { ...i, verification: result } : i)),
			);
		} catch (error) {
			console.error(`Failed to verify "${file.name}"`, error);
			setIngredients((prev) =>
				prev.map((i) =>
					i.id === id
						? { ...i, verification: unsupportedResult(file.name) }
						: i,
				),
			);
		}
	}

	function addIngredients(files: FileList | File[]) {
		const room = MAX_INGREDIENTS - ingredients.length;
		if (room <= 0) return;
		const alreadyHasParent = ingredients.some(
			(i) => i.relationship === "parentOf",
		);
		const additions: IngredientFile[] = Array.from(files)
			.slice(0, room)
			.map((file, index) => ({
				id: crypto.randomUUID(),
				file,
				relationship: (creationOrigin === "opened" &&
				!alreadyHasParent &&
				index === 0
					? "parentOf"
					: "componentOf") as IngredientRelationship,
				verification: "checking" as const,
			}));
		setIngredients((prev) => [...prev, ...additions]);
		for (const addition of additions) {
			void verifyIngredientFile(addition.id, addition.file);
		}
	}

	function updateIngredientRelationship(
		id: string,
		relationship: IngredientRelationship,
	) {
		setIngredients((prev) =>
			prev.map((i) => (i.id === id ? { ...i, relationship } : i)),
		);
	}

	async function handleProduce() {
		if (!canProduce || !finishedFile) return;
		setStatus("producing");
		setProduceError(null);
		try {
			const dataBase64 = await fileToBase64(finishedFile);
			const ingredientPayloads = await Promise.all(
				ingredients.map(async (ingredient) => ({
					fileName: ingredient.file.name,
					dataBase64: await fileToBase64(ingredient.file),
					relationship: ingredient.relationship,
				})),
			);

			const result = await produceManifest.mutateAsync({
				fileName: finishedFile.name,
				dataBase64,
				profileId,
				title,
				description,
				creationOrigin,
				digitalSourceType,
				actions: selectedActions,
				aiDisclosure: showAiDisclosure
					? {
							modelType: aiModelType,
							modelName: aiModelName,
							modelIdentifier: aiModelIdentifier,
							humanOversightLevel: aiHumanOversight,
						}
					: null,
				ingredients: ingredientPayloads,
			});

			setSignedResult({
				base64: result.signedAssetBase64,
				fileName: result.fileName,
				manifestId: result.manifestId,
				skippedIngredients: result.skippedIngredients,
			});
			setStatus("produced");
		} catch (error) {
			console.error("Failed to produce Content Credential", error);
			setProduceError(
				error instanceof Error ? error.message : "Something went wrong.",
			);
			setStatus("idle");
		}
	}

	function downloadSignedAsset() {
		if (!signedResult) return;
		const binary = atob(signedResult.base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		const url = URL.createObjectURL(new Blob([bytes]));
		const a = document.createElement("a");
		a.href = url;
		a.download = signedResult.fileName;
		a.click();
		URL.revokeObjectURL(url);
	}

	function reset() {
		setProfileId("");
		setTitle("");
		setDescription("");
		setCreationOrigin("created");
		setDigitalSourceType(DIGITAL_SOURCE_TYPES[0]?.value ?? "");
		setSelectedActions([]);
		setAiModelType("");
		setAiModelName("");
		setAiModelIdentifier("");
		setAiHumanOversight(HUMAN_OVERSIGHT_LEVELS[0]?.value ?? "");
		setFinishedFile(null);
		setIngredients([]);
		setStatus("idle");
		setProduceError(null);
		setSignedResult(null);
	}

	if (isReady && profiles.length === 0) {
		return (
			<>
				<div className="dash-header">
					<div className="eyebrow">Author</div>
					<h1>You need a profile first</h1>
					<p>Create a creator profile before authoring a release.</p>
				</div>
				<Link
					className="btn btn-primary"
					href="/dashboard/profile/createProfile"
				>
					Create a profile
				</Link>
			</>
		);
	}

	if (status === "produced" && signedResult) {
		return (
			<>
				<div className="dash-header">
					<div className="eyebrow">Author</div>
					<h1>Content Credential produced</h1>
					<p>
						Signed locally with c2pa-rs-javascript-library using test
						certificates — not the production Sign-O-Tron service yet, but a
						real, verifiable C2PA manifest.
					</p>
				</div>

				<div className="ticket" style={{ maxWidth: 560 }}>
					<div className="ticket-title">Manifest</div>
					<dl>
						<dt>Title</dt>
						<dd>{title}</dd>
						<dt>Profile</dt>
						<dd>{selectedProfile?.displayName}</dd>
						<dt>Origin</dt>
						<dd>{labelFor(CREATION_ORIGINS, creationOrigin)}</dd>
						{creationOrigin === "created" && (
							<>
								<dt>Digital source type</dt>
								<dd>{labelFor(DIGITAL_SOURCE_TYPES, digitalSourceType)}</dd>
							</>
						)}
						<dt>Actions</dt>
						<dd>
							{selectedActions.length === 0
								? "None recorded"
								: selectedActions.map((a) => labelFor(ACTIONS, a)).join(", ")}
						</dd>
						<dt>Finished file</dt>
						<dd>{finishedFile?.name}</dd>
						<dt>Ingredients</dt>
						<dd>
							{ingredients.length === 0
								? "None"
								: ingredients
										.map(
											(i) =>
												`${i.file.name} (${labelFor(INGREDIENT_RELATIONSHIPS, i.relationship)}, ${verificationSummary(i.verification)})`,
										)
										.join(", ")}
						</dd>
						{signedResult.skippedIngredients.length > 0 && (
							<>
								<dt>Not included</dt>
								<dd>
									{signedResult.skippedIngredients.join(", ")} — format not
									supported for signing yet
								</dd>
							</>
						)}
						{showAiDisclosure && (
							<>
								<dt>AI model</dt>
								<dd>{aiModelName || aiModelType || "Unspecified"}</dd>
								<dt>Human oversight</dt>
								<dd>{labelFor(HUMAN_OVERSIGHT_LEVELS, aiHumanOversight)}</dd>
							</>
						)}
						<dt>Manifest ID</dt>
						<dd>{signedResult.manifestId ?? "Unavailable"}</dd>
					</dl>
				</div>

				<div
					style={{
						marginTop: "1.6rem",
						display: "flex",
						gap: "0.9rem",
						flexWrap: "wrap",
					}}
				>
					<button
						className="btn btn-primary"
						onClick={downloadSignedAsset}
						type="button"
					>
						Download signed file
					</button>
					<button className="btn btn-ghost" onClick={reset} type="button">
						Author another release
					</button>
				</div>
			</>
		);
	}

	return (
		<>
			<div className="dash-header">
				<div className="eyebrow">Author</div>
				<h1>Author a release</h1>
				<p>
					Select a profile, describe the work, and drop the media that makes up
					the release.
				</p>
			</div>

			<div className="dash-author-grid">
				<div className="dash-form">
					<div className="field">
						<label htmlFor="profile">Profile</label>
						<select
							id="profile"
							onChange={(e) => setProfileId(e.target.value)}
							value={profileId}
						>
							<option value="">Select a profile…</option>
							{profiles.map((profile) => (
								<option key={profile.id} value={profile.id}>
									{profile.displayName || "Untitled"}
								</option>
							))}
						</select>
					</div>

					<div className="field">
						<label htmlFor="title">Title</label>
						<input
							id="title"
							onChange={(e) => setTitle(e.target.value)}
							type="text"
							value={title}
						/>
					</div>

					<div className="field">
						<label htmlFor="origin">Origin</label>
						<div className="segmented" id="origin">
							{CREATION_ORIGINS.map((origin) => (
								<button
									className={creationOrigin === origin.value ? "active" : ""}
									key={origin.value}
									onClick={() => setCreationOrigin(origin.value)}
									type="button"
								>
									{origin.label}
								</button>
							))}
						</div>
						<span className="field-hint">
							{CREATION_ORIGINS.find((o) => o.value === creationOrigin)?.hint}
						</span>
					</div>

					{creationOrigin === "created" ? (
						<div className="field">
							<label htmlFor="digitalSourceType">Digital source type</label>
							<select
								id="digitalSourceType"
								onChange={(e) => setDigitalSourceType(e.target.value)}
								value={digitalSourceType}
							>
								{DIGITAL_SOURCE_TYPES.map((dst) => (
									<option key={dst.value} value={dst.value}>
										{dst.label}
									</option>
								))}
							</select>
							<span className="field-hint">
								{
									DIGITAL_SOURCE_TYPES.find(
										(d) => d.value === digitalSourceType,
									)?.hint
								}
							</span>
						</div>
					) : (
						!hasParentIngredient && (
							<p className="field-note">
								Mark one dropped ingredient as “Original” below — it becomes the
								asset this release was opened from.
							</p>
						)
					)}

					<fieldset className="field">
						<legend>Actions performed</legend>
						<div className="checkbox-grid">
							{ACTIONS.map((action) => (
								<label className="checkbox-chip" key={action.value}>
									<input
										checked={selectedActions.includes(action.value)}
										onChange={() => toggleAction(action.value)}
										type="checkbox"
									/>
									{action.label}
								</label>
							))}
						</div>
					</fieldset>

					{showAiDisclosure && (
						<fieldset className="field">
							<legend>AI disclosure</legend>
							<span className="field-hint">
								Shown because the digital source type indicates AI-generated
								content.
							</span>
							<div className="dash-form" style={{ marginTop: "0.8rem" }}>
								<div className="field">
									<label htmlFor="aiModelType">Model type</label>
									<input
										id="aiModelType"
										onChange={(e) => setAiModelType(e.target.value)}
										placeholder="e.g. text-to-audio"
										type="text"
										value={aiModelType}
									/>
								</div>
								<div className="field">
									<label htmlFor="aiModelName">Model name</label>
									<input
										id="aiModelName"
										onChange={(e) => setAiModelName(e.target.value)}
										type="text"
										value={aiModelName}
									/>
								</div>
								<div className="field">
									<label htmlFor="aiModelIdentifier">Model identifier</label>
									<input
										id="aiModelIdentifier"
										onChange={(e) => setAiModelIdentifier(e.target.value)}
										placeholder="URI or PURL"
										type="text"
										value={aiModelIdentifier}
									/>
								</div>
								<div className="field">
									<label htmlFor="aiHumanOversight">Human oversight</label>
									<select
										id="aiHumanOversight"
										onChange={(e) => setAiHumanOversight(e.target.value)}
										value={aiHumanOversight}
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
												(l) => l.value === aiHumanOversight,
											)?.hint
										}
									</span>
								</div>
							</div>
						</fieldset>
					)}

					<div className="field">
						<label htmlFor="description">Description</label>
						<textarea
							id="description"
							onChange={(e) => setDescription(e.target.value)}
							value={description}
						/>
					</div>
				</div>

				<div className="dash-drops">
					<div className="field">
						<label htmlFor="finished-input">Finished work</label>
						<button
							className={`dropzone ${finishedActive ? "active" : ""}`}
							onClick={() => finishedInputRef.current?.click()}
							onDragLeave={() => setFinishedActive(false)}
							onDragOver={(e: DragEvent) => {
								e.preventDefault();
								setFinishedActive(true);
							}}
							onDrop={(e: DragEvent) => {
								e.preventDefault();
								setFinishedActive(false);
								const file = e.dataTransfer.files[0];
								if (file) setFinishedFile(file);
							}}
							type="button"
						>
							<svg
								fill="none"
								height="28"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="1.6"
								viewBox="0 0 24 24"
								width="28"
							>
								<title>Upload</title>
								<path d="M12 16V4M7 9l5-5 5 5" />
								<path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
							</svg>
							{finishedFile ? (
								<>
									<strong>{finishedFile.name}</strong>
									<span>{formatSize(finishedFile.size)}</span>
								</>
							) : (
								<>
									<strong>Drop your finished MP3, MP4, or media file</strong>
									<span>or click to browse</span>
								</>
							)}
						</button>
						<input
							hidden
							id="finished-input"
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) setFinishedFile(file);
							}}
							ref={finishedInputRef}
							type="file"
						/>
						{finishedFile && !finishedFormatSupported && (
							<span className="field-hint" style={{ color: "var(--amber)" }}>
								This format can&apos;t be signed yet — supported: PDF, JPEG,
								PNG, SVG, DNG, JSONC, XML, MD, MP3, WAV, FLAC.
							</span>
						)}
					</div>

					<div className="field">
						<label htmlFor="ingredients-input">
							Ingredients ({ingredients.length} / {MAX_INGREDIENTS})
						</label>
						<button
							className={`dropzone ${ingredientsActive ? "active" : ""}`}
							onClick={() => ingredientsInputRef.current?.click()}
							onDragLeave={() => setIngredientsActive(false)}
							onDragOver={(e: DragEvent) => {
								e.preventDefault();
								setIngredientsActive(true);
							}}
							onDrop={(e: DragEvent) => {
								e.preventDefault();
								setIngredientsActive(false);
								addIngredients(e.dataTransfer.files);
							}}
							type="button"
						>
							<svg
								fill="none"
								height="28"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="1.6"
								viewBox="0 0 24 24"
								width="28"
							>
								<title>Upload ingredients</title>
								<path d="M12 3 2 8l10 5 10-5-10-5Z" />
								<path d="m2 13 10 5 10-5" />
							</svg>
							<strong>Drop samples, remixes, or source tracks</strong>
							<span>optional — or click to browse</span>
						</button>
						<input
							hidden
							id="ingredients-input"
							multiple
							onChange={(e) => {
								if (e.target.files) addIngredients(e.target.files);
								e.target.value = "";
							}}
							ref={ingredientsInputRef}
							type="file"
						/>

						{ingredients.length > 0 && (
							<ul className="file-list">
								{ingredients.map((ingredient) => {
									const v = ingredient.verification;
									const badgeClass =
										v === "checking"
											? "verify-badge--pending"
											: v.status === "verified"
												? "verify-badge--good"
												: v.status === "unverified"
													? "verify-badge--neutral"
													: "verify-badge--muted";
									const badgeText =
										v === "checking"
											? "Checking…"
											: v.status === "verified"
												? `Verified · ${v.name}`
												: v.status === "unverified"
													? "No manifest found"
													: "Not verifiable yet";
									return (
										<li
											className="file-chip file-chip--relate"
											key={ingredient.id}
										>
											<span>{ingredient.file.name}</span>
											<span className={`verify-badge ${badgeClass}`}>
												{badgeText}
											</span>
											<select
												aria-label={`Relationship for ${ingredient.file.name}`}
												onChange={(e) =>
													updateIngredientRelationship(
														ingredient.id,
														e.target.value as IngredientRelationship,
													)
												}
												value={ingredient.relationship}
											>
												{INGREDIENT_RELATIONSHIPS.map((rel) => (
													<option key={rel.value} value={rel.value}>
														{rel.label}
													</option>
												))}
											</select>
											<button
												aria-label={`Remove ${ingredient.file.name}`}
												onClick={() =>
													setIngredients((prev) =>
														prev.filter((i) => i.id !== ingredient.id),
													)
												}
												type="button"
											>
												&#215;
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</div>
			</div>

			{produceError && (
				<p className="form-error" style={{ marginTop: "1.6rem" }}>
					{produceError}
				</p>
			)}
			<button
				className="btn btn-primary"
				disabled={!canProduce || status === "producing"}
				onClick={handleProduce}
				style={{ marginTop: produceError ? "0.9rem" : "2rem" }}
				type="button"
			>
				{status === "producing" ? "Producing…" : "Produce Content Credential"}
			</button>
		</>
	);
}
