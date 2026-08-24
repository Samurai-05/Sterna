# Landing page — narrative and implementation references

This document is the implementation brief for the Sterna landing page.

Its purpose is to keep future UI work consistent and to avoid regenerating the page section by section without a common narrative.

## 1. Goal

The landing page must explain Sterna quickly to someone who has never seen the project.

The page is a product showcase, not project documentation. It should not explain the development process, DevOps pipeline, architecture, technical stack, requirements, sprint organization, or other internal project details.

The central story is:

> A photo taken during a trip becomes a geolocated discovery, that discovery appears on a map, and the map gradually becomes a visual record of the places explored.

The group feature extends the same idea to several people sharing one trip.

## 2. Product problem to communicate

The problem is **not** "how much of the world have you explored?" and the page must not frame Sterna primarily as a coverage/performance tracker.

The problem to communicate is:

- people already take many photos while travelling or going out;
- those photos usually end up mixed inside a camera roll;
- the geographic context of the trip is not clearly represented;
- it is difficult to revisit discoveries through the places where they happened;
- there is no simple shared geographic record when several people travel together.

The solution is that Sterna turns photos into geolocated discoveries and places them back on a map.

## 3. Visual direction

Keep the visual language already established in the landing page:

- white background;
- primary green `#2D5A3D`;
- dark green accent `#244A32` (`green-700`, see `docs/design-system.md`);
- black / muted-grey typography;
- Manrope — a deliberate exception to `docs/design-system.md`, whose scope is the application UI (Outfit/Fraunces); the marketing landing page uses Manrope instead;
- large typography and generous whitespace;
- rounded product mockups;
- very limited decorative effects;
- real Sterna mockups should be the main visual proof.

Avoid generic SaaS patterns when they do not help the story:

- no feature bento grid just to fill space;
- no fake testimonials;
- no pricing section;
- no FAQ;
- no logo cloud;
- no invented statistics;
- no three-icon marketing list unless it represents an actual user flow;
- no abstract AI-generated illustrations when a real Sterna mockup can be used.

## 4. Page order

The target order is:

1. Header
2. Hero
3. Problem
4. How Sterna works
5. Concrete result / Weekend in Paris
6. Shared exploration
7. Explore the app
8. Team
9. Footer

The page should read as one continuous story rather than independent feature sections.

---

# Section specifications

## 5. Header

### Decision

**Keep the existing header. Do not replace it with a template unless there is a concrete usability problem.**

The header should stay visually quiet because the hero is already visually strong.

### Implementation rule

Do not add product-navigation links for sections that do not exist. Keep navigation limited to useful anchors and GitHub/project access.

---

## 6. Hero

### Decision

**Keep the current custom `Hero.tsx` and `GlobePolaroids.tsx`.**

The globe + travel photos are already specific to Sterna and are more valuable than replacing the hero with a generic template.

### Current structure to keep

- large centered headline;
- short one-sentence explanation;
- GitHub CTA;
- interactive globe / polaroids.

### Copy direction

Headline can remain close to:

> Explore the world with Sterna.

Supporting line should be concrete and explain the product rather than add another slogan. Preferred direction:

> Turn the places you visit into a map of your exploration.

### Reference only

If spacing or mobile behaviour needs to be rebuilt, use Tailark's minimalist hero blocks as a layout reference rather than replacing the Sterna globe:

- Tailark Veil Hero Section Two: https://tailark.com/preview/veil/hero-section/two
- Tailark hero guidance: https://pro.tailark.com/blog/hero-section

### Do not

- add several CTAs;
- add badges such as "AI powered";
- add fake social proof;
- explain every feature in the hero.

---

## 7. Problem

### Job of the section

Explain why Sterna exists **before** explaining features.

The visitor should understand that travel photos capture moments but do not provide a clear geographic representation of a trip or of the places discovered.

### Recommended template

**Primary reference: Tailark `Content Default` / content variants on 21st.dev.**

https://21st.dev/community/components/meschacirung/content-default

Why this reference:

- clean typography-first layout;
- React / Tailwind / Next.js compatible;
- low visual complexity;
- lets the actual travel imagery carry the section;
- easy for an AI agent to copy and adapt without introducing a new design language.

A useful image-led variant is the Tailark Content Block / Content Page:

https://21st.dev/community/components/meschacirung/content-block/content-page

### Optional premium reference

Shadcnblocks `About 28` has a strong two-column layout with staggered images and text:

https://www.shadcnblocks.com/block/about28

It is a **Pro** block. Use it only if the project has legitimate access to the code; otherwise use it as visual inspiration only.

### Sterna adaptation

Suggested structure:

