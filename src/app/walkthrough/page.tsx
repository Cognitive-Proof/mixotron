import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "~/app/_components/marketing/site-footer";
import { SiteNav } from "~/app/_components/marketing/site-nav";

export const metadata: Metadata = {
	title: "Walkthrough — Mix-O-Tron",
	description:
		"A guided walkthrough of C2PA Content Credentials and Mix-O-Tron for rights holders, recording creators, sample providers, and music catalogue platforms.",
};

const AUDIENCES: {
	id: string;
	accent: "rose" | "amber" | "indigo" | "peri";
	title: string;
	description: string;
	href: string;
}[] = [
	{
		id: "rights-holder",
		accent: "rose",
		title: "Rights Holder",
		description: "Music label, publisher, or other recording rights owner.",
		href: "/walkthrough/rights-holder",
	},
	{
		id: "recording-creator",
		accent: "amber",
		title: "Recording Creator",
		description: "Recording artist, songwriter, or producer.",
		href: "/walkthrough/inprogress",
	},
	{
		id: "sample-provider",
		accent: "indigo",
		title: "Sample Provider",
		description: "Creator, licensor, or seller of samples and audio clips.",
		href: "/walkthrough/inprogress",
	},
	{
		id: "music-catalogue-platform",
		accent: "peri",
		title: "Music Catalogue Platform",
		description:
			"Production-music library, sample marketplace, or content aggregator.",
		href: "/walkthrough/inprogress",
	},
];

export default function WalkthroughPage() {
	return (
		<>
			<SiteNav showLinks={false} />
			<main>
				<div className="doc-hero">
					<div className="wrap">
						<Link className="doc-back" href="/">
							← Mix-O-Tron
						</Link>
						<div className="eyebrow">Walkthrough</div>
						<h1>Find Your Role in the C2PA Music Ecosystem</h1>
						<p className="doc-dek">
							Content Credentials mean different things depending on where you
							sit in a release&apos;s lifecycle. Pick the role that matches what
							you do, and we&apos;ll walk through what C2PA and Mix-O-Tron mean
							for you.
						</p>
					</div>
				</div>

				<div className="wrap">
					<div className="walkthrough-grid">
						{AUDIENCES.map((audience) => (
							<Link
								className={`walkthrough-tile walkthrough-tile--${audience.accent}`}
								href={audience.href}
								key={audience.id}
							>
								<h2>{audience.title}</h2>
								<p>{audience.description}</p>
								<span className="walkthrough-tile-cta">Explore →</span>
							</Link>
						))}
					</div>

					<div className="walkthrough-divider">
						<span>or</span>
					</div>

					<div className="walkthrough-alt">
						<Link className="btn btn-primary" href="/walkthrough/validator">
							Try the Validator
						</Link>
						<p>
							Already have a track? Skip the roles — drop it in and see exactly
							what a C2PA validator sees, no account needed.
						</p>
					</div>
				</div>
			</main>
			<SiteFooter />
		</>
	);
}
