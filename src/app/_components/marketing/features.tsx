export function Features() {
	return (
		<section id="features">
			<div className="wrap">
				<div className="section-head reveal">
					<div className="eyebrow">Features</div>
					<h2>Everything a release needs to carry its own history</h2>
					<p>
						From first upload to published work, Mix-O-Tron treats provenance as
						part of the authoring workflow — not an afterthought bolted on
						before release.
					</p>
				</div>

				<div className="feature-grid">
					<div className="f-card f-card--rose reveal">
						<svg
							className="icon"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeWidth="1.6"
							viewBox="0 0 24 24"
						>
							<title>Waveform</title>
							<path d="M2 12h2l1.5-6 3 15 3-19 3 15 2-5H22" />
						</svg>
						<h3>Author C2PA Music</h3>
						<p>
							Turn finished music and video files into C2PA-enabled releases.
							Upload a completed MP3, MP4, or other supported media file and
							Mix-O-Tron will create a C2PA manifest describing the work, its
							creator, and its provenance.
						</p>
						<p className="more">
							Original works do not need to contain existing C2PA ingredients —
							Mix-O-Tron can establish the first Content Credential in a
							work&apos;s provenance history.
						</p>
					</div>

					<div className="f-card f-card--amber reveal">
						<svg
							className="icon"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="1.6"
							viewBox="0 0 24 24"
						>
							<title>Layers</title>
							<path d="M12 3 2 8l10 5 10-5-10-5Z" />
							<path d="m2 13 10 5 10-5" />
						</svg>
						<h3>Build From Existing Music</h3>
						<p>
							Music rarely exists in isolation. Mix-O-Tron allows a new work to
							reference up to 20 existing C2PA-enabled media files as
							ingredients.
						</p>
						<ul>
							<li>Samples</li>
							<li>Remixes</li>
							<li>Mashups</li>
							<li>Podcast music</li>
							<li>Video soundtracks</li>
							<li>Collaborations</li>
							<li>Derivative works</li>
							<li>Incorporated recordings</li>
						</ul>
					</div>

					<div className="f-card f-card--indigo reveal">
						<svg
							className="icon"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="1.6"
							viewBox="0 0 24 24"
						>
							<title>Shield check</title>
							<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
							<path d="m9 12 2 2 4-4" />
						</svg>
						<h3>Verify Before You Publish</h3>
						<p>
							Before an ingredient becomes part of a new work, Mix-O-Tron can
							verify its existing Content Credentials and display:
						</p>
						<ul>
							<li>The work</li>
							<li>Artist / creator</li>
							<li>Organization</li>
							<li>Existing provenance</li>
							<li>Previous ingredients</li>
							<li>CAWG identity</li>
							<li>Trust-registry records</li>
							<li>Revocation status</li>
						</ul>
					</div>

					<div className="f-card f-card--peri reveal">
						<svg
							className="icon"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="1.6"
							viewBox="0 0 24 24"
						>
							<title>Network</title>
							<circle cx="5" cy="6" r="2.4" />
							<circle cx="19" cy="6" r="2.4" />
							<circle cx="12" cy="18" r="2.4" />
							<path d="M7.1 7.3 10 16.2M16.9 7.3 14 16.2M7.4 6h9.2" />
						</svg>
						<h3>Follow Music Across Media</h3>
						<p>
							A song may begin as an original recording, then become a sample,
							background music in a podcast, part of a remix, or a video
							soundtrack. Each new work can reference the C2PA-enabled works
							that came before it.
						</p>
						<p className="more">
							A single recording can become part of a much larger provenance
							graph without losing its connection to the original work.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
