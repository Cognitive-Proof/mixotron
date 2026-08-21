export function Provenance() {
	return (
		<section className="section-alt" id="provenance">
			<div className="wrap">
				<div className="section-head reveal">
					<div className="eyebrow">Provenance &amp; ingredients</div>
					<h2>Music has a history</h2>
					<p>
						C2PA ingredients allow one digital work to declare that another
						digital work contributed to its creation. For music, that
						relationship is especially important.
					</p>
				</div>

				<div className="chain-scroll reveal">
					<div className="chain">
						<span className="chain-node chain-node--plum">
							Original Recording
						</span>
						<span className="chain-arrow" />
						<span className="chain-node chain-node--rose">Sample</span>
						<span className="chain-arrow" />
						<span className="chain-node chain-node--amber">Remix</span>
						<span className="chain-arrow" />
						<span className="chain-node chain-node--indigo">Podcast</span>
						<span className="chain-arrow" />
						<span className="chain-node chain-node--peri">Video</span>
					</div>
				</div>
				<p
					className="reveal"
					style={{
						color: "var(--ink-soft)",
						maxWidth: "60ch",
						marginTop: "0.5rem",
					}}
				>
					Mix-O-Tron allows each new work to reference the C2PA-enabled works
					that contributed to it. Those relationships remain machine-readable
					and cryptographically verifiable — rather than reducing provenance to
					a single creator field, Mix-O-Tron can describe the lineage of a work.
				</p>

				<div className="ingredient-count reveal">
					<div>
						<div className="num">20</div>
						<div className="num-label">Ingredients per project</div>
					</div>
					<ul>
						<li>Multiple samples</li>
						<li>Multi-track remixes</li>
						<li>Mashups</li>
						<li>Podcast episodes with several songs</li>
						<li>Videos with multiple pieces of music</li>
						<li>Compound derivative works</li>
					</ul>
				</div>
			</div>
		</section>
	);
}
