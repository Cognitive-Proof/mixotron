"use client";

import { DDEXManifest } from "@cognitiveproof/c2pa-react-ddex-component";
import { CAWGManifest } from "c2pa-react-cawg-component";
import { C2paManifest } from "c2pa-react-component";
import Link from "next/link";
import { type DragEvent, useEffect, useRef, useState } from "react";
import { CawgTrustRegistry } from "~/app/_components/cawg-trust-registry";
import { SiteFooter } from "~/app/_components/marketing/site-footer";
import { SiteNav } from "~/app/_components/marketing/site-nav";
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
				Drop the track you want to update. This only works on a file that{" "}
				<strong>already</strong> contains C2PA information — if it doesn&apos;t
				yet,{" "}
				<Link href="/walkthrough/rights-holder/addManifest">
					add a first manifest
				</Link>{" "}
				instead.
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
						{upload.status === "clean" && (
							<p className="walkthrough-mismatch">
								No existing C2PA information found in this file — this page only
								updates a manifest that&apos;s already there.{" "}
								<Link href="/walkthrough/rights-holder/addManifest">
									Add a first manifest instead
								</Link>
								.
							</p>
						)}
						{upload.status === "hasManifest" && (
							<p className="verify-item-status">
								Found an existing C2PA manifest — ready to sign an update. The
								current manifest will be kept as this new one&apos;s parent.
							</p>
						)}
					</div>
				</div>
			)}
		</fieldset>
	);
}

export default function WalkthroughUpdateManifestPage() {
	const { data: session, isPending } = authClient.useSession();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
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
	const produceMutation = api.manifest.produceUpdateWalkthrough.useMutation();
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
	// sent here after checking a manifested track doesn't have to find and
	// drop it again. Runs once on mount — takePendingUpload() clears itself,
	// and handleFile is re-created every render, so listing it as a
	// dependency would re-run this on every keystroke instead of just once.
	// biome-ignore lint/correctness/useExhaustiveDependencies: see above.
	useEffect(() => {
		const pending = takePendingUpload();
		if (pending) {
			void handleFile(pending);
		}
	}, []);

	const canSign =
		Boolean(title.trim()) &&
		upload?.status === "hasManifest" &&
		!(cawgEnabled && !cawgProfile) &&
		!produceMutation.isPending;

	async function handleSign() {
		if (upload?.status !== "hasManifest") return;
		const dataBase64 = await fileToBase64(upload.file);
		try {
			const result = await produceMutation.mutateAsync({
				fileName: upload.file.name,
				dataBase64,
				title,
				description,
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
								<h1>Update a Manifest</h1>
								<p className="doc-dek">
									For a track that already carries a Content Credential. Signing
									here doesn&apos;t erase what&apos;s already there — it
									produces a new manifest that keeps the existing one as its
									parent, so the provenance chain records both the earlier claim
									and whatever changed since.
								</p>
							</>
						) : (
							<>
								<h1>Log In to Update a Manifest</h1>
								<p className="doc-dek">
									You&apos;ll need to log in before you can update a Content
									Credential on this track — use the Log In button in the top
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
								recommended={false}
								value={aiDisclosure}
							/>
							<CawgFields
								enabled={cawgEnabled}
								onEnabledChange={setCawgEnabled}
								onProfileChange={setCawgProfile}
								profile={cawgProfile}
							/>
							{cawgEnabled && (
								<p className="field-note">
									Because this page always signs with the previous file as a
									parentOf ingredient, the identity claim itself (cawg.identity)
									can&apos;t be embedded here — a c2pa-rs-javascript-library
									limitation shared with the ingredient path on the full Author
									page. The creator attribution and training-mining assertions
									this identity adds are still included.
								</p>
							)}
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
									<h3>Verify the updated manifest</h3>
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
