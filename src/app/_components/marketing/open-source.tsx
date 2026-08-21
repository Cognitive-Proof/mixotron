export function OpenSource() {
	return (
		<section id="open-source">
			<div className="wrap">
				<div className="oss reveal">
					<div className="eyebrow">Open source</div>
					<h2>An open entry point to C2PA for music</h2>
					<p>
						Mix-O-Tron is designed as an open-source project for the music
						industry. Its primary goal is not to replace professional digital
						audio workstations, rights-management platforms, or label
						infrastructure — instead, it provides a practical starting point for
						organizations that want to experiment with or deploy C2PA for music
						without first building an entire provenance platform.
					</p>
					<div className="flow">
						<span className="node">Finished Track</span>
						<span className="arr">&#8594;</span>
						<span className="node">Content Credentials</span>
						<span className="arr">&#8594;</span>
						<span className="node">Published Music</span>
					</div>
					<p>
						Developers can use the project as a reference implementation, extend
						it for their own workflows, connect it to existing rights systems,
						or deploy it as the foundation for a commercial service.
					</p>
				</div>
			</div>
		</section>
	);
}
