# AssetMaster — Design Brainstorm

## Three stylistic approaches

### Theme Name: Corporate Clarity
Very light enterprise workspace with navy structure, teal actions, and restrained amber signals. The emotional intent is confidence, order, and fast operational decisions.

**Probability:** 0.07

### Theme Name: Midnight Command Center
Dark slate operations room with blue-green telemetry accents and dense monitoring surfaces. The emotional intent is control under pressure and continuous visibility.

**Probability:** 0.03

### Theme Name: Warm Ledger
Paper-inspired administrative interface with ink typography, muted sage, and terracotta status cues. The emotional intent is trust, traceability, and a human record-keeping ritual.

**Probability:** 0.08

## Chosen direction: Corporate Clarity

### Design Movement
Contemporary Swiss corporate information design blended with calm enterprise software ergonomics.

### Core Principles
1. Make status legible at a glance through hierarchy, contrast, and compact data patterns.
2. Use whitespace as operational breathing room, not decoration.
3. Pair a dependable navy information layer with teal action cues and amber exceptions.
4. Keep every interaction crisp, reversible, and close to the data it affects.

### Color Philosophy
A cool near-white canvas keeps long sessions comfortable. Deep navy is reserved for structure and trust; teal marks the productive path; amber calls attention to maintenance or change without creating alarm. Color is semantic, not ornamental.

### Layout Paradigm
A persistent left rail anchors navigation while the content canvas uses an asymmetric 12-column rhythm: the main data table stays broad, while contextual cards and small signals sit in offset bands. On mobile, the rail becomes a compact top control and the table becomes a horizontally scrollable data surface.

### Signature Elements
- A small amber activity line that signals system pulse.
- Soft technical grid texture in the welcome strip.
- Navy monogram-like geometric asset mark paired with teal micro-labels.

### Interaction Philosophy
Interactions should reduce uncertainty. Filters update visibly, active navigation is unmistakable, row actions stay local, and placeholder actions explain their future behavior with a toast rather than silently failing.

### Animation
Use 160–220ms ease-out transitions for buttons, filters, and row hover states. KPI cards enter with a 40ms stagger and a subtle translate-y of 6px. Avoid ornamental motion in dense data areas. Respect reduced-motion preferences.

### Typography System
Use Manrope for headings and IBM Plex Sans for body/data copy. Headings are tight, semibold, and sentence case; labels are uppercase only for tiny metadata. Numbers use tabular numerals and stronger weight for scanning.

### Brand Essence
AssetMaster is the calm operational layer for teams that need to know where every business asset is, who owns it, and what happens next.

**Personality:** precise, reassuring, decisive.

### Brand Voice
Headlines are direct and useful. CTAs are verbs with clear outcomes. Microcopy is concise, never salesy, and explains system state plainly.

- “Nắm rõ mọi tài sản. Quyết định nhanh hơn.”
- “Thêm tài sản, giữ đúng lịch sử.”

### Wordmark & Logo
A custom geometric asset mark combines a tag, protected cube, and check mark. The wordmark is set in a high-contrast semibold display treatment with a compact teal “Master” emphasis; the symbol remains recognizable without text at small sizes.

### Signature Brand Color
**Asset Teal — #0F8C8C**, a confident operational teal used for primary action states and progress cues.

## Implementation reminders

- `client/src/index.css`: global Corporate Clarity tokens, Manrope + IBM Plex Sans, motion and surface rules.
- `client/src/pages/Home.tsx`: dashboard composition, data surfaces, responsive behavior, local interactions.
- `client/src/App.tsx`: light theme shell and route wiring.
- `client/index.html`: Vietnamese language metadata and font loading.

When in doubt: “Does this choice reinforce or dilute Corporate Clarity?”
