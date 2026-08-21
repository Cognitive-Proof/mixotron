"use client";

import { CAWGManifest } from "c2pa-react-cawg-component";
import { C2paManifest } from "c2pa-react-component";
import { type DragEvent, useRef, useState } from "react";
import { CawgTrustRegistry } from "~/app/_components/cawg-trust-registry";
import { fileToBase64 } from "~/lib/client-file";
import type { VerifyForDisplayResult } from "~/lib/manifest";
import { api } from "~/trpc/react";

interface VerifyItem {
	id: string;
	fileName: string;
	result: "checking" | VerifyForDisplayResult;
}

export default function VerifyPage() {
	const verifyForDisplay = api.manifest.verifyForDisplay.useMutation();
	const [items, setItems] = useState<VerifyItem[]>([]);
	const [active, setActive] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	async function verifyFile(id: string, file: File) {
		try {
			const dataBase64 = await fileToBase64(file);
			const result = await verifyForDisplay.mutateAsync({
				fileName: file.name,
				dataBase64,
			});
			setItems((prev) => prev.map((i) => (i.id === id ? { ...i, result } : i)));
		} catch (error) {
			console.error(`Failed to verify "${file.name}"`, error);
			setItems((prev) =>
				prev.map((i) =>
					i.id === id
						? {
								...i,
								result: {
									supported: false,
									fileName: file.name,
									format: file.name.split(".").pop() ?? "unknown",
								},
							}
						: i,
				),
			);
		}
	}

	function addFiles(files: FileList | File[]) {
		const additions: VerifyItem[] = Array.from(files).map((file) => ({
			id: crypto.randomUUID(),
			fileName: file.name,
			result: "checking" as const,
		}));
		setItems((prev) => [...additions, ...prev]);
		Array.from(files).forEach((file, index) => {
			const addition = additions[index];
			if (addition) void verifyFile(addition.id, file);
		});
	}

	function removeItem(id: string) {
		setItems((prev) => prev.filter((i) => i.id !== id));
	}

	return (
		<>
			<CawgTrustRegistry />
			<div className="dash-header">
				<div className="eyebrow">Verify</div>
				<h1>Verify a Content Credential</h1>
				<p>
					Drop an audio file to check it for an embedded C2PA manifest and
					inspect its full provenance chain.
				</p>
				<p className="verify-honesty-note">
					Identity and trust-registry checks shown here are Mix-O-Tron's own
					local test infrastructure, not a real identity-verification or TRQP
					service — see each credential's identity section for details.
				</p>
			</div>

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
					if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
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
				<strong>Drop MP3, WAV, or FLAC files</strong>
				<span>or click to browse — you can drop more than one</span>
			</button>
			<input
				hidden
				id="verify-input"
				multiple
				onChange={(e) => {
					if (e.target.files && e.target.files.length > 0) {
						addFiles(e.target.files);
					}
					e.target.value = "";
				}}
				ref={inputRef}
				type="file"
			/>

			<div className="verify-list">
				{items.map((item) => (
					<div className="verify-item" key={item.id}>
						<div className="verify-item-header">
							<span>{item.fileName}</span>
							<button
								aria-label={`Remove ${item.fileName}`}
								className="btn btn-ghost btn-sm"
								onClick={() => removeItem(item.id)}
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
							<C2paManifest
								level={3}
								manifest={item.result.outcome}
								plugin={[CAWGManifest]}
							/>
						)}
					</div>
				))}
			</div>

			{items.length === 0 && (
				<div className="dash-empty" style={{ marginTop: "1.5rem" }}>
					<p>Nothing verified yet. Drop a file above to get started.</p>
				</div>
			)}
		</>
	);
}
