"use client";

import { DDEXManifest } from "@cognitiveproof/c2pa-react-ddex-component";
import { CAWGManifest } from "c2pa-react-cawg-component";
import { C2paManifest } from "c2pa-react-component";
import Link from "next/link";
import { type DragEvent, useRef, useState } from "react";
import { CawgTrustRegistry } from "~/app/_components/cawg-trust-registry";
import { SiteFooter } from "~/app/_components/marketing/site-footer";
import { SiteNav } from "~/app/_components/marketing/site-nav";
import { fileToBase64 } from "~/lib/client-file";
import type { VerifyForDisplayResult } from "~/lib/manifest";
import { api } from "~/trpc/react";

interface VerifyItemState {
	fileName: string;
	result: "checking" | VerifyForDisplayResult;
}

/**
 * A standalone, no-login-required drop-and-inspect page — unlike
 * verifyTrack (which first asks what the user expects to find, then checks
 * their claim), this one skips straight to showing exactly what a C2PA
 * validator sees for whatever track someone drops: the manifest if there is
 * one, its assertions, and its provenance graph, or an honest "nothing
 * here" state if there isn't.
 */
export default function WalkthroughValidatorPage() {
	const verifyForDisplay = api.manifest.verifyPublic.useMutation();
	const [item, setItem] = useState<VerifyItemState | null>(null);
	const [active, setActive] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	async function verifyFile(file: File) {
		setItem({ fileName: file.name, result: "checking" });
		try {
			const dataBase64 = await fileToBase64(file);
			const result = await verifyForDisplay.mutateAsync({
				fileName: file.name,
				dataBase64,
			});
			setItem({ fileName: file.name, result });
		} catch (error) {
			console.error(`Failed to verify "${file.name}"`, error);
			setItem({
				fileName: file.name,
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

	return (
		<>
			<CawgTrustRegistry />
			<SiteNav showLinks={false} />
			<main>
				<div className="doc-hero">
					<div className="wrap">
						<Link className="doc-back" href="/walkthrough">
							← Walkthrough
						</Link>
						<div className="eyebrow">Validator</div>
						<h1>See What a Content Credential Looks Like</h1>
						<p className="doc-dek">
							Drop a track you made — no account needed. We check it the same
							way a distributor, platform, or listener would, and show you
							exactly what a C2PA validator sees: the manifest, its assertions,
							and its provenance graph, if it has one.
						</p>
					</div>
				</div>

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
											Can&apos;t verify this format yet — supported: MP3, WAV,
											FLAC, PDF, JPEG, PNG, SVG, DNG, JSONC, XML, MD.
										</p>
									) : (
										<C2paManifest
											level={3}
											manifest={item.result.outcome}
											plugin={[CAWGManifest, DDEXManifest]}
										/>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</main>
			<SiteFooter />
		</>
	);
}
