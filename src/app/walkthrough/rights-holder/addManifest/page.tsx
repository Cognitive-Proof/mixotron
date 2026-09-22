"use client";

import { DDEXManifest } from "@cognitiveproof/c2pa-react-ddex-component";
import { CAWGManifest } from "c2pa-react-cawg-component";
import { C2paManifest } from "c2pa-react-component";
import Link from "next/link";
import { type DragEvent, useEffect, useRef, useState } from "react";
import { CawgTrustRegistry } from "~/app/_components/cawg-trust-registry";
import { SiteFooter } from "~/app/_components/marketing/site-footer";
import { SiteNav } from "~/app/_components/marketing/site-nav";
import { digitalSourceTypeInvolvesAI } from "~/app/dashboard/author/_lib/c2pa";
import { WALKTHROUGH_DIGITAL_SOURCE_TYPES } from "~/app/walkthrough/_lib/digital-source-types";
import {
	ActionsPerformedPicker,
	AiDisclosureFields,
	type AiDisclosureState,
	CawgFields,
	type DdexData,
	DdexFields,
	defaultAiDisclosure,
	defaultDdexData,
	TitleAndDescriptionFields,
} from "~/app/walkthrough/rights-holder/_components/manifest-fields";
import { takePendingUpload } from "~/app/walkthrough/rights-holder/_lib/pending-upload";
import { fileToBase64 } from "~/lib/client-file";
import type { VerifyForDisplayResult } from "~/lib/manifest";
import type { ProfileInput } from "~/lib/profile";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

type UploadStatus = "checking" | "clean" | "hasManifest" | "unsupported";

interface UploadState {
	file: File;
	status: UploadStatus;
}

