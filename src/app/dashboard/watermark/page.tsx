"use client";

import { DDEXManifest } from "@cognitiveproof/c2pa-react-ddex-component";
import { CAWGManifest } from "c2pa-react-cawg-component";
import { C2paManifest } from "c2pa-react-component";
import { type DragEvent, useRef, useState } from "react";
import { base64ToBytes, fileToBase64 } from "~/lib/client-file";
import { api } from "~/trpc/react";

type InspectResult = ReturnType<
	typeof api.watermark.inspect.useMutation
>["data"];

interface FileState {
	fileName: string;
	dataBase64: string;
	inspect: "checking" | NonNullable<InspectResult>;
	adding: boolean;
	added: { watermarkMessage: string; downloadUrl: string } | null;
}

export default function WatermarkPage() {
	const inspect = api.watermark.inspect.useMutation();
	const addWatermark = api.watermark.add.useMutation();
	const [file, setFile] = useState<FileState | null>(null);
	const [active, setActive] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	async function handleFile(picked: File) {
		if (file?.added) URL.revokeObjectURL(file.added.downloadUrl);
		setFile({
			fileName: picked.name,
			dataBase64: "",
			inspect: "checking",
			adding: false,
			added: null,
		});
		try {
			const dataBase64 = await fileToBase64(picked);
			const result = await inspect.mutateAsync({
				fileName: picked.name,
				dataBase64,
			});
			setFile({
				fileName: picked.name,
				dataBase64,
				inspect: result,
				adding: false,
				added: null,
			});
		} catch (error) {
			console.error(`Failed to inspect "${picked.name}"`, error);
			setFile(null);
		}
	}

	async function handleAddWatermark() {
		if (!file || file.inspect === "checking") return;
		setFile({ ...file, adding: true });
		try {
			const result = await addWatermark.mutateAsync({
				fileName: file.fileName,
				dataBase64: file.dataBase64,
			});
			const blob = new Blob([base64ToBytes(result.dataBase64)], {
				type: result.contentType,
			});
			setFile({
				...file,
				adding: false,
				added: {
					watermarkMessage: result.watermarkMessage,
					downloadUrl: URL.createObjectURL(blob),
				},
			});
		} catch (error) {
			console.error("Failed to add watermark", error);
			setFile({ ...file, adding: false });
		}
	}

	const result = file && file.inspect !== "checking" ? file.inspect : null;
	const hasOwnManifest =
		result?.displayResult.supported && result.displayResult.hasManifest;
	const watermarkDetected = result?.watermark.detected ?? false;

	return (
		<>
			<div className="dash-header">
				<div className="eyebrow">Watermark</div>
				<h1>Watermark a Content Credential</h1>
				<p>
					Drop an audio file to check it for a C2PA manifest and an existing
					audio watermark. If it has a manifest, you can embed a watermark
					carrying that manifest&apos;s ID — recoverable later even if the
					file&apos;s own C2PA metadata is stripped or altered.
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
					const dropped = e.dataTransfer.files[0];
					if (dropped) void handleFile(dropped);
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
				id="watermark-input"
				onChange={(e) => {
					const picked = e.target.files?.[0];
					if (picked) void handleFile(picked);
					e.target.value = "";
				}}
				ref={inputRef}
				type="file"
			/>

			{file && (
				<div className="dash-card" style={{ marginTop: "1.5rem" }}>
					<div className="verify-item-header">
						<span>{file.fileName}</span>
					</div>

					{file.inspect === "checking" ? (
						<p className="verify-item-status">Checking…</p>
					) : (
						<>
							{watermarkDetected && (
								<p style={{ marginTop: "0.75rem" }}>
									<span className="badge">Watermark detected</span>{" "}
									{result?.watermark.stored
										? "— manifest recovered from the database below."
										: "— but no matching record was found for this watermark."}
								</p>
							)}

							{result?.watermark.stored && (
								<C2paManifest
									level={3}
									manifest={result.watermark.stored.outcome}
									plugin={[CAWGManifest, DDEXManifest]}
								/>
							)}

							{hasOwnManifest && result?.displayResult.supported && (
								<C2paManifest
									level={3}
									manifest={result.displayResult.outcome}
									plugin={[CAWGManifest, DDEXManifest]}
								/>
							)}

							{!hasOwnManifest && !watermarkDetected && (
								<p className="field-hint" style={{ marginTop: "0.75rem" }}>
									This file has no C2PA manifest — nothing to watermark.
								</p>
							)}

							{hasOwnManifest && !watermarkDetected && !file.added && (
								<button
									className="btn btn-primary"
									disabled={file.adding}
									onClick={() => void handleAddWatermark()}
									style={{ marginTop: "1rem" }}
									type="button"
								>
									{file.adding ? "Adding watermark…" : "Add Watermark"}
								</button>
							)}

							{file.added && (
								<div
									className="dash-card-actions"
									style={{ marginTop: "1rem" }}
								>
									<p className="field-hint">
										Watermark message:{" "}
										<code>{file.added.watermarkMessage}</code>
									</p>
									<a
										className="btn btn-primary"
										download={file.fileName}
										href={file.added.downloadUrl}
									>
										Download watermarked file
									</a>
								</div>
							)}
						</>
					)}
				</div>
			)}

			{!file && (
				<div className="dash-empty" style={{ marginTop: "1.5rem" }}>
					<p>Drop a file above to get started.</p>
				</div>
			)}
		</>
	);
}
