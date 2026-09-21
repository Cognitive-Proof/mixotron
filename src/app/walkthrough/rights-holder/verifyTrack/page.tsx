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
	isVerifyState,
	VERIFY_STATES,
	type VerifyStateConfig,
} from "~/app/walkthrough/_lib/claims";
import { setPendingUpload } from "~/app/walkthrough/rights-holder/_lib/pending-upload";
import { fileToBase64 } from "~/lib/client-file";
import type { VerifyForDisplayResult } from "~/lib/manifest";
import { api } from "~/trpc/react";

interface VerifyItemState {
	fileName: string;
	file: File;
	result: "checking" | VerifyForDisplayResult;
}

/** The #hash isn't sent to the server, so the state it selects can only be
 * read client-side, after mount — there's no server-rendered version of
 * this page for a specific claim. */
function useVerifyStateFromHash() {
	const [hash, setHash] = useState<string | null>(null);

	useEffect(() => {
		function readHash() {
			setHash(window.location.hash.replace(/^#/, ""));
		}
		readHash();
		window.addEventListener("hashchange", readHash);
		return () => window.removeEventListener("hashchange", readHash);
	}, []);

	return hash;
}

/** Owns the upload/verify flow for one claim. Given a fresh `key` by its
 * caller whenever the claim changes, so switching claims always starts
 * from a clean slate instead of carrying over the last upload. */
function VerifyTrack({ verifyState }: { verifyState: VerifyStateConfig }) {
	const verifyForDisplay = api.manifest.verifyPublic.useMutation();
	const [item, setItem] = useState<VerifyItemState | null>(null);
	const [active, setActive] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	async function verifyFile(file: File) {
		setItem({ fileName: file.name, file, result: "checking" });
		try {
			const dataBase64 = await fileToBase64(file);
			const result = await verifyForDisplay.mutateAsync({
				fileName: file.name,
				dataBase64,
			});
			setItem({ fileName: file.name, file, result });
		} catch (error) {
			console.error(`Failed to verify "${file.name}"`, error);
			setItem({
				fileName: file.name,
				file,
				result: {
					supported: false,
					fileName: file.name,
					format: file.name.split(".").pop() ?? "unknown",
				},
			});
		}
	}

	function addFiles(files: FileList | File[]) {
		const file = Array.from(files)[0];
		if (file) void verifyFile(file);
	}

	const result = item?.result;
	const mismatch =
		result !== undefined &&
		result !== "checking" &&
		result.supported &&
		verifyState.expectedHasManifest !== null &&
		result.hasManifest !== verifyState.expectedHasManifest;

	return (
		<div className="wrap">
			<div className="walkthrough-verify">
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
						if (e.dataTransfer.files.length > 0) {
							addFiles(e.dataTransfer.files);
						}
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
						if (e.target.files && e.target.files.length > 0) {
							addFiles(e.target.files);
						}
						e.target.value = "";
					}}
					ref={inputRef}
					type="file"
				/>

				{item && (
					<div className="verify-list">
						<div className="verify-item">
							<div className="verify-item-header">
								<span>{item.fileName}</span>
								<button
									aria-label={`Remove ${item.fileName}`}
									className="btn btn-ghost btn-sm"
									onClick={() => setItem(null)}
									type="button"
								>
									Remove
								</button>
							</div>

							{item.result === "checking" ? (
								<p className="verify-item-status">Verifying…</p>
							) : !item.result.supported ? (
								<p className="verify-item-status verify-item-status--muted">
									Can&apos;t verify this format yet — supported: MP3, WAV, FLAC,
									PDF, JPEG, PNG, SVG, DNG, JSONC, XML, MD.
								</p>
							) : (
								<>
									{mismatch && (
										<p className="walkthrough-mismatch">
											{verifyState.expectedHasManifest
												? "Actually, this track doesn't contain any C2PA information — no manifest was found in the file."
												: "Actually, this track does contain C2PA information — a manifest was found in the file."}
										</p>
									)}
									<C2paManifest
										level={3}
										manifest={item.result.outcome}
										plugin={[CAWGManifest, DDEXManifest]}
									/>
									{!item.result.hasManifest ? (
										<Link
											className="btn btn-primary"
											href="/walkthrough/rights-holder/addManifest"
											onClick={() => setPendingUpload(item.file)}
											style={{ marginTop: "1.2rem" }}
										>
											Add a Manifest
										</Link>
									) : (
										<Link
											className="btn btn-primary"
											href="/walkthrough/rights-holder/updateManifest"
											onClick={() => setPendingUpload(item.file)}
											style={{ marginTop: "1.2rem" }}
										>
											Update the Manifest
										</Link>
									)}
								</>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default function WalkthroughVerifyTrackPage() {
	const hash = useVerifyStateFromHash();

	if (hash === null) {
		return null;
	}

	const verifyState = isVerifyState(hash) ? VERIFY_STATES[hash] : null;

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
						<h1>
							{verifyState?.heading ?? "Pick a claim about your track first"}
						</h1>
						<p className="doc-dek">
							{verifyState?.description ?? (
								<>
									This page needs to know what you expect the track to contain —
									head back to{" "}
									<Link href="/walkthrough/rights-holder">Rights Holder</Link>{" "}
									and choose an option.
								</>
							)}
						</p>
					</div>
				</div>

				{verifyState && <VerifyTrack key={hash} verifyState={verifyState} />}
			</main>
			<SiteFooter />
		</>
	);
}
