import { Architecture } from "~/app/_components/marketing/architecture";
import { Features } from "~/app/_components/marketing/features";
import { Hero } from "~/app/_components/marketing/hero";
import { HowItWorks } from "~/app/_components/marketing/how-it-works";
import { Licensing } from "~/app/_components/marketing/licensing";
import { OpenSource } from "~/app/_components/marketing/open-source";
import { Profiles } from "~/app/_components/marketing/profiles";
import { Provenance } from "~/app/_components/marketing/provenance";
import { SiteEffects } from "~/app/_components/marketing/site-effects";
import { SiteFooter } from "~/app/_components/marketing/site-footer";
import { SiteNav } from "~/app/_components/marketing/site-nav";
import { Trust } from "~/app/_components/marketing/trust";

export default function Home() {
	return (
		<>
			<SiteNav />
			<main id="top">
				<Hero />
				<div className="ruler" />
				<Features />
				<div className="ruler" />
				<HowItWorks />
				<div className="ruler" />
				<Licensing />
				<div className="ruler" />
				<Provenance />
				<div className="ruler" />
				<Profiles />
				<div className="ruler" />
				<Trust />
				<div className="ruler" />
				<OpenSource />
				<Architecture />
				<div className="ruler" />
				<SiteFooter />
			</main>
			<SiteEffects />
		</>
	);
}
