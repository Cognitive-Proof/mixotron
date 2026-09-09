# Mix-O-Tron notes for agents

## Known gotchas

### `c2pa-react-component` provenance graph (level 3) edges render invisible without a CSS override

**Symptom:** `<C2paManifest level={3} manifest={outcome} />` (the "provenance graph" /
node view — used on the Verify page and in the `/info` guidance examples)
shows nodes correctly, but connecting lines between a manifest and its
ingredients never appear, even when the ingredient data is fully correct
(`ingredients[].active_manifest` / `manifestId` matches a real key in
`manifestStore.manifests`).

**Root cause:** `c2pa-react-component` (built on `@xyflow/react`) renders
each edge as its own bare `<svg>` with no explicit `width`/`height` — it
relies on the browser's default replaced-element sizing. This repo's global
reset in `src/styles/globals.css`:

```css
img,
svg {
	display: block;
	max-width: 100%;
}
```

collapses those unsized edge `<svg>` elements to `width: 0`, which silently
suppresses the connecting line even though the `<path>` inside has fully
correct coordinates. It's a CSS collision in this app, not a bug in the
library or in whatever manifest data you're passing in.

**Fixed upstream as of `c2pa-react-component@0.1.21`** (bumped in this repo
2026-08-27) — the package now ships its own `.react-flow__edges svg {
max-width: none }` override, so this no longer requires a workaround here.
Confirmed by temporarily disabling this repo's local override and checking
the graph still rendered edges correctly on 0.1.21.

`src/styles/globals.css` still carries the same override, right after that
reset, as defense-in-depth (harmless/redundant, not required anymore):

```css
.react-flow__edges svg {
	display: inline;
	max-width: none;
}
```

**If a graph still looks unconnected after this:** don't assume the ingredient
data is wrong — verify in the DOM first. In a browser devtools console (or
`mcp__claude-in-chrome__javascript_tool`):

```js
document.querySelectorAll('.react-flow__edge-path').length // should be > 0
document.querySelectorAll('.react-flow__edges svg')[0].getBoundingClientRect().width // should be > 0, not 0
```

If path count is 0, the data/linking is genuinely wrong (check
`ingredients[].active_manifest` matches a `manifestStore.manifests` key).
If path count is > 0 but the svg's width is 0, it's this CSS issue —
check the override above hasn't been removed or scoped out.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
