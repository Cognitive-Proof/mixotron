export function SiteFooter() {
	return (
		<footer>
			<div className="wrap">
				<div className="hero-tag" style={{ marginBottom: 0 }}>
					Author. License. Verify. Follow the music.
				</div>
				<div className="foot-inner">
					<p className="foot-tag">
						Mix-O-Tron is an open-source C2PA authoring tool for the music
						industry, built alongside Sign-O-Tron and a companion trust-registry
						service.
					</p>
					<nav className="foot-links">
						<a href="#features">Features</a>
						<a href="#how-it-works">How It Works</a>
						<a href="#open-source">Open Source</a>
					</nav>
				</div>
			</div>
		</footer>
	);
}
