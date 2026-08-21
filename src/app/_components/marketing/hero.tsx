export function Hero() {
	return (
		<section className="hero">
			<canvas id="waveform" />
			<div className="wrap">
				<div className="hero-tag">Open-source C2PA authoring for music</div>
				<h1>Content Credentials for Music</h1>
				<p className="hero-lede">
					Create music with its origins, credits, ingredients, and rights
					attached.
				</p>
				<p className="hero-body">
					Mix-O-Tron is an open-source C2PA authoring tool for the music
					industry. Create Content Credentials for original recordings, trace
					samples and remixes back to their sources, and carry licensing
					information with music as it moves into podcasts, video, and new
					works.
				</p>
				<p className="hero-note">
					Built as an accessible entry point for small record labels,
					independent artists, and music platforms adopting C2PA.
				</p>
				<div className="hero-cta">
					<a className="btn btn-primary" href="#how-it-works">
						See how it works
					</a>
					<a className="btn btn-ghost" href="#open-source">
						Read the open-source story
					</a>
				</div>
				<ul aria-label="Mix-O-Tron workflow" className="signal-chain">
					<li className="signal-chip signal-chip--rose">Author</li>
					<li aria-hidden="true" className="signal-arrow">
						&#8594;
					</li>
					<li className="signal-chip signal-chip--amber">License</li>
					<li aria-hidden="true" className="signal-arrow">
						&#8594;
					</li>
					<li className="signal-chip signal-chip--indigo">Verify</li>
					<li aria-hidden="true" className="signal-arrow">
						&#8594;
					</li>
					<li className="signal-chip signal-chip--plum">Follow the music</li>
				</ul>
			</div>
		</section>
	);
}