- short label: `Why Sterna` or no label at all;
- one strong heading;
- maximum two short paragraphs;
- visual made from real travel photos / camera-roll composition;
- transition visually toward a map or a Sterna phone mockup.

Copy direction:

> Your travel memories are scattered across your camera roll.

> Photos capture individual moments, but they rarely show the bigger picture of where those moments happened. Sterna puts those discoveries back on a map.

This copy is a direction, not immutable final wording. Preserve the idea even if the exact phrasing changes.

### Acceptance criteria

- problem understandable without mentioning implementation details;
- no three-card feature grid;
- no gamification wording here;
- no "how much of the world have you explored?" framing;
- visual must relate to actual travel photos / geography.

---

## 8. How Sterna works

### Job of the section

This is the **main explanatory section of the page**.

Show the actual user flow rather than marketing concepts.

The sequence is:

1. **Capture** — take a photo or choose one from the gallery.
2. **Locate** — use the photo location when available, or let the user correct/select the place.
3. **Reveal** — save the discovery and show it on the map / reveal the visited area.

### Recommended template

**Best structural reference: Shadcnblocks Feature 102 — numbered three-step timeline with side images.**

https://www.shadcnblocks.com/block/feature102

Why it fits Sterna:

- exactly three steps;
- each step supports a real screenshot;
- strong chronological reading direction;
- avoids generic feature cards;
- works well for `Capture -> Locate -> Reveal`;
- responsive structure already defined.

Feature 102 is a **Pro** block. Only copy its code if the project has legitimate access.

### Lighter alternative

Shadcnblocks Feature 187 — three-step process with connector line:

https://www.shadcnblocks.com/block/feature187

This is also a **Pro** block, but it is useful as a layout reference if a simpler version is preferred.

### Free component fallback

21st.dev / ReUI Stepper:

https://21st.dev/community/components/sean0205/stepper/vertical

This is more application-like than marketing-like, so use it only as the underlying stepper structure and keep the final design aligned with the Sterna landing page.

### Assets

Prefer real Sterna Figma exports / existing mockups:

- add/new-discovery screen;
- map/location confirmation screen;
- map screen showing the saved discovery / explored area.

Do not invent UI in CSS if a real application mockup exists.

### Copy constraints

Each step should contain:

- one verb-led title;
- one sentence, maximum two;
- one screenshot.

No secondary feature lists.

### Acceptance criteria

A visitor who only sees this section should be able to explain Sterna's core interaction correctly.

---

## 9. Concrete result — Weekend in Paris

### Decision

**Keep the existing `WeekendParisMockup.tsx` visual, but simplify its role.**

This section should no longer explain `Capture / Remember / Explore`. The previous section already explains the flow.

Its only job is to show the result of using Sterna on a real trip.

### Structure

- one short heading;
- one short paragraph at most;
- large `Weekend Paris` phone mockup;
- no repeated feature list.

Copy direction:

> One weekend. One map. Every discovery in its place.

The exact final line may change, but the section must remain a concrete example rather than another feature explanation.

### Template

No new template needed. Reusing the current component reduces implementation work and keeps the strongest custom visual already built for Sterna.

---

## 10. Shared exploration

### Job of the section

Extend the individual story naturally:

> If several people make the trip together, they can build the same map together.

This is not a separate feature catalogue. It is the same Sterna flow applied to a group.

### Recommended layout reference

**Shadcnblocks Feature 344 — split feature with a dominant image and text.**

https://www.shadcnblocks.com/block/feature344

Feature 344 is a **Pro** block. Use its source only with legitimate access; otherwise use the layout as reference.

The important pattern is the simple two-column composition, not its checklist.

### Sterna adaptation

- one side: real group-map mockup;
- other side: title + maximum two short paragraphs;
- optional small avatar group or invitation-code detail if it comes directly from the actual product design;
- remove the current three generic icon explanations if they do not add information.

Copy direction:

> Exploring together? Build the map together.

> Create a group for the trip and let everyone add their discoveries to the same map. Each discovery keeps its author.

### Acceptance criteria

- group feature understandable in under ten seconds;
- no fake map made from abstract CSS shapes if a real Sterna group-map mockup exists;
- no independent list of three marketing benefits.

---

## 11. Explore the app

### Job of the section

After the visitor understands the product, let them inspect the application screens.

This section is **proof / preview**, not another explanation of the concept.

### Recommended approach

Reuse the current `ProductShowcase.tsx` interaction if it remains clean after simplifying the copy.

Keep the screen navigation:

- Map
- Explore
- Add
- Groups
- Profile

But remove repetitive slogans and long descriptions. A label and one concise factual sentence per screen is enough.

