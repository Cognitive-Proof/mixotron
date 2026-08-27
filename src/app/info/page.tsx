import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "~/app/_components/marketing/site-footer";
import { SiteNav } from "~/app/_components/marketing/site-nav";
import { ManifestPreview } from "~/app/info/_components/manifest-preview";

export const metadata: Metadata = {
	title: "Music Guidance — Mix-O-Tron",
	description:
		"Guidance on applying C2PA Content Credentials to music assets: AI disclosure, actions and digitalSourceType, ingredients, identity, and example authoring workflows.",
};

const TOC: {
	id: string;
	label: string;
	num: string;
	children?: { id: string; label: string; num: string }[];
}[] = [
	{
		id: "introduction",
		label: "Introduction",
		num: "1",
		children: [
			{
				id: "music-transparency",
				label: "The Provenance Challenge",
				num: "1.1",
			},
			{ id: "content-credentials", label: "Content Credentials", num: "1.2" },
			{ id: "who-this-is-for", label: "Who This Is For", num: "1.3" },
		],
	},
	{
		id: "core-concepts",
		label: "Core Concepts",
		num: "2",
		children: [
			{ id: "actions", label: "Actions & digitalSourceType", num: "2.1" },
			{ id: "ingredients", label: "Ingredients", num: "2.2" },
			{ id: "ai-disclosure", label: "AI Disclosure Assertion", num: "2.3" },
			{ id: "region-of-interest", label: "Region of Interest", num: "2.4" },
			{ id: "manifests", label: "Manifests", num: "2.5" },
		],
	},
	{
		id: "example-workflow",
		label: "Example Workflow",
		num: "3",
		children: [
			{
				id: "scenario-1",
				label: "Scenario 1: AI Instrumental + Vocal",
				num: "3.1",
			},
			{ id: "scenario-2", label: "Scenario 2: Licensed Remix", num: "3.2" },
		],
	},
	{
		id: "annexes",
		label: "Annexes",
		num: "4",
		children: [
			{ id: "ddex", label: "DDEX & Metadata Alignment", num: "4.1" },
			{ id: "soft-binding", label: "Persistence & Soft Binding", num: "4.2" },
			{ id: "watermarking", label: "Audio Watermarking", num: "4.3" },
		],
	},
];

function Section({
	id,
	num,
	title,
	children,
}: {
	id: string;
	num: string;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="doc-section" id={id}>
			<h2>
				<span className="doc-num">{num}</span>
				{title}
			</h2>
			{children}
		</div>
	);
}

function Sub({
	id,
	num,
	title,
	children,
}: {
	id: string;
	num: string;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="doc-subsection" id={id}>
			<h3>
				<span className="doc-num">{num}</span>
				{title}
			</h3>
			{children}
		</div>
	);
}

function SubHeading({ children }: { children: React.ReactNode }) {
	return <h4 className="doc-subheading">{children}</h4>;
}

function Note({ children }: { children: React.ReactNode }) {
	return (
		<div className="doc-note">
			<span className="doc-note-label">Note</span>
			{children}
		</div>
	);
}

function CodeBlock({ children }: { children: string }) {
	return (
		<div className="doc-code">
			<div className="doc-code-label">JSON</div>
			<pre>
				<code>{children}</code>
			</pre>
		</div>
	);
}

