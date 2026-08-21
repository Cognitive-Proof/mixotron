"use client";

import Link from "next/link";
import {
	CREATOR_ROLE_LABELS,
	TRAINING_CATEGORIES,
	TRAINING_CATEGORY_LABELS,
	VERIFIED_IDENTITY_LABELS,
} from "~/lib/profile";
import { api } from "~/trpc/react";

export default function ProfileListPage() {
	const utils = api.useUtils();
	const { data, isPending } = api.profile.list.useQuery();
	const deleteProfile = api.profile.delete.useMutation({
		onSuccess: () => utils.profile.list.invalidate(),
	});
	const profiles = data ?? [];
	const isReady = !isPending;

	return (
		<>
			<div className="dash-header dash-header--row">
				<div>
					<div className="eyebrow">Profiles</div>
					<h1>Your creator profiles</h1>
					<p>Reusable identities you can attach to any release you author.</p>
				</div>
				<Link
					className="btn btn-primary"
					href="/dashboard/profile/createProfile"
				>
					New profile
				</Link>
			</div>

			{isReady && profiles.length === 0 && (
				<div className="dash-empty">
					<p>You haven&apos;t created a profile yet.</p>
					<Link
						className="btn btn-primary"
						href="/dashboard/profile/createProfile"
					>
						Create your first profile
					</Link>
				</div>
			)}

			<div className="dash-list">
				{profiles.map((profile) => {
					const allowedTraining = TRAINING_CATEGORIES.filter(
						(category) => profile.training[category].use === "allowed",
					);
					return (
						<div className="dash-card" key={profile.id}>
							<span className="badge">
								{profile.kind === "organization" ? "Organization" : "Person"}
							</span>
							<h3>{profile.displayName || "Untitled"}</h3>
							<dl className="dash-dl">
								{profile.akaName && (
									<>
										<dt>Also known as</dt>
										<dd>{profile.akaName}</dd>
									</>
								)}
								{profile.website && (
									<>
										<dt>Website</dt>
										<dd>{profile.website}</dd>
									</>
								)}
								{profile.identifier && (
									<>
										<dt>CAWG / DID</dt>
										<dd>{profile.identifier}</dd>
									</>
								)}
								{profile.defaultRoles.length > 0 && (
									<>
										<dt>Default roles</dt>
										<dd>
											{profile.defaultRoles
												.map((role) => CREATOR_ROLE_LABELS[role])
												.join(", ")}
										</dd>
									</>
								)}
								{profile.verifiedIdentities.length > 0 && (
									<>
										<dt>Identities</dt>
										<dd>
											{profile.verifiedIdentities
												.map((entry) => VERIFIED_IDENTITY_LABELS[entry.type])
												.join(", ")}
										</dd>
									</>
								)}
								<dt>AI / data mining</dt>
								<dd>
									{allowedTraining.length === 0
										? "Nothing allowed by default"
										: allowedTraining
												.map((category) => TRAINING_CATEGORY_LABELS[category])
												.join(", ")}
								</dd>
							</dl>
							<div className="dash-card-actions">
								<Link
									className="btn btn-ghost btn-sm"
									href={`/dashboard/profile/${profile.id}/edit`}
								>
									Edit
								</Link>
								<button
									className="btn btn-danger btn-sm"
									onClick={() => {
										if (
											window.confirm(
												`Delete the profile "${profile.displayName || "Untitled"}"?`,
											)
										) {
											deleteProfile.mutate({ id: profile.id });
										}
									}}
									type="button"
								>
									Delete
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</>
	);
}
