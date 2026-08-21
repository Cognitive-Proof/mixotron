"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "~/trpc/react";

export default function DashboardOverview() {
	const router = useRouter();
	const { data: profiles, isPending } = api.profile.list.useQuery();

	useEffect(() => {
		if (!isPending && profiles?.length === 0) {
			router.replace("/dashboard/profile/createProfile");
		}
	}, [isPending, profiles, router]);

	if (isPending || !profiles || profiles.length === 0) {
		return null;
	}

	return (
		<>
			<div className="dash-header">
				<div className="eyebrow">Overview</div>
				<h1>Welcome back</h1>
				<p>
					{profiles.length} profile{profiles.length === 1 ? "" : "s"} ready to
					author with.
				</p>
			</div>

			<div className="dash-grid">
				<Link className="dash-card dash-card--link" href="/dashboard/profile">
					<span className="dash-card-icon" style={{ color: "var(--rose)" }}>
						<svg
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="1.6"
							viewBox="0 0 24 24"
						>
							<title>Profiles</title>
							<circle cx="12" cy="8" r="3.4" />
							<path d="M5 20c1.2-3.8 4-5.6 7-5.6s5.8 1.8 7 5.6" />
						</svg>
					</span>
					<h3>Profiles</h3>
					<p>View, edit, or delete the creator profiles you author with.</p>
				</Link>

				<Link className="dash-card dash-card--link" href="/dashboard/author">
					<span className="dash-card-icon" style={{ color: "var(--indigo)" }}>
						<svg
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeWidth="1.6"
							viewBox="0 0 24 24"
						>
							<title>Author</title>
							<path d="M2 12h2l1.5-6 3 15 3-19 3 15 2-5H22" />
						</svg>
					</span>
					<h3>Author a release</h3>
					<p>Select a profile, describe the work, and produce a manifest.</p>
				</Link>
			</div>
		</>
	);
}
