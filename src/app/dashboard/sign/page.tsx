"use client";

import { useMemo, useState } from "react";
import {
	ProfileDidField,
	ProfileKeySelect,
	SignatureResult,
	useProfileKeySigner,
} from "~/app/dashboard/_components/profile-key-signer";
import {
	REQUEST_TYPES,
	type RecognizedRequestType,
} from "~/app/dashboard/sign/request-types";
import { fromBase64Url } from "~/lib/cawg-webauthn";
import { api } from "~/trpc/react";

interface ParsedRequest {
	segmentCount: 2 | 3;
	payload: Record<string, unknown>;
}

type ParseResult =
	| { ok: true; value: ParsedRequest }
	| { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * Generic JWT-shape decoding — no knowledge of any specific request type.
 * What kind of request this is (if any) is entirely up to REQUEST_TYPES,
 * looked up by page.tsx after this returns.
 */
function parseRequest(text: string): ParseResult | null {
	const trimmed = text.trim();
	if (!trimmed) return null;

	const parts = trimmed.split(".");
	if (parts.length !== 2 && parts.length !== 3) {
		return {
			ok: false,
			error: `Expected a JWT (2 or 3 dot-separated segments) — found ${parts.length}. Make sure you copied the entire request.`,
		};
	}
	if (!parts[0] || !parts[1]) {
		return { ok: false, error: "The header or payload segment is empty." };
	}

	let payload: unknown;
	try {
		payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[1])));
	} catch (err) {
		return {
			ok: false,
			error: `Couldn't decode the payload segment: ${
				err instanceof Error ? err.message : "invalid base64url or JSON"
			}.`,
		};
	}
	if (!isRecord(payload)) {
		return {
			ok: false,
			error: "The decoded payload isn't a JSON object.",
		};
	}

	return {
		ok: true,
		value: { segmentCount: parts.length as 2 | 3, payload },
	};
}

function declaredTypes(payload: Record<string, unknown>): string[] {
	const vc = isRecord(payload.vc) ? payload.vc : undefined;
	return Array.isArray(vc?.type)
		? vc.type.filter((t): t is string => typeof t === "string")
		: [];
}

