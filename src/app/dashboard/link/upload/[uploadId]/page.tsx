"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type DragEvent, useRef, useState } from "react";
import { fileToBase64 } from "~/lib/client-file";
import { api } from "~/trpc/react";

function truncateHash(hash: string): string {
	return hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : hash;
}

export default function LinkUploadPage() {
	const params = useParams<{ uploadId: string }>();
	const uploadId = params.uploadId;
	const utils = api.useUtils();
	const { data, isPending } = api.link.getUpload.useQuery({ uploadId });
	const verifyFile = api.manifest.verify.useMutation();

	const [active, setActive] = useState(false);
	const [resolving, setResolving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	async function resolveFiles(files: FileList | File[]) {
		setResolving(true);
		try {
			for (const file of Array.from(files)) {
				const dataBase64 = await fileToBase64(file);
				await verifyFile.mutateAsync({ fileName: file.name, dataBase64 });
			}
			await utils.link.getUpload.invalidate({ uploadId });
		} finally {
			setResolving(false);
		}
	}

	if (isPending) {
		return (
			<div className="dash-header">
				<div className="eyebrow">Link</div>
				<h1>Loading…</h1>
			</div>
		);
	}

	if (!data?.ok) {
		return (
			<div className="dash-header">
				<div className="eyebrow">Link</div>
				<h1>
					{data?.reason === "forbidden"
						? "This file doesn't belong to you"
						: "Upload not found"}
				</h1>
				<p>
					{data?.reason === "forbidden"
						? "This upload was created with a different account's Link token."
						: "This upload link is invalid or has expired."}
				</p>
			</div>
		);
	}

	const { upload } = data;
	const missing = upload.ingredients.filter((i) => !i.resolved);

	return (
		<>
			<div className="dash-header">
				<div className="eyebrow">Link</div>
				<h1>{upload.name}</h1>
				<p>
					Uploaded from Audacity. Review the ingredients below, then continue
					into Author to finish the Content Credential.
				</p>
			</div>

			{upload.ingredients.length > 0 && (
				<div className="dash-card" style={{ marginBottom: "1.5rem" }}>
					<h3>Ingredients</h3>
					<dl className="dash-dl">
						{upload.ingredients.map((ingredient) => (
							<div key={ingredient.sha256}>
								<dt>{ingredient.name}</dt>
								<dd>
									{truncateHash(ingredient.sha256)} —{" "}
									{ingredient.resolved ? "Found" : "Missing"}
								</dd>
							</div>
						))}
					</dl>

					{missing.length > 0 && (
						<>
							<p className="field-hint" style={{ marginTop: "1rem" }}>
								{missing.length} ingredient{missing.length === 1 ? "" : "s"} not
								found in Mix-O-Tron yet. Upload the original files below to
								match them.
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
									if (e.dataTransfer.files.length > 0) {
										void resolveFiles(e.dataTransfer.files);
									}
								}}
								type="button"
							>
								<strong>
									{resolving ? "Matching…" : "Drop files to match ingredients"}
								</strong>
							</button>
							<input
								hidden
								multiple
								onChange={(e) => {
									if (e.target.files && e.target.files.length > 0) {
										void resolveFiles(e.target.files);
									}
									e.target.value = "";
								}}
								ref={inputRef}
								type="file"
							/>
						</>
					)}
				</div>
			)}

			<Link
				className="btn btn-primary"
				href={`/dashboard/author?linkUpload=${upload.id}`}
			>
				Continue to Author
			</Link>
		</>
	);
}
