"use client";

import {
	type TrqpAuthorizationResponse,
	TrustBadge,
} from "c2pa-react-cawg-component";
import type { Profile, TrustRegistryEnrollment } from "~/lib/profile";
import { api } from "~/trpc/react";

function truncate(value: string, keepEnd: number): string {
	return value.length > 40
		? `${value.slice(0, 24)}…${value.slice(-keepEnd)}`
		: value;
}

/** One enrollment row's live "Trust" check — a TrustBadge whose queryFn
 * proxies through profile.checkTrustRegistryEnrollment (server-side, so
 * the call to Governorator's real registry never touches CORS) instead of
 * the app-wide local mock in cawg-trust-registry.tsx. */
function EnrollmentTrustBadge({
	profileId,
	entry,
}: {
	profileId: string;
	entry: TrustRegistryEnrollment;
}) {
	const utils = api.useUtils();

	async function queryFn(): Promise<TrqpAuthorizationResponse> {
		return utils.profile.checkTrustRegistryEnrollment.fetch({
			id: profileId,
			enrollmentId: entry.id,
		});
	}

	return (
		<TrustBadge
			action={entry.action}
			entityId={entry.subjectDid}
			queryFn={queryFn}
			resource={entry.resource}
			variant="compact"
		/>
	);
}

function EnrollmentRow({
	profile,
	entry,
}: {
	profile: Profile;
	entry: TrustRegistryEnrollment;
}) {
	const utils = api.useUtils();
	const invalidate = async () => {
		await utils.profile.byId.invalidate({ id: profile.id });
		await utils.profile.list.invalidate();
	};

	const setEnabled = api.profile.setTrustRegistryEnrollmentEnabled.useMutation({
		onSuccess: invalidate,
	});
	const remove = api.profile.removeTrustRegistryEnrollment.useMutation({
		onSuccess: invalidate,
	});

	return (
		<div
			className="field"
			style={{
				marginTop: "1rem",
				paddingTop: "1rem",
				borderTop: "1px solid var(--line)",
			}}
		>
			<dl className="dash-dl">
				<dt>Authority</dt>
				<dd>
					{entry.authorityName}
					{entry.authorityId !== entry.authorityName
						? ` (${truncate(entry.authorityId, 10)})`
						: ""}
				</dd>
				{(entry.resource || entry.action) && (
					<>
						<dt>Scope</dt>
						<dd>
							{entry.action ?? "any action"} on{" "}
							{entry.resource ?? "any resource"}
						</dd>
					</>
				)}
				<dt>Signed</dt>
				<dd>{new Date(entry.signedAt).toLocaleDateString()}</dd>
			</dl>

			<div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
				<button
					className="btn btn-ghost btn-sm"
					disabled={setEnabled.isPending}
					onClick={() =>
						setEnabled.mutate({
							id: profile.id,
							enrollmentId: entry.id,
							enabled: !entry.enabled,
						})
					}
					type="button"
				>
					{entry.enabled
						? "On — used when you sign"
						: "Off — not used when you sign"}
				</button>
				<button
					className="btn btn-danger btn-sm"
					disabled={remove.isPending}
					onClick={() => {
						if (
							window.confirm(
								`Remove this connection to ${entry.authorityName}? This doesn't affect Governorator's own enrollment — only what mixotron remembers.`,
							)
						) {
							remove.mutate({ id: profile.id, enrollmentId: entry.id });
						}
					}}
					type="button"
				>
					{remove.isPending ? "Removing…" : "Remove"}
				</button>
			</div>

			<div style={{ marginTop: "0.6rem" }}>
				<EnrollmentTrustBadge entry={entry} profileId={profile.id} />
			</div>
		</div>
	);
}

export function TrustRegistryEnrollmentsCard({
	profile,
}: {
	profile: Profile;
}) {
	if (!profile.webauthnCredential) return null;

	return (
		<div className="dash-card" style={{ marginTop: "1.5rem" }}>
			<h3>Trust registry enrollments</h3>
			<p className="field-hint" style={{ marginBottom: "0.8rem" }}>
				Governorator TRQP enrollment requests you've signed on the{" "}
				<a href="/dashboard/sign">Sign</a> page and connected to this profile.
				Turning one on includes it the next time you author content with this
				profile; turning it off doesn't remove the record. The registry's own
				decision can lag or change later — use Trust to check it live.
			</p>

			{profile.trustRegistryEnrollments.length === 0 ? (
				<span className="field-hint">
					No trust registry enrollments yet — sign a Governorator enrollment
					request on the <a href="/dashboard/sign">Sign</a> page, then connect
					it here.
				</span>
			) : (
				profile.trustRegistryEnrollments.map((entry) => (
					<EnrollmentRow entry={entry} key={entry.id} profile={profile} />
				))
			)}
		</div>
	);
}
