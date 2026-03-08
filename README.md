This repository contains a small Next.js demo app demonstrating a nested drag-and-drop lesson/folder UI built with dnd-kit and a minimal GraphQL + Mongoose backend used elsewhere in the project.

**Quick Start**

```bash
npm install
npm run dev
# then open http://localhost:3000
```

**Tech Stack**

- Next.js (App Router) and React
- TypeScript
- Tailwind CSS for styling
- dnd-kit for drag & drop interactions
- Apollo / GraphQL (example GraphQL route in project)
- Mongoose + MongoDB (models under `src/graphql/models`)
- Node.js / npm


**What this app demonstrates**

- **Drag & Drop Tree:** nested lessons and folders with insert-before, folder overlap, and drag overlay behavior (see `src/app/testing`).
- **Selection & Pressed State:** click to select an item (blue ring) and pointer-down pressed visuals while dragging.
- **Responsive styles:** UI uses Tailwind utility classes for responsive spacing and sizing.

**Key Files**

- **App entry / demo page:** [src/app/testing/page.tsx](src/app/testing/page.tsx)
- **Tree renderer:** [src/app/testing/TreeRender.tsx](src/app/testing/TreeRender.tsx)
- **Per-item component:** [src/app/testing/TreeItemComponent.tsx](src/app/testing/TreeItemComponent.tsx)
- **Drag utils / hook:** [src/app/testing/useTreeDrag.tsx](src/app/testing/useTreeDrag.tsx)
- **Tree helpers:** [src/app/testing/treeUtils.ts](src/app/testing/treeUtils.ts)
- **Sample data:** [src/app/testing/sampleData.ts](src/app/testing/sampleData.ts)

**Notes & Implementation Details**

- dnd-kit provides a runtime `transform` string (translate/scale) — this must be applied inline via the `style` prop; Tailwind classes are used for static layout and transitions.
- Depth-based indentation is computed at render time and applied as an inline `marginLeft` (keeps logic straightforward and responsive via rem units).
- Selection state (`selectedId`) and pressed state (`pressedId`) are stored in the page-level React state and passed down to the renderer.

**Tailwind and Responsiveness**

- The demo converts many inline px values to Tailwind utilities and uses rem-based inline margins for depth. To further tune responsiveness, you can add responsive modifiers (`sm:`, `md:`) or map depths to utility classes.

**Feedback / Next steps**

- If you'd like, I can:
	- Convert remaining inline styles to Tailwind classes,
	- Add keyboard accessibility (arrow/move) for the tree,
	- Extract the tree into a reusable component package.

---

For more details about Next.js and deployment, see the official docs: https://nextjs.org/docs