function DigitalSourceTypePicker({
	selected,
	onToggle,
}: {
	selected: Set<string>;
	onToggle: (value: string) => void;
}) {
	return (
		<fieldset className="field">
			<legend className="section-legend">How was this track made?</legend>
			<div className="pick-grid">
				{WALKTHROUGH_DIGITAL_SOURCE_TYPES.map((dst) => {
					const isSelected = selected.has(dst.value);
					return (
						<label
							className={`pick-card ${isSelected ? "selected" : ""}`}
							key={dst.value}
						>
							<span className="pick-card-head">
								<input
									checked={isSelected}
									onChange={() => onToggle(dst.value)}
									type="checkbox"
								/>
								<span className="pick-card-label">{dst.label}</span>
							</span>
							<span className="pick-card-hint">{dst.hint}</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

function AudioUpload({
	upload,
	onFile,
	onRemove,
}: {
	upload: UploadState | null;
	onFile: (file: File) => void;
	onRemove: () => void;
}) {
	const [active, setActive] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	return (
		<fieldset className="field">
			<legend className="section-legend">Audio file</legend>
			<p className="field-note">
				Drop the track you want to sign. This only works on a file that
				doesn&apos;t already contain C2PA information — if it does,{" "}
				<Link href="/walkthrough/rights-holder/updateManifest">
					update its manifest
				</Link>{" "}
				instead of signing over it here.
			</p>
			<button
				className={`dropzone ${active ? "active" : ""}`}
				onClick={() => inputRef.current?.click()}
				onDragLeave={() => setActive(false)}
				onDragOver={(e: DragEvent) => {
					e.preventDefault();
					setActive(true);
				}}
				onDrop={(e: DragEvent) => {
					e.preventDefault();
					setActive(false);
					const file = e.dataTransfer.files[0];
					if (file) onFile(file);
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
				<strong>Drop an MP3, WAV, or FLAC file</strong>
				<span>or click to browse</span>
			</button>
			<input
				hidden
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) onFile(file);
					e.target.value = "";
				}}
				ref={inputRef}
				type="file"
			/>

			{upload && (
				<div className="verify-list">
					<div className="verify-item">
						<div className="verify-item-header">
							<span>{upload.file.name}</span>
							<button
								aria-label={`Remove ${upload.file.name}`}
								className="btn btn-ghost btn-sm"
								onClick={onRemove}
								type="button"
							>
								Remove
							</button>
						</div>
						{upload.status === "checking" && (
							<p className="verify-item-status">
								Checking for existing C2PA information…
							</p>
						)}
						{upload.status === "unsupported" && (
							<p className="verify-item-status verify-item-status--muted">
								Can&apos;t read this file — supported: MP3, WAV, FLAC.
							</p>
						)}
						{upload.status === "hasManifest" && (
							<p className="walkthrough-mismatch">
								This file already contains a C2PA manifest — this page only
								signs a first Content Credential onto a clean file.{" "}
								<Link href="/walkthrough/rights-holder/updateManifest">
									Update its manifest instead
								</Link>
								.
							</p>
						)}
						{upload.status === "clean" && (
							<p className="verify-item-status">
								No existing C2PA information found — ready to sign.
							</p>
						)}
					</div>
				</div>
			)}
		</fieldset>
	);
}

export default function WalkthroughAddManifestPage() {
	const { data: session, isPending } = authClient.useSession();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [selectedDigitalSourceTypes, setSelectedDigitalSourceTypes] = useState<
		Set<string>
	>(new Set());
	const [selectedActions, setSelectedActions] = useState<Set<string>>(
		new Set(),
	);
	const [aiDisclosureEnabled, setAiDisclosureEnabled] = useState(false);
	const [aiDisclosure, setAiDisclosure] =
		useState<AiDisclosureState>(defaultAiDisclosure);
	const [cawgEnabled, setCawgEnabled] = useState(false);
	const [cawgProfile, setCawgProfile] = useState<ProfileInput | null>(null);
	const [ddexEnabled, setDdexEnabled] = useState(false);
	const [ddexData, setDdexData] = useState<DdexData>(defaultDdexData);
	const [upload, setUpload] = useState<UploadState | null>(null);

	const verifyMutation = api.manifest.verifyPublic.useMutation();
	const produceMutation = api.manifest.produceWalkthrough.useMutation();
	const [signedResult, setSignedResult] = useState<{
		base64: string;
		fileName: string;
		manifestId: string | null;
		profileId: string | null;
	} | null>(null);

	// Separate mutation instance from `verifyMutation` (the pre-sign upload
	// gate) — this one re-verifies the just-signed file so its manifest can
	// be shown back to the user as proof of what actually got signed.
	const postSignVerifyMutation = api.manifest.verifyPublic.useMutation();
	const [postSignVerify, setPostSignVerify] = useState<
		"checking" | VerifyForDisplayResult | null
	>(null);

	function toggleDigitalSourceType(value: string) {
		setSelectedDigitalSourceTypes((prev) => {
			const next = new Set(prev);
			if (next.has(value)) {
				next.delete(value);
			} else {
				next.add(value);
			}
			return next;
		});
	}

	function toggleAction(value: string) {
		setSelectedActions((prev) => {
			const next = new Set(prev);
			if (next.has(value)) {
				next.delete(value);
			} else {
				next.add(value);
			}
			return next;
		});
	}

	function updateDdexData<K extends keyof DdexData>(
		key: K,
		value: DdexData[K],
	) {
		setDdexData((prev) => ({ ...prev, [key]: value }));
	}

	async function handleFile(file: File) {
		setSignedResult(null);
		setUpload({ file, status: "checking" });
		try {
			const dataBase64 = await fileToBase64(file);
			const result = await verifyMutation.mutateAsync({
				fileName: file.name,
				dataBase64,
			});
			if (!result.supported) {
				setUpload({ file, status: "unsupported" });
			} else {
				setUpload({
					file,
					status: result.hasManifest ? "hasManifest" : "clean",
				});
			}
		} catch (error) {
			console.error(
				`Failed to check "${file.name}" for C2PA information`,
				error,
			);
			setUpload({ file, status: "unsupported" });
		}
	}

	// Picks up a file handed off from the verifyTrack filter page, so a user
	// sent here after checking a clean track doesn't have to find and drop it
	// again. Runs once on mount — takePendingUpload() clears itself, and
	// handleFile is re-created every render, so listing it as a dependency
	// would re-run this on every keystroke instead of just once.
	// biome-ignore lint/correctness/useExhaustiveDependencies: see above.
	useEffect(() => {
		const pending = takePendingUpload();
		if (pending) {
			void handleFile(pending);
		}
	}, []);

	const aiDisclosureRecommended = Array.from(selectedDigitalSourceTypes).some(
		digitalSourceTypeInvolvesAI,
	);

	const canSign =
		Boolean(title.trim()) &&
		selectedDigitalSourceTypes.size > 0 &&
		upload?.status === "clean" &&
		!(cawgEnabled && !cawgProfile) &&
		!produceMutation.isPending;

	async function handleSign() {
		if (upload?.status !== "clean") return;
		const dataBase64 = await fileToBase64(upload.file);
		try {
			const result = await produceMutation.mutateAsync({
				fileName: upload.file.name,
				dataBase64,
				title,
				description,
				digitalSourceTypes: Array.from(selectedDigitalSourceTypes),
				actions: Array.from(selectedActions),
				aiDisclosure: aiDisclosureEnabled ? aiDisclosure : null,
				ddex: ddexEnabled ? ddexData : null,
				cawgProfile: cawgEnabled ? cawgProfile : null,
			});
			setSignedResult({
				base64: result.signedAssetBase64,
				fileName: result.fileName,
				manifestId: result.manifestId,
				profileId: result.profileId,
			});

			// Re-verify the freshly signed bytes so the manifest that was
			// actually written can be shown back to the user, rather than
			// just trusting the sign call's own report of what it did.
			setPostSignVerify("checking");
			try {
				const verified = await postSignVerifyMutation.mutateAsync({
					fileName: result.fileName,
					dataBase64: result.signedAssetBase64,
				});
				setPostSignVerify(verified);
			} catch (error) {
				console.error("Failed to verify the signed file", error);
				setPostSignVerify(null);
			}
		} catch (error) {
			console.error("Failed to sign", error);
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

	return (
		<>
			<CawgTrustRegistry />
			<SiteNav showLinks={false} />
			<main>
				<div className="doc-hero">
					<div className="wrap">
						<Link className="doc-back" href="/walkthrough/rights-holder">
							← Rights Holder
						</Link>
						<div className="eyebrow">Rights Holder</div>
						{isPending ? (
							<h1>Loading…</h1>
						) : session ? (
							<>
								<h1>Add a Manifest</h1>
								<p className="doc-dek">
									A manifest records the track’s origin and production history.
									Select the Digital Source Type that best describes how the
									audio was created or modified. This helps listeners,
									distributors, and verification tools understand whether the
									track was recorded, digitally created, human-edited,
									AI-generated, or assembled from multiple sources.
								</p>
							</>
						) : (
							<>
								<h1>Log In to Add a Manifest</h1>
								<p className="doc-dek">
									You&apos;ll need to log in before you can add a Content
									Credential to this track — use the Log In button in the top
									right.
								</p>
							</>
						)}
					</div>
				</div>

				{session && (
					<div className="wrap">
						<div className="walkthrough-verify">
							<AudioUpload
								onFile={handleFile}
								onRemove={() => {
									setUpload(null);
									setSignedResult(null);
								}}
								upload={upload}
							/>
							<TitleAndDescriptionFields
								description={description}
								onDescriptionChange={setDescription}
								onTitleChange={setTitle}
								title={title}
							/>
							<DigitalSourceTypePicker
								onToggle={toggleDigitalSourceType}
								selected={selectedDigitalSourceTypes}
							/>
							<ActionsPerformedPicker
								onToggle={toggleAction}
								selected={selectedActions}
							/>
							<AiDisclosureFields
								enabled={aiDisclosureEnabled}
								onChange={(patch) =>
									setAiDisclosure((prev) => ({ ...prev, ...patch }))
								}
								onEnabledChange={setAiDisclosureEnabled}
								recommended={aiDisclosureRecommended}
								value={aiDisclosure}
							/>
							<CawgFields
								enabled={cawgEnabled}
								onEnabledChange={setCawgEnabled}
								onProfileChange={setCawgProfile}
								profile={cawgProfile}
							/>
							<DdexFields
								data={ddexData}
								enabled={ddexEnabled}
								onChange={updateDdexData}
								onEnabledChange={setDdexEnabled}
							/>

							{produceMutation.error && (
								<p className="walkthrough-mismatch">
									{produceMutation.error.message}
								</p>
							)}

							{signedResult && (
								<div className="field-note">
									<p>
										Signed. Manifest ID:{" "}
										{signedResult.manifestId ?? "Unavailable"}
									</p>
									{signedResult.profileId && (
										<p>
											A new server-managed profile was created for this identity
											— see it under{" "}
											<Link href="/dashboard/profile">Profiles</Link>.
										</p>
									)}
									<button
										className="btn btn-primary"
										onClick={downloadSignedAsset}
										style={{ marginTop: "0.8rem" }}
										type="button"
									>
										Download signed file
									</button>
								</div>
							)}

							{signedResult && (
								<div className="toggle-fields">
									<h3>Verify the signed manifest</h3>
									{postSignVerify === "checking" ? (
										<p className="verify-item-status">
											Verifying the signed file…
										</p>
									) : postSignVerify?.supported ? (
										<div className="verify-list">
											<div className="verify-item">
												<C2paManifest
													level={3}
													manifest={postSignVerify.outcome}
													plugin={[CAWGManifest, DDEXManifest]}
												/>
											</div>
										</div>
									) : (
										<p className="verify-item-status verify-item-status--muted">
											Couldn&apos;t verify the signed file.
										</p>
									)}
								</div>
							)}

							{!signedResult && (
								<button
									className="btn btn-primary"
									disabled={!canSign}
									onClick={handleSign}
									type="button"
								>
									{produceMutation.isPending ? "Signing…" : "Sign & download"}
								</button>
							)}
						</div>
					</div>
				)}
			</main>
			<SiteFooter />
		</>
	);
}