function formatUnixSeconds(seconds: number): string {
	return new Date(seconds * 1000).toLocaleString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export default function SignPage() {
	const {
		profiles,
		profileId,
		setProfileId,
		selectedProfile,
		credential,
		signing,
		error,
		signature,
		copied,
		sign,
		reset,
		copySignature,
	} = useProfileKeySigner();

	const [text, setText] = useState("");

	const utils = api.useUtils();
	const connectToProfile = api.profile.addTrustRegistryEnrollment.useMutation({
		onSuccess: async () => {
			await utils.profile.list.invalidate();
		},
	});

	const parsed = useMemo(() => parseRequest(text), [text]);

	// Which registered type (if any) this request declares itself as, and
	// whether the segment count actually matches what that type expects.
	const { matched, matchError } = useMemo((): {
		matched: RecognizedRequestType | null;
		matchError: string | null;
	} => {
		if (!parsed?.ok) return { matched: null, matchError: null };
		const types = declaredTypes(parsed.value.payload);
		const candidate = REQUEST_TYPES.find((t) => types.includes(t.vcType));
		if (!candidate) {
			return {
				matched: null,
				matchError: `Mix-o-tron doesn't recognize this request type (declared: ${
					types.length > 0 ? types.join(", ") : "none"
				}) — it doesn't know what to do with it, so it won't sign it.`,
			};
		}
		if (parsed.value.segmentCount !== candidate.expectedSegments) {
			return {
				matched: null,
				matchError: `This declares "${candidate.label}" but has ${parsed.value.segmentCount} segments — expected ${candidate.expectedSegments}. Make sure you copied the entire request, not part of it.`,
			};
		}
		return { matched: candidate, matchError: null };
	}, [parsed]);

	const exp =
		parsed?.ok && typeof parsed.value.payload.exp === "number"
			? parsed.value.payload.exp
			: undefined;
	const expired = exp !== undefined && exp * 1000 < Date.now();

	const evaluation = useMemo(() => {
		if (!matched || !parsed?.ok || !credential) return null;
		return matched.evaluate(parsed.value.payload, {
			credential,
			didWeb: selectedProfile?.didWeb ?? null,
		});
	}, [matched, parsed, credential, selectedProfile]);

	const blockingError =
		(parsed && !parsed.ok ? parsed.error : null) ??
		matchError ??
		(expired ? "This request has expired." : null) ??
		(evaluation && !evaluation.signable ? evaluation.reason : null) ??
		null;

	const signable = Boolean(
		matched && credential && !expired && evaluation?.signable,
	);

	return (
		<>
			<div className="dash-header">
				<div className="eyebrow">Sign</div>
				<h1>Sign a request</h1>
				<p>
					Paste a request that needs one of your profile&apos;s signatures.
					Mix-o-tron recognizes a Governorator enrollment request and a DIDsmith
					key-link request — pick a profile and it&apos;s explained below once
					recognized. It never signs a request it doesn&apos;t recognize.
				</p>
			</div>

			<div className="dash-card" style={{ marginBottom: "1.5rem" }}>
				<div className="field">
					<label htmlFor="text">Request to sign</label>
					<textarea
						id="text"
						onChange={(e) => {
							setText(e.target.value);
							reset();
							connectToProfile.reset();
						}}
						placeholder="eyJhbGciOi..."
						rows={5}
						value={text}
					/>
					<span className="field-hint">
						What this decodes to is shown below, so you know exactly what
						you&apos;re signing before you sign it.
					</span>
				</div>

				{blockingError && <p className="form-error">{blockingError}</p>}

				{matched && parsed?.ok && (
					<div className="field">
						<span
							className="field-hint"
							style={{ display: "block", marginBottom: "0.4rem" }}
						>
							{matched.label}
							{exp !== undefined
								? ` — ${expired ? "expired" : "expires"} ${formatUnixSeconds(exp)}.`
								: "."}
						</span>
						{evaluation?.summary.map((line) => (
							<span
								className="field-hint"
								key={line}
								style={{ display: "block", marginBottom: "0.4rem" }}
							>
								{line}
							</span>
						))}
						<details>
							<summary
								className="field-hint"
								style={{ cursor: "pointer", display: "inline-block" }}
							>
								View decoded payload
							</summary>
							<pre
								style={{
									marginTop: "0.5rem",
									padding: "0.75rem",
									background: "var(--bg-alt)",
									borderRadius: "8px",
									fontSize: "0.8rem",
									overflowX: "auto",
								}}
							>
								{JSON.stringify(parsed.value.payload, null, 2)}
							</pre>
						</details>
					</div>
				)}

				<ProfileKeySelect
					onChange={setProfileId}
					profileId={profileId}
					profiles={profiles}
				/>
				{credential && (
					<ProfileDidField
						did={credential.issuerDid}
						didWeb={selectedProfile?.didWeb}
					/>
				)}
				{matched && !credential && (
					<span className="field-hint" style={{ display: "block" }}>
						Select a profile above to sign as before you can sign this request.
					</span>
				)}

				{error && <p className="form-error">{error}</p>}

				<button
					className="btn btn-primary"
					disabled={!signable || signing}
					onClick={() => {
						if (!matched) return;
						sign(new TextEncoder().encode(matched.textToSign(text)));
					}}
					style={{ marginTop: "0.6rem" }}
					type="button"
				>
					{signing ? "Waiting for device…" : "Sign"}
				</button>

				{signature && (
					<SignatureResult
						copied={copied}
						hint={matched?.postSignHint ?? "Copy this signature."}
						onCopy={copySignature}
						signature={signature}
					/>
				)}

				{signature && matched?.connectToProfile && parsed?.ok && profileId && (
					<div
						className="field"
						style={{
							marginTop: "1rem",
							paddingTop: "1rem",
							borderTop: "1px solid var(--line)",
						}}
					>
						{connectToProfile.isSuccess ? (
							<span className="field-hint">
								Connected — manage it from{" "}
								<a href={`/dashboard/profile/${profileId}/edit`}>
									this profile&apos;s edit page
								</a>
								.
							</span>
						) : (
							<>
								<button
									className="btn btn-ghost btn-sm"
									disabled={connectToProfile.isPending}
									onClick={() => {
										const draft = matched.connectToProfile?.buildEnrollment(
											parsed.value.payload,
										);
										if (!draft) return;
										connectToProfile.mutate({
											id: profileId,
											...draft,
											requestJwt: text.trim(),
										});
									}}
									type="button"
								>
									{connectToProfile.isPending
										? "Connecting…"
										: matched.connectToProfile.buttonLabel}
								</button>
								<span
									className="field-hint"
									style={{ display: "block", marginTop: "0.4rem" }}
								>
									Remembers which authority this is and lets you turn it on or
									off for future signing from this profile&apos;s edit page.
								</span>
								{connectToProfile.error && (
									<p className="form-error">{connectToProfile.error.message}</p>
								)}
							</>
						)}
					</div>
				)}
			</div>
		</>
	);
}