export default function InfoPage() {
	return (
		<>
			<SiteNav showLinks={false} />
			<main>
				<div className="doc-hero">
					<div className="wrap">
						<Link className="doc-back" href="/">
							← Mix-O-Tron
						</Link>
						<div className="eyebrow">Guidance</div>
						<h1>Applying Content Credentials to Music Assets</h1>
						<p className="doc-dek">
							How C2PA Content Credentials can be applied to music assets to
							support transparent provenance across creation, production,
							delivery, and distribution workflows.
						</p>
						<div className="doc-meta">
							<span>Draft · v0.1</span>
							<span>No account required</span>
						</div>
					</div>
				</div>

				<div className="wrap">
					<div className="doc-layout">
						<nav aria-label="Table of contents" className="doc-toc">
							<div className="doc-toc-title">On this page</div>
							<ol>
								{TOC.map((entry) => (
									<li key={entry.id}>
										<ol>
											<li className="doc-toc-l1">
												<a href={`#${entry.id}`}>
													{entry.num}. {entry.label}
												</a>
											</li>
											{entry.children?.map((child) => (
												<li className="doc-toc-l2" key={child.id}>
													<a href={`#${child.id}`}>
														{child.num} {child.label}
													</a>
												</li>
											))}
										</ol>
									</li>
								))}
							</ol>
						</nav>

						<article className="doc-content">
							<Section id="introduction" num="1" title="Introduction">
								<Sub
									id="music-transparency"
									num="1.1"
									title="Music Transparency and Provenance Challenge"
								>
									<p className="doc-lead">
										This guidance explains how Content Credentials can be
										applied to music assets to support transparent provenance
										across creation, production, delivery, and distribution
										workflows.
									</p>
									<p>
										The guidance focuses on three core music use case families:
									</p>
									<dl className="doc-deflist">
										<div>
											<dt>AI disclosure and labeling</dt>
											<dd>
												Enabling verifiable statements about whether and how AI
												was used in the creation or production of music. This
												helps ensure information about AI use is available to
												downstream stakeholders, including platforms,
												rightsholders, creators, and consumers, to inform AI
												disclosure and content labeling decisions.
											</dd>
										</div>
										<div>
											<dt>Copyrightability and Chart Eligibility</dt>
											<dd>
												Documenting how music was created, including whether it
												was created by human creators, generated by AI systems,
												or produced through a combination of both. This
												information may support downstream activities involved
												in evaluating copyrightability and chart eligibility.
											</dd>
										</div>
										<div>
											<dt>Credits</dt>
											<dd>
												Maintaining information about creator identities,
												ingredient origins, and production history throughout
												the lifecycle of music. This helps ensure creators are
												properly credited for their contributions through a
												verifiable provenance record of the actions applied to
												the content.
											</dd>
										</div>
									</dl>
									<p>
										These use cases reflect common scenarios where provenance
										information will help describe how a music asset was
										created, modified, reviewed, or prepared for release. For
										additional guidance on applying AI disclosure with Content
										Credentials, see the C2PA AI Labelling Guidance.
									</p>
									<p>
										Content Credentials and the associated manifest do not make
										judgments about artistic merit, copyright status, ownership,
										chart eligibility, licensing, or the extent of AI use.
										Rather, they provide a clear, verifiable provenance record
										of how the music was created and modified.
									</p>
								</Sub>

								<Sub
									id="content-credentials"
									num="1.2"
									title="Content Credentials"
								>
									<p>
										Content Credentials provide a way to associate signed
										provenance information with a digital asset. In the C2PA
										model, a{" "}
										<a
											href="https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#claim-generator-definition"
											rel="noreferrer"
											target="_blank"
										>
											claim generator
										</a>{" "}
										creates a C2PA Manifest containing assertions about the
										asset, such as actions, ingredients, software information,
										timestamps, and signatures. In a music workflow, a claim
										generator could be a DAW (Digital Audio Workstation),
										plug-in, AI music tool, mastering system, distributor
										service, or other software component that creates or updates
										provenance information as the asset moves through production
										and delivery.
									</p>
									<p>
										A{" "}
										<a
											href="https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#_validator"
											rel="noreferrer"
											target="_blank"
										>
											validator
										</a>{" "}
										is a tool or service that reads the manifest and checks
										whether the signed information is well formed, has not been
										tampered with, and was signed using a trusted credential.
										For example, a label might use a verifier to review a
										submitted audio asset before accepting it into a release
										workflow.
									</p>
									<p>
										This means Content Credentials are primarily an
										interoperability layer between tools and services.
										Provenance data can be generated, signed, preserved, read,
										and validated by systems across the music workflow. Data
										interoperability between C2PA and specifications like CAWG
										and DDEX allows publishers and platforms to incorporate this
										information into rights clearing, payments, and other
										critical operational systems. Selected information may be
										surfaced by user-facing services according to their own
										display, policy, privacy, and user-experience choices.
									</p>
									<p>
										Content Credentials rely on a binding between the C2PA
										Manifest and an asset. For audio assets, this binding can be
										implemented through direct embedding or external manifest
										reference (sidecar). When direct embedding is used,
										implementers should use the container mechanism appropriate
										to the audio format. For example, ID3v2-compatible
										compressed audio files, such as MP3, can use an ID3 General
										Encapsulated Object (GEOB) frame to carry the C2PA manifest
										payload. For additional format-specific details,
										implementers should refer to the{" "}
										<a
											href="https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#embedding_annex"
											rel="noreferrer"
											target="_blank"
										>
											C2PA Specification embedding annex
										</a>
										.
									</p>
									<p>
										The claim generator signs the{" "}
										<a
											href="https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#_technical_overview"
											rel="noreferrer"
											target="_blank"
										>
											manifest
										</a>{" "}
										using a signing credential, typically an{" "}
										<a
											href="https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#x509_certificates"
											rel="noreferrer"
											target="_blank"
										>
											X.509 certificate
										</a>{" "}
										associated with the organization, service, or software
										component operating the claim generator. A validator can
										then check the manifest structure, the claim signature, the
										asset binding, and whether the signing certificate chains to
										a trust anchor on the trust list.
									</p>
									<p>
										This{" "}
										<a
											href="https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#_trust_model"
											rel="noreferrer"
											target="_blank"
										>
											trust model
										</a>{" "}
										does not prove that every assertion is complete, accurate,
										licensed, or legally sufficient. It provides tamper-evident
										provenance that downstream systems can verify and interpret
										according to their own trust, policy, display, and business
										rules.
									</p>
								</Sub>

								<Sub
									id="who-this-is-for"
									num="1.3"
									title="Who This Guidance Is For"
								>
									<p>
										This guidance is intended for participants across the music
										ecosystem who create, process, distribute, receive, display,
										or verify music assets and related provenance information.
									</p>
									<p>
										This includes DAWs, plug-in developers, instrument makers,
										AI music tools, mastering services, labels, distributors,
										DSPs, metadata providers, and other services involved in the
										lifecycle of a music asset.
									</p>
									<p>
										The goal is to support interoperability across this chain.
										Content Credentials can help carry provenance information
										from creation and production through delivery and
										distribution, while allowing implementations to decide what
										information is recorded, preserved, displayed, or withheld
										according to policy, privacy, business, and user-experience
										needs.
									</p>
									<p>
										This guidance should be understood as a first-phase approach
										focused on manifesting music assets at the track, stem, and
										major-component level. It does not attempt to describe every
										subcomponent within a stem, such as individual notes,
										automation data, or micro-level production decisions. Future
										guidance may address more granular provenance patterns as
										music workflows, tooling, and implementation practices
										mature.
									</p>
									<p>
										Where an implementer wants to assert the identity of a
										person, company, label, distributor, creator, or other
										actor, this guidance recommends using CAWG identity
										assertions:{" "}
										<a
											href="https://cawg.io/identity/1.2/"
											rel="noreferrer"
											target="_blank"
										>
											CAWG Specifications
										</a>
										.
									</p>
									<p>
										This guidance is intended to complement existing
										music-industry metadata and delivery standards, including{" "}
										<a
											href="https://ddex.net/"
											rel="noreferrer"
											target="_blank"
										>
											DDEX-based
										</a>{" "}
										workflows. It does not replace rights databases, contracts,
										licensing records, copyright analysis, royalty systems, or
										platform policy decisions.
									</p>
								</Sub>
							</Section>

							<Section
								id="core-concepts"
								num="2"
								title="Core Concepts for Music Assets"
							>
								<Sub
									id="actions"
									num="2.1"
									title="Actions and digitalSourceType"
								>
									<p>
										<a
											href="https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#_actions"
											rel="noreferrer"
											target="_blank"
										>
											C2PA actions
										</a>{" "}
										describe events or operations that happened to an{" "}
										<a
											href="https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#_asset"
											rel="noreferrer"
											target="_blank"
										>
											asset
										</a>
										, such as creation, editing, enhancement, mixing, mastering,
										transcoding, etc.
									</p>
									<p>
										The actions <code>c2pa.created</code> and{" "}
										<code>c2pa.opened</code> are fundamental to understanding
										how the C2PA specification applies to audio files.{" "}
										<code>c2pa.created</code> indicates that an asset was
										created, while <code>c2pa.opened</code> indicates that an
										existing asset was opened for further processing. These two
										actions are not interchangeable. For example, if a user
										opens an existing track in a DAW and then exports it as a
										new file, the export action should be recorded as{" "}
										<code>c2pa.created</code>, while the opening of the original
										track should be recorded as <code>c2pa.opened</code>.
									</p>
									<p>
										In the context of C2PA, the term &ldquo;created&rdquo;
										simply means an asset came into existence, regardless of
										whether it was created by a human, AI-generated, or created
										with AI assistance. While creation is traditionally a human
										endeavor, the standard uses the term to also describe
										computer-generated files and AI-assisted workflows.
									</p>
									<p>
										The <code>digitalSourceType</code> of an action represents a
										controlled vocabulary used to describe how that action was
										performed. For example, it can indicate whether the action
										involved digital capture, human editing, non-AI algorithmic
										enhancement, trained algorithmic media (AI generated), or a
										composite process.
									</p>
									<p>
										In a C2PA actions assertion, <code>digitalSourceType</code>{" "}
										is recorded on an individual action. It should therefore be
										interpreted together with the action it is attached to, not
										as a standalone classification for the entire asset.
									</p>
									<p>
										The broader production history should be expressed through
										the sequence of actions, ingredients, software or tool
										information, timestamps, and other relevant assertions.
									</p>
									<Note>
										This guidance uses existing{" "}
										<a
											href="https://cv.iptc.org/newscodes/digitalsourcetype/"
											rel="noreferrer"
											target="_blank"
										>
											IPTC Digital Source Type
										</a>{" "}
										values and existing C2PA action values.
									</Note>

									<div className="doc-table-wrap">
										<table className="doc-table">
											<thead>
												<tr>
													<th>C2PA Action</th>
													<th>Possible Digital Source Type</th>
													<th>Music / Audio Examples</th>
												</tr>
											</thead>
											<tbody>
												<tr>
													<td>
														<code>c2pa.created</code>
													</td>
													<td>
														<code>digitalCapture</code>,{" "}
														<code>digitalCreation</code>,{" "}
														<code>trainedAlgorithmicMedia</code>, or{" "}
														<code>computationalCapture</code>
													</td>
													<td>
														Recording a vocal, creating a synth part, generating
														an AI stem, or computationally capturing audio.
													</td>
												</tr>
												<tr>
													<td>
														<code>c2pa.opened</code>
													</td>
													<td>
														Usually determined by the parent ingredient and
														subsequent action
													</td>
													<td>
														Opening an existing track, stem, master, or
														recording as the starting point for a new manifest.
													</td>
												</tr>
												<tr>
													<td>
														<code>c2pa.edited</code>
													</td>
													<td>
														<code>humanEdits</code> or{" "}
														<code>compositeWithTrainedAlgorithmicMedia</code>
													</td>
													<td>
														Human editing, comping, timing edits, or edits
														involving trained algorithmic media.
													</td>
												</tr>
												<tr>
													<td>
														<code>c2pa.placed</code>
													</td>
													<td>
														<code>digitalCapture</code>,{" "}
														<code>compositeSynthetic</code>, or{" "}
														<code>trainedAlgorithmicMedia</code>
													</td>
													<td>Placing a sample or loop into a mix.</td>
												</tr>
												<tr>
													<td>
														<code>c2pa.enhanced</code>
													</td>
													<td>
														<code>algorithmicallyEnhanced</code> or{" "}
														<code>compositeWithTrainedAlgorithmicMedia</code>
													</td>
													<td>
														Non-AI cleanup, restoration, leveling, or AI-based
														voice cleaning and enhancement.
													</td>
												</tr>
												<tr>
													<td>
														<code>c2pa.mixed</code>
													</td>
													<td>
														<code>humanEdits</code> or{" "}
														<code>compositeSynthetic</code>
													</td>
													<td>
														Mixing stems manually, or combining human/captured
														material with AI-generated material.
													</td>
												</tr>
												<tr>
													<td>
														<code>c2pa.mastered</code>
													</td>
													<td>
														<code>humanEdits</code> or{" "}
														<code>algorithmicallyEnhanced</code>
													</td>
													<td>
														Human mastering or non-AI algorithmic mastering.
													</td>
												</tr>
												<tr>
													<td>
														<code>c2pa.transcoded</code>
													</td>
													<td>Usually no new digitalSourceType</td>
													<td>
														Format conversion, such as WAV to MP3, where the
														audio content is not editorially changed.
													</td>
												</tr>
											</tbody>
										</table>
									</div>

									<p>
										When a <code>c2pa.created</code> action is used to identify
										media created using a generative AI model, a
										digitalSourceType of <code>trainedAlgorithmicMedia</code> is
										appropriate. Other types of actions that involve algorithmic
										or machine-learning-based enhancement that do not
										generatively alter the main content may instead be described
										as <code>algorithmicallyEnhanced</code>. When an action
										combines multiple discrete elements, such as{" "}
										<code>c2pa.placed</code>, and you need to indicate that at
										least one element was created using trained algorithmic
										media, <code>compositeSynthetic</code> may be appropriate,
										though the use of the <code>digitalSourceType</code> field
										on the placed ingredient is also useful in this case.
									</p>
									<p>
										When an action uses a generative AI model to augment,
										correct, or enhance existing media, such as inpainting,
										outpainting, or replacing a segment of a recording,{" "}
										<code>compositeWithTrainedAlgorithmicMedia</code> is
										appropriate. When an action uses non-AI algorithmic
										processing, <code>algorithmicallyEnhanced</code> shall be
										appropriate and should not be used for generative AI
										processing. For further detail, see the AI labelling
										guidance document.
									</p>

									<SubHeading>Example: AI-Based Voice Cleaning</SubHeading>
									<p>
										The following simplified example shows how an actions
										assertion could describe an existing vocal recording that
										was enhanced using an AI-based voice cleaning tool.
									</p>
									<ManifestPreview
										activeId="urn:c2pa:example-voice-cleaning"
										manifests={[
											{
												id: "urn:c2pa:example-voice-cleaning",
												title: "LeadVocal_Cleaned.wav",
												claimGenerator: "AI Voice Cleaning Tool",
												assertions: {
													"c2pa.actions.v2": {
														actions: [
															{
																action: "c2pa.opened",
																when: "2026-04-23T09:14:00-07:00",
																description:
																	"Opened existing vocal recording for editing.",
															},
															{
																action: "c2pa.enhanced",
																when: "2026-04-23T09:15:00-07:00",
																description:
																	"Applied AI-based voice cleaning and noise reduction.",
																digitalSourceType:
																	"http://cv.iptc.org/newscodes/digitalsourcetype/algorithmicallyEnhanced",
																softwareAgent: "AI Voice Cleaning Tool",
															},
														],
													},
												},
											},
										]}
									/>
									<CodeBlock>{`{
  "assertions": {
    "c2pa.actions.v2": {
      "actions": [
        {
          "action": "c2pa.opened",
          "when": "2026-04-23T09:14:00-07:00",
          "description": "Opened existing vocal recording for editing."
        },
        {
          "action": "c2pa.enhanced",
          "when": "2026-04-23T09:15:00-07:00",
          "description": "Applied AI-based voice cleaning and noise reduction.",
          "digitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/algorithmicallyEnhanced ",
          "softwareAgent": "AI Voice Cleaning Tool"
        }
      ]
    }
  }
}`}</CodeBlock>
									<p>
										In this example, <code>digitalSourceType</code> is attached
										to the <code>c2pa.enhanced</code> action and describes how
										that enhancement action was performed. The original vocal
										recording should be represented as an ingredient where
										possible.
									</p>

									<SubHeading>Example: AI-Based Voice Cloning</SubHeading>
									<p>
										The following simplified example shows how an actions
										assertion could describe a vocal created using an AI-based
										voice cloning tool.
									</p>
									<ManifestPreview
										activeId="urn:c2pa:example-voice-cloning"
										manifests={[
											{
												id: "urn:c2pa:example-voice-cloning",
												title: "Vocal_AI_Cloned.wav",
												claimGenerator: "AI Voice Cloning Tool",
												assertions: {
													"c2pa.actions.v2": {
														actions: [
															{
																action: "c2pa.created",
																when: "2026-04-23T09:15:00-07:00",
																description: "Applied AI-based voice cloning.",
																digitalSourceType:
																	"http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
																softwareAgent: "AI Voice Cloning Tool",
															},
														],
													},
												},
											},
										]}
									/>
									<CodeBlock>{`{
  "assertions": {
    "c2pa.actions.v2": {
      "actions": [
        {
          "action": "c2pa.created",
          "when": "2026-04-23T09:15:00-07:00",
          "description": "Applied AI-based voice cloning.",
          "digitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
          "softwareAgent": "AI Voice Cloning Tool"
        }
      ]
    }
  }
}`}</CodeBlock>
									<p>
										In this example, <code>digitalSourceType</code> is attached
										to the <code>c2pa.created</code> action and describes how
										that created action was performed. The original vocal
										recording should be represented as an ingredient where
										possible.
									</p>
								</Sub>

								<Sub id="ingredients" num="2.2" title="Ingredients">
									<p>
										An{" "}
										<a
											href="https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#ingredient_assertion"
											rel="noreferrer"
											target="_blank"
										>
											ingredient
										</a>{" "}
										is a source asset used to create or modify another asset. In
										music, this may include a vocal recording, stem, take,
										sample, loop, AI-generated layer, previous mix, master, or
										audio extracted from video.
									</p>
									<p>
										Ingredients are useful when a final music asset combines
										multiple sources. For example, if a human vocal is mixed
										with an AI-generated instrumental, both should be
										represented as ingredients.
									</p>
									<p>
										Actions describe what happened, digitalSourceType describes
										how a specific action was performed, and ingredients
										describe what source assets were used.
									</p>

									<SubHeading>
										Example: Final Mix with Stem Ingredients
									</SubHeading>
									<p>
										The following simplified example shows how a final mix could
										reference multiple stem ingredients.
									</p>
									<ManifestPreview
										activeId="urn:c2pa:example-final-mix-ingredients"
										manifests={[
											{
												id: "urn:c2pa:example-final-mix-ingredients",
												title: "FinalMix.wav",
												claimGenerator: "DAW",
												assertions: {
													"c2pa.ingredient.v3": {
														data: {
															alg: "sha256",
															hash: "76d9aff0167492306864be6d30cb16f71e4c0be650f408889c3d5c90e7f39acb",
															url: "https://fabrikam.com/session/LeadVocal_Stem.wav",
														},
														"dc:format": "audio/wav",
														"dc:title": "LeadVocal_Stem",
														instanceID:
															"urn:c2pa:4ec28767-3353-4a62-80ce-c56548e3ce9c",
														relationship: "componentOf",
													},
													"c2pa.ingredient.v3__1": {
														data: {
															alg: "sha256",
															hash: "f94de83ad6a029a13a71ad12fdebea16fe7bc089814588949e5e7f75091b5e06",
															url: "https://fabrikam.com/session/Drums_Stem.wav",
														},
														"dc:format": "audio/wav",
														"dc:title": "Drums_Stem",
														instanceID:
															"urn:c2pa:52938c01-ab45-4a3a-97f0-71cbc60f6b98",
														relationship: "componentOf",
													},
													"c2pa.ingredient.v3__2": {
														data: {
															alg: "sha256",
															hash: "4ece6641679d841d2f0c702e93c6c8285e43eebfd0d47958e0feee0f7f674847",
															url: "https://fabrikam.com/session/AI_Pad_Stem.wav",
														},
														"dc:format": "audio/wav",
														"dc:title": "AI_Pad_Stem",
														instanceID:
															"urn:c2pa:25a70ca9-66a8-4a42-8537-ee8dee7a6d16",
														relationship: "componentOf",
													},
												},
												ingredients: [
													{
														title: "LeadVocal_Stem",
														format: "audio/wav",
														relationship: "componentOf",
													},
													{
														title: "Drums_Stem",
														format: "audio/wav",
														relationship: "componentOf",
													},
													{
														title: "AI_Pad_Stem",
														format: "audio/wav",
														relationship: "componentOf",
													},
												],
											},
										]}
									/>
									<CodeBlock>{`{
  "assertions": {
    "c2pa.ingredient.v3": {
      "data": {
        "alg": "sha256",
        "hash": "76d9aff0167492306864be6d30cb16f71e4c0be650f408889c3d5c90e7f39acb",
        "url": "https://fabrikam.com/session/LeadVocal_Stem.wav"
      },
      "dc:format": "audio/wav",
      "dc:title": "LeadVocal_Stem",
      "instanceID": "urn:c2pa:4ec28767-3353-4a62-80ce-c56548e3ce9c",
      "relationship": "componentOf"
    },
    "c2pa.ingredient.v3__1": {
      "data": {
        "alg": "sha256",
        "hash": "f94de83ad6a029a13a71ad12fdebea16fe7bc089814588949e5e7f75091b5e06",
        "url": "https://fabrikam.com/session/Drums_Stem.wav"
      },
      "dc:format": "audio/wav",
      "dc:title": "Drums_Stem",
      "instanceID": "urn:c2pa:52938c01-ab45-4a3a-97f0-71cbc60f6b98",
      "relationship": "componentOf"
    },
    "c2pa.ingredient.v3__2": {
      "data": {
        "alg": "sha256",
        "hash": "4ece6641679d841d2f0c702e93c6c8285e43eebfd0d47958e0feee0f7f674847",
        "url": "https://fabrikam.com/session/AI_Pad_Stem.wav"
      },
      "dc:format": "audio/wav",
      "dc:title": "AI_Pad_Stem",
      "instanceID": "urn:c2pa:25a70ca9-66a8-4a42-8537-ee8dee7a6d16",
      "relationship": "componentOf"
    }
  }
}`}</CodeBlock>
									<p>
										In this example, the final mix has three ingredients: a lead
										vocal stem, a drum stem, and an AI-generated pad stem. Each
										ingredient can be referenced, hashed, and described
										separately.
									</p>
								</Sub>

								<Sub
									id="ai-disclosure"
									num="2.3"
									title="AI Disclosure Assertion"
								>
									<p>
										The 2.4 revision of the C2PA Specification introduces the{" "}
										<a
											href="https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#_ai_disclosure_assertion"
											rel="noreferrer"
											target="_blank"
										>
											<code>c2pa.ai-disclosure</code>
										</a>{" "}
										assertion. It provides for a structured, machine-readable
										way to disclose information about AI involvement in an
										asset, such as model identification and human-oversight or
										review information.
									</p>
									<p>
										<code>c2pa.ai-disclosure</code> is complementary to, not a
										replacement for, actions, digitalSourceType, and
										ingredients. Each serves a distinct purpose:
									</p>
									<ul>
										<li>
											<strong>digitalSourceType</strong>: describes the nature
											of a given action (when used in an actions assertion) or a
											specific ingredient (when used in an ingredient
											assertion). It can be used to indicate whether it was
											captured, human-edited, or generated using trained
											algorithmic media.
										</li>
										<li>
											<strong>Ingredients</strong>: describe the source or
											additional assets and inputs used to produce an asset.
										</li>
										<li>
											<strong>c2pa.ai-disclosure</strong>: provides structured
											information about the AI model and generation process,
											such as model identification and human-oversight
											information.
										</li>
									</ul>
									<p>
										This guidance does not require implementers to include a{" "}
										<code>c2pa.ai-disclosure</code> assertion. Where richer,
										structured disclosure of the AI model or generation process
										is useful, for example to support AI disclosure and labeling
										use cases, implementers should consult the C2PA
										Specification for the assertion&rsquo;s full field
										definitions and requirements.
									</p>
								</Sub>

								<Sub
									id="region-of-interest"
									num="2.4"
									title="Region of Interest"
								>
									<p>
										A C2PA assertion may apply to only part of an asset. For
										music and audio assets, this can be useful when an action
										affects only a specific time range, such as an AI-replaced
										vocal phrase, localized noise reduction, stem cleanup, or
										generative extension. Further details can be found in the{" "}
										<a
											href="https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#_region_of_interest"
											rel="noreferrer"
											target="_blank"
										>
											Region of Interest
										</a>{" "}
										section of the specification.
									</p>
									<p>
										A temporal region can identify the affected segment of the
										recording.
									</p>

									<SubHeading>
										Example: Audio Temporal Region for AI-Replaced Vocal Phrase
									</SubHeading>
									<p>
										The following simplified example shows how a temporal region
										could be used to identify the part of a recording affected
										by an AI-assisted edit.
									</p>
									<ManifestPreview
										activeId="urn:c2pa:example-region-of-interest"
										manifests={[
											{
												id: "urn:c2pa:example-region-of-interest",
												title: "LeadVocal_Master.wav",
												claimGenerator: "ExampleGenAI Studio",
												assertions: {
													"c2pa.actions.v2": {
														actions: [
															{
																action: "c2pa.edited",
																when: "2025-04-01T10:01:30Z",
																softwareAgent: {
																	name: "ExampleGenAI Studio",
																	version: "3.1.0",
																},
																digitalSourceType:
																	"http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia",
																changes: [
																	{
																		region: [
																			{
																				type: "temporal",
																				time: {
																					type: "npt",
																					start: "68.00",
																					end: "72.00",
																				},
																			},
																		],
																		name: "AI-Replaced Vocal Phrase",
																		identifier: "modified-audio-region-001",
																		description:
																			"Vocal phrase replaced by AI during seconds 68.00 to 72.00 of the recording.",
																	},
																],
															},
														],
													},
												},
											},
										]}
									/>
									<CodeBlock>{`{
  "actions": [
    {
      "action": "c2pa.edited",
      "when": "2025-04-01T10:01:30Z",
      "softwareAgent": { "name": "ExampleGenAI Studio", "version": "3.1.0" },
      "digitalSourceType":
        "http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia",
      "changes": [
        {
          "region": [
            {
              "type": "temporal",
              "time": {
                "type": "npt",
                "start": "68.00",
                "end": "72.00"
              }
            }
          ],
          "name": "AI-Replaced Vocal Phrase",
          "identifier": "modified-audio-region-001",
          "description":
            "Vocal phrase replaced by AI during seconds 68.00 to 72.00 of the recording."
        }
      ]
    }
  ]
}`}</CodeBlock>
									<p>
										This allows implementers to describe localized provenance
										without implying that the same action applies to the entire
										asset.
									</p>
								</Sub>

								<Sub id="manifests" num="2.5" title="Manifests">
									<p>
										A manifest is the cryptographically signed wrapper that
										contains a list of ingredients and the associated operations
										performed on them in the form of actions. A hypothetical
										C2PA compliant vocal recording tool would insert a manifest
										into the vocal audio at the time of creation. If that vocal
										is modified by a second compliant tool (say an effects
										processor), that tool generates a new manifest that securely
										references the first manifest, adding a record of the
										effects processing. The manifests contain cryptographic
										hashes, allowing subsequent modifications to the referenced
										audio or metadata to be detected. If a compliant DAW
										combines the processed audio with an instrumental
										performance and an AI generated stem (also created by C2PA
										compliant tools), the DAW will create a manifest that
										securely references the manifests of all three ingredients.
									</p>
									<p>
										In this way, sequential changes and the combining of assets
										can all be securely tracked.
									</p>
								</Sub>
							</Section>

							<Section id="example-workflow" num="3" title="Example Workflow">
								<Sub
									id="scenario-1"
									num="3.1"
									title="Scenario 1: AI-Generated Instrumental Combined with Human Vocal"
								>
									<p>
										A producer creates an instrumental track using an AI music
										generation tool. The producer then records a human vocal
										performance directly in a DAW.
									</p>
									<p>
										Inside the DAW, the producer combines the AI-generated
										instrumental and the human vocal recording, edits and mixes
										the sources into a final track, then exports the finished
										audio file for delivery to a label, distributor, or DSP.
									</p>
									<p>
										In this workflow, the AI-generated instrumental and the
										human vocal should each be represented in their own manifest
										and referenced as ingredients in the final mix&rsquo;s
										manifest. An actions assertion cannot contain more than one{" "}
										<code>c2pa.created</code> or <code>c2pa.opened</code>{" "}
										action, since that action represents how the asset described
										by that manifest came into existence. The creation of the
										instrumental and the vocal should therefore be recorded in
										their own manifests rather than as multiple creation actions
										inside the final mix&rsquo;s manifest. However, the
										manifests of both will be wrapped into the manifest of the
										final mix.
									</p>

									<SubHeading>Manifest Excerpt: AI Instrumental</SubHeading>
									<p>
										The following simplified excerpt shows the manifest for the
										AI-generated instrumental.
									</p>
									<ManifestPreview
										activeId="urn:c2pa:scenario1-ai-instrumental"
										manifests={[
											{
												id: "urn:c2pa:scenario1-ai-instrumental",
												title: "AI_Instrumental.wav",
												claimGenerator: "AI Music Tool Fabrikam",
												assertions: {
													"c2pa.actions.v2": {
														actions: [
															{
																action: "c2pa.created",
																description: "AI-generated instrumental.",
																digitalSourceType:
																	"http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
																softwareAgent: {
																	name: "AI Music Tool Fabrikam",
																	version: "1.0",
																},
															},
														],
													},
												},
											},
										]}
									/>
									<CodeBlock>{`{
  "assertions": {
    "c2pa.actions.v2": {
      "actions": [
        {
          "action": "c2pa.created",
          "description": "AI-generated instrumental.",
          "digitalSourceType":
            "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
          "softwareAgent": {
            "name": "AI Music Tool Fabrikam",
            "version": "1.0"
          }
        }
      ]
    }
  },
  "claim.v2": {
    "claim_generator_info": {
      "name": "AI Music Tool Fabrikam",
      "version": "1.0",
      "specVersion": "2.4.0"
    }
  }
}`}</CodeBlock>

									<SubHeading>Manifest Excerpt: Human Vocal</SubHeading>
									<p>
										The following simplified excerpt shows the manifest for the
										recorded human vocal performance.
									</p>
									<ManifestPreview
										activeId="urn:c2pa:scenario1-human-vocal"
										manifests={[
											{
												id: "urn:c2pa:scenario1-human-vocal",
												title: "Human_Vocal.wav",
												claimGenerator: "DAW",
												assertions: {
													"c2pa.actions.v2": {
														actions: [
															{
																action: "c2pa.created",
																description:
																	"Recorded human vocal performance.",
																digitalSourceType:
																	"http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture",
																softwareAgent: {
																	name: "DAW",
																	version: "1.0",
																},
															},
														],
													},
												},
											},
										]}
									/>
									<CodeBlock>{`{
  "assertions": {
    "c2pa.actions.v2": {
      "actions": [
        {
          "action": "c2pa.created",
          "description": "Recorded human vocal performance.",
          "digitalSourceType":
            "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture",
          "softwareAgent": {
            "name": "DAW",
            "version": "1.0"
          }
        }
      ]
    }
  },
  "claim.v2": {
    "claim_generator_info": {
      "name": "DAW",
      "version": "1.0",
      "specVersion": "2.4.0"
    }
  }
}`}</CodeBlock>

									<SubHeading>Manifest Excerpt: Final Mix</SubHeading>
									<p>
										The following simplified excerpt shows the manifest for the
										final exported mix. It references the AI instrumental and
										the human vocal as ingredients, rather than repeating their
										creation as separate <code>c2pa.created</code> actions.
									</p>
									<p>
										In this example, <code>softwareAgent</code> identifies the
										software used to perform a specific action, while{" "}
										<code>claim_generator_info</code> identifies the software
										that generated the claim or manifest.
									</p>
									<ManifestPreview
										activeId="urn:c2pa:scenario1-final-mix"
										manifests={[
											{
												id: "urn:c2pa:scenario1-ai-instrumental",
												title: "AI_Instrumental.wav",
												claimGenerator: "AI Music Tool Fabrikam",
												assertions: {
													"c2pa.actions.v2": {
														actions: [
															{
																action: "c2pa.created",
																description: "AI-generated instrumental.",
																digitalSourceType:
																	"http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
																softwareAgent: {
																	name: "AI Music Tool Fabrikam",
																	version: "1.0",
																},
															},
														],
													},
												},
											},
											{
												id: "urn:c2pa:scenario1-human-vocal",
												title: "Human_Vocal.wav",
												claimGenerator: "DAW",
												assertions: {
													"c2pa.actions.v2": {
														actions: [
															{
																action: "c2pa.created",
																description:
																	"Recorded human vocal performance.",
																digitalSourceType:
																	"http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture",
																softwareAgent: {
																	name: "DAW",
																	version: "1.0",
																},
															},
														],
													},
												},
											},
											{
												id: "urn:c2pa:scenario1-final-mix",
												title: "FinalMix_Master.wav",
												claimGenerator: "DAW",
												assertions: {
													"c2pa.actions.v2": {
														actions: [
															{
																action: "c2pa.created",
																description: "Exported final mixed track.",
																digitalSourceType:
																	"http://cv.iptc.org/newscodes/digitalsourcetype/compositeSynthetic",
																softwareAgent: { name: "DAW", version: "1.0" },
															},
															{
																action: "c2pa.placed",
																description:
																	"Placed AI instrumental and human vocal into the mix.",
																digitalSourceType:
																	"http://cv.iptc.org/newscodes/digitalsourcetype/humanEdits",
															},
															{
																action: "c2pa.mixed",
																description:
																	"Mixed AI instrumental with human vocal.",
																digitalSourceType:
																	"http://cv.iptc.org/newscodes/digitalsourcetype/humanEdits",
															},
														],
													},
												},
												ingredients: [
													{
														title: "AI Instrumental",
														format: "audio/wav",
														relationship: "componentOf",
														activeManifestId:
															"urn:c2pa:scenario1-ai-instrumental",
													},
													{
														title: "Human Vocal",
														format: "audio/wav",
														relationship: "componentOf",
														activeManifestId: "urn:c2pa:scenario1-human-vocal",
													},
												],
											},
										]}
									/>
									<CodeBlock>{`{
  "assertions": {
    "c2pa.actions.v2": {
      "actions": [
        {
          "action": "c2pa.created",
          "description": "Exported final mixed track.",
          "digitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/compositeSynthetic",
          "softwareAgent": {
            "name": "DAW",
            "version": "1.0"
          }
        },
        {
          "action": "c2pa.placed",
          "description": "Placed AI instrumental and human vocal into the mix.",
          "digitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/humanEdits",
          "parameters": {
            "ingredients": [
              {
                "url": "self#jumbf=c2pa.assertions/c2pa.ingredient.v3",
                "alg": "sha256",
                "hash": "<ai-instrumental-assertion-hash>"
              },
              {
                "url": "self#jumbf=c2pa.assertions/c2pa.ingredient.v3__1",
                "alg": "sha256",
                "hash": "<vocal-ingredient-assertion-hash>"
              }
            ]
          }
        },
        {
          "action": "c2pa.mixed",
          "description": "Mixed AI instrumental with human vocal.",
          "digitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/humanEdits"
        }
      ]
    },
    "c2pa.ingredient.v3": {
      "dc:title": "AI Instrumental",
      "dc:format": "audio/wav",
      "relationship": "componentOf",
      "activeManifest": {
        "url": "self#jumbf=/c2pa/<ai-instrumental-manifest>",
        "alg": "sha256",
        "hash": "<ai-instrumental-manifest-hash>"
      }
    },
    "c2pa.ingredient.v3__1": {
      "dc:title": "Human Vocal",
      "dc:format": "audio/wav",
      "relationship": "componentOf",
      "activeManifest": {
        "url": "self#jumbf=/c2pa/<vocal-manifest>",
        "alg": "sha256",
        "hash": "<vocal-manifest-hash>"
      }
    }
  },
  "claim.v2": {
    "claim_generator_info": {
      "name": "DAW",
      "version": "1.0",
      "specVersion": "2.4.0"
    }
  }
}`}</CodeBlock>

									<SubHeading>Interpretation</SubHeading>
									<p>
										This example shows how the exported file can contain a new
										active manifest for the final mix while preserving the AI
										instrumental and human vocal as separate ingredient
										manifests linked through hashed references.
									</p>
									<p>
										The AI instrumental&rsquo;s manifest contains a single{" "}
										<code>c2pa.created</code> action with digitalSourceType{" "}
										<code>trainedAlgorithmicMedia</code>, indicating that the
										instrumental was created using trained algorithmic media.
									</p>
									<p>
										The human vocal&rsquo;s manifest contains a single{" "}
										<code>c2pa.created</code> action with digitalSourceType{" "}
										<code>digitalCapture</code>, indicating that the vocal was
										recorded from a real-world source.
									</p>
									<p>
										The <code>c2pa.mixed</code> action describes the later
										combination of the AI-generated instrumental and the human
										vocal. Its digitalSourceType is <code>humanEdits</code>,
										indicating that the mixing itself was performed manually by
										a human in the DAW, even though the mixed sources include
										trained algorithmic media.{" "}
										<code>compositeWithTrainedAlgorithmicMedia</code> is
										reserved for actions that use generative AI to augment or
										edit existing media, such as inpainting, outpainting, or
										replacing a segment of a recording, and is not the correct
										value for describing a manual mix of separately created
										sources.
									</p>
									<p>
										This example is intentionally simplified. A full
										implementation may also include ingredient hashes and URLs,
										signatures, validation results, identity assertions, soft
										binding, or links to related metadata systems.
									</p>
								</Sub>

								<Sub
									id="scenario-2"
									num="3.2"
									title="Scenario 2: Licensed Remix in a Platform Environment"
								>
									<p>
										A user accesses a licensed song inside a platform that is
										authorized to make a remix. The user creates a remix using
										the platform&rsquo;s built-in tools. Note that the
										portability of the resulting remix may be limited by the
										platform. &ldquo;Walled-garden&rdquo; systems may not allow
										for the downloading and distribution of the remix.
									</p>
									<p>
										In this workflow, the original licensed recording is the
										previous asset from which the remix is derived, so it should
										be represented as a <code>parentOf</code> ingredient and
										referenced from the <code>c2pa.opened</code> action through{" "}
										<code>parameters.ingredients</code>. The remix action can be
										described using <code>c2pa.remixed</code>, with tool,
										timestamp, and platform information recorded as appropriate.
									</p>
									<p>
										Content Credentials can help describe that a remix action
										occurred and identify the source asset and platform context,
										but they do not replace the underlying license, platform
										terms, or rights-management system.
									</p>

									<SubHeading>Manifest Excerpt</SubHeading>
									<p>
										The following simplified excerpt shows how a licensed AI
										remix workflow may record that a remix action occurred
										inside a platform environment.
									</p>
									<ManifestPreview
										activeId="urn:c2pa:example-scenario2-remix"
										manifests={[
											{
												id: "urn:c2pa:example-scenario2-remix",
												title: "Remix_Final.wav",
												claimGenerator: "Remix Platform",
												assertions: {
													"c2pa.actions.v2": {
														actions: [
															{
																action: "c2pa.opened",
																description:
																	"Opened licensed source recording inside the platform.",
																softwareAgent: {
																	name: "Remix Platform",
																	version: "1.0",
																},
															},
															{
																action: "c2pa.remixed",
																description:
																	"Created an AI-generated remix using platform-provided tools.",
																digitalSourceType:
																	"http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
																softwareAgent: {
																	name: "Remix Platform",
																	version: "1.0",
																},
															},
														],
													},
												},
												ingredients: [
													{
														title: "Song title A - Artist X",
														format: "audio/wav",
														relationship: "parentOf",
													},
												],
											},
										]}
									/>
									<CodeBlock>{`{
  "assertions": {
    "c2pa.actions.v2": {
      "actions": [
        {
          "action": "c2pa.opened",
          "description": "Opened licensed source recording inside the platform.",
          "parameters": {
            "ingredients": [
              {
                "url": "self#jumbf=c2pa.assertions/c2pa.ingredient.v3"
              }
            ]
          },
          "softwareAgent": {
            "name": "Remix Platform",
            "version": "1.0"
          }
        },
        {
          "action": "c2pa.remixed",
          "description": "Created an AI-generated remix using platform-provided tools.",
          "digitalSourceType":
            "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
          "softwareAgent": {
            "name": "Remix Platform",
            "version": "1.0"
          }
        }
      ]
    },
    "c2pa.ingredient.v3": {
      "dc:title": "Song title A - Artist X",
      "dc:format": "audio/wav",
      "relationship": "parentOf"
    }
  },
  "claim.v2": {
    "claim_generator_info": {
      "name": "Remix Platform",
      "version": "1.0",
      "specVersion": "2.4.0"
    }
  }
}`}</CodeBlock>

									<SubHeading>Interpretation</SubHeading>
									<p>
										This example shows how Content Credentials can describe an
										AI-assisted remix of a licensed source recording within a
										platform workflow.
									</p>
									<p>
										The <code>c2pa.opened</code> action describes the licensed
										source recording being opened inside the remix platform.
										Because the remix is derived from this recording, the source
										recording is represented as a <code>parentOf</code>{" "}
										ingredient and referenced directly from the{" "}
										<code>c2pa.opened</code> action through{" "}
										<code>parameters.ingredients</code>.
									</p>
									<p>
										The <code>c2pa.remixed</code> action describes the creation
										of the AI-generated remix. Its digitalSourceType is{" "}
										<code>trainedAlgorithmicMedia</code>, indicating that the
										remix action involved both the licensed source recording and
										trained algorithmic media.
									</p>
									<p>
										This example does not attempt to express the license terms,
										platform permissions, royalty treatment, or downstream usage
										rules. Those remain handled by the platform&rsquo;s
										licensing, rights-management, policy, and commercial systems
										outside the C2PA manifest.
									</p>
									<p>
										Note that the manifest will be the same regardless of
										whether the platform is open or a &ldquo;walled
										garden&rdquo; system.
									</p>
								</Sub>
							</Section>

							<Section id="annexes" num="4" title="Annexes">
								<Sub id="ddex" num="4.1" title="DDEX and Metadata Alignment">
									<p>
										Content Credentials act as an upstream provenance layer that
										supports{" "}
										<a
											href="https://ddex.net/standards/"
											rel="noreferrer"
											target="_blank"
										>
											DDEX metadata
										</a>
										. DDEX remains the exchange format for structured music
										metadata between labels, distributors, DSPs, and other
										commercial partners. A claim generator should capture
										verifiable information during creation and production, such
										as actions, ingredients, tools, timestamps, and
										digitalSourceType values. This information may later be used
										by record labels to populate, validate, or support DDEX
										metadata.
									</p>
								</Sub>

								<Sub
									id="soft-binding"
									num="4.2"
									title="Persistence and Recovery with Soft Binding"
								>
									<p>
										Content Credentials may be stripped during upload, resizing,
										transcoding, etc. C2PA soft binding can support recovery by
										resolving a decoupled manifest through a manifest
										repository, provided the asset was prepared with a suitable
										soft binding signal and the manifest was registered. The{" "}
										<a
											href="https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#_soft_bindings"
											rel="noreferrer"
											target="_blank"
										>
											C2PA soft binding specification
										</a>{" "}
										describes this model as a way to recover manifests that have
										become decoupled from their assets. The C2PA Specification
										also defines optional soft binding approaches, including
										watermarking and fingerprinting, that can support indirect
										lookup of a Content Credential when direct embedding is not
										available or when embedded metadata may not survive
										downstream processing.
									</p>
									<p>
										For music assets, soft binding may be useful because audio
										often passes through transformations such as transcoding,
										loudness normalization, clipping, platform ingestion,
										user-generated content workflows, and redistribution. Soft
										binding is optional and this guidance does not require any
										music company, platform, distributor, or tool provider to
										implement watermarking or fingerprinting.
									</p>
								</Sub>

								<Sub
									id="watermarking"
									num="4.3"
									title="Best Practices for Audio Watermarking"
								>
									<p>
										Where watermarking is used with Content Credentials applied
										to music, implementers should prefer technologies that are
										imperceptible to listeners and robust under real-world
										distribution conditions.
									</p>
									<p>Relevant considerations include:</p>
									<ul>
										<li>Imperceptibility to listeners</li>
										<li>
											Robustness after transcoding, resampling, clipping,
											loudness normalization, and format conversion
										</li>
										<li>Detection from short excerpts where appropriate</li>
										<li>Low false positive and false negative rates</li>
										<li>
											Reliable detection after common streaming and
											social-platform processing
										</li>
										<li>
											Clear behavior when multiple watermarked assets are mixed,
											overlaid, or re-watermarked
										</li>
										<li>
											Support for lookup-based payloads, where the watermark
											carries a compact identifier rather than full metadata
										</li>
									</ul>
									<p>
										For catalog-level identification, some implementations may
										choose to use an identification payload, such as a 32-bit
										lookup key, to connect the detected watermark to a manifest
										repository. The appropriate payload size is an
										implementation and business decision, not a C2PA
										requirement.
									</p>
									<p>
										Companies developing watermarking or fingerprinting
										technologies for Content Credentials should consider
										participating in the C2PA soft binding ecosystem and
										requesting inclusion in the relevant soft binding algorithm
										list where appropriate.
									</p>
								</Sub>
							</Section>
						</article>
					</div>
				</div>
			</main>
			<SiteFooter />
		</>
	);
}