### Template alternative

If the current tabs become difficult to maintain, use Shadcnblocks Gallery 9:

https://www.shadcnblocks.com/block/gallery9

It provides a full-width carousel with clickable section labels, which maps naturally to the five Sterna screens.

Gallery 9 is a **Pro** block. Copy source only with legitimate access.

### Free source catalogue

21st.dev has a large gallery / carousel catalogue and exposes copy-prompt / shadcn installation workflows:

https://21st.dev/community/components/s/landing-page

### Acceptance criteria

- screenshots dominate the section;
- text is secondary;
- no new product claims introduced here;
- use real mockups;
- mobile navigation remains obvious.

---

## 12. Team

### Decision

The existing `Team.tsx` already covers the requirement and may be kept.

Do not redesign it merely for novelty.

### Optional replacement template

If a more editorial section is wanted later, use the free 21st.dev Team Showcase:

https://21st.dev/community/components/makviesainte/team-showcase

It already exposes a shadcn install command and uses `react-icons`, which is already present in the landing project.

A simpler reference is Tailark Team One:

https://tailark.com/preview/mist/team/one

### Sterna adaptation

Show only real team information:

- name;
- study area / role;
- GitHub link;
- HEIG-VD affiliation.

No invented job titles, biographies, or social accounts.

---

## 13. Footer

### Decision

Keep the current footer unless there is a concrete missing link.

A footer template would not improve the product story and would create unnecessary implementation work.

---

# 14. Component-source strategy

## Preferred source: 21st.dev

Use 21st.dev first when a new block is required.

Reason:

- components are React + Tailwind;
- they are compatible with Next.js-style projects;
- source is copied into the repository rather than added as a permanent UI-library dependency;
- the site exposes AI-ready copy prompts and shadcn CLI installation flows;
- this is well suited to implementation by Codex / Claude Code / another coding agent.

Catalogue:

https://21st.dev/community/components/s/landing-page

Tailark library on 21st.dev:

https://docs.21st.dev/community/meschacirung/library/tailark

## Secondary source: Shadcnblocks

Shadcnblocks has very strong marketing layouts, especially for process, feature, gallery, and team sections.

Catalogue:

https://www.shadcnblocks.com/blocks/feature

Important: many recommended blocks are marked **Pro**. Do not reproduce premium source code without access. They can still be used to decide what layout pattern to implement.

## Avoid unnecessary dependencies

The current landing stack is intentionally small. Before adding a dependency, check whether the same result can be produced with:

- React;
- Tailwind CSS;
- existing `react-icons`;
- existing assets.

Do not introduce Framer Motion / Motion, Radix, or a full shadcn setup for one decorative effect unless the chosen template genuinely requires it and the gain is clear.

---

# 15. Rules for future AI implementation

When an AI agent modifies the landing page, provide this document as context and require it to follow these rules:

1. Do not add new landing sections without an explicit reason.
2. Preserve the page order defined in this document.
3. Every section must have one job in the narrative.
4. Prefer existing Sterna mockups over generated illustrations.
5. Prefer adapting a referenced template over inventing a new visual system.
6. Keep `#2D5A3D` as the main accent color.
7. Keep the page primarily white and restrained.
8. Avoid generic SaaS copy and repeated slogans.
9. Do not turn product requirements into a feature checklist on the landing page.
10. Do not explain DevOps, architecture, project management, or technical choices on the public landing page.
11. Do not invent features that are not in the product scope.
12. Reuse existing components when their visual already works; simplify them before replacing them.
13. Keep mobile behaviour first-class.
14. Check `prefers-reduced-motion` if adding animation.
15. Run the landing build after implementation.

## Recommended implementation sequence

To reduce risk and keep changes reviewable:

1. add the Problem section;
2. add / rebuild How Sterna Works;
3. simplify WeekendParisMockup;
4. simplify ShareSection;
5. move and simplify ProductShowcase;
6. review transitions / spacing between all sections;
7. mobile review;
8. build + lint / quality check.

Do not redesign the hero, team, header, and footer in the same pass unless necessary.

---

# 16. Final target narrative

The page should communicate this sequence without the visitor needing to infer it:

```text
Explore the world with Sterna.
        ↓
Travel photos capture moments, but the geographic story gets lost in the camera roll.
        ↓
Capture a photo.
        ↓
Locate the discovery.
        ↓
See it become part of your map.
        ↓
A trip becomes a visual map you can return to.
        ↓
Travelling with friends? Build that map together.
        ↓
Explore the actual Sterna screens.
        ↓
Meet the team.
```

If a proposed section does not strengthen this sequence, it probably does not belong on the landing page.
