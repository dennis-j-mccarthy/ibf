# Ignatius Book Fairs — Design System

A complete design system for Ignatius Book Fairs (IBF) — a Catholic-friendly
book-fair program pitched as "the good alternative to Scholastic." Partnership
between Ignatius Press and Ave Maria University. Captures the brand's visual
language, copy tone, and components across the marketing site and internal
"Doc Maker" tooling.

## Modes (site + materials switch palette + copy by mode)
| Mode | Primary color | Who |
|---|---|---|
| Catholic (in-person) | #0088ff bright blue | Catholic schools |
| Parish (in-person) | #50db92 green | Parishes |
| Public (in-person) | #ff6445 coral | Public / non-religious schools |
| Virtual | #42ade2 sky blue | Anyone running an online fair |

## Voice & copy
- Positioning: "Good books for great kids." / "Wholesome, Curated, Parent-Approved."
  / "the good alternative to Scholastic" (says what it is NOT).
- Voice: warm, informed, encouraging — a trusted librarian, not a marketer.
  Catholic/Parish reverent-but-friendly (virtue, wonder, truth, beauty, goodness);
  Public secular/playful; Virtual pragmatic/logistics-forward.
- Pronouns: "you"/"your students/parish/kids" for hosts; "we" for IBF. Never "I."
- Casing: HEADLINES UPPERCASE, letter-spacing .02em (Brother 1816 800/900).
  BUTTONS UPPERCASE ("BOOK A FAIR", "LEARN MORE"). Nav uppercase + tracked.
  Body sentence case. Emphasis = shouted brand words, not italics.
- Emoji: rarely; brand leans on illustration + photography.
- Vibe words: wholesome, curated, timeless, wonder, imagination, virtue, good & true,
  excellence, joy, community.
- Avoid: corporate-speak, exclamation stacks, sarcasm, punching down at named competitors.

## Color
- **Mode colors** (coral/blue/green/sky) own hero + sticky header (mode color bg,
  white logo + white nav). No gradients between mode colors.
- **Accent**: yellow #ffd41d (most common secondary; Catholic hero = 70% yellow wash;
  .btn-secondary). Dark blue #02176f (footer, deep sections, text on yellow).
- **Neutrals**: white #ffffff, warm cream #fafafa, ink #1a1b1f text, mint #b9dbc5
  (soft bg for story/testimonial blocks), alice/light-blue #f0f8ff.
- On yellow, text is ALWAYS dark blue #02176f — never white.

## Type
- **Brother 1816** (Adobe Typekit, kit poj1hyc) — THE voice. 800/900 display+headings,
  600/700 nav. UPPERCASE headings + buttons. PAID; local near-metric fallback = **Outfit**.
- **Open Sans** — body on long-form (FAQs, guides).
- **Fredoka** (variable, local) — rounded/friendly; kid-facing + Doc Maker previews.
- **Great Vibes** + **Handsome Pro** — script flourishes, sparingly.

## Spacing / layout
- Container max-width 1500px, 3% gutters. Grid gap 24px desktop / 16px mobile.
- Section vertical padding 80–96px desktop / 48–64px mobile. Hit target ≥44px.

## Backgrounds / imagery
- Hero motif: full-bleed photography of kids reading + solid 70% mode-color wash.
- Public variant: hand-drawn white doodles (squiggles, circles, plus signs, stars,
  zigzags) at 10–20% opacity, 7–16s drift/float keyframes.
- "Blob" illustrations (organic shapes with stacked books + cozy objects) to the
  right of hero copy. No gradients for section backgrounds — solid colors only.
- Section bg options: white, cream, alice, dark-blue (deep "trust" section), mint
  (testimonials). Imagery: warm natural light, real kids, not b&w/gritty. Book-cover
  .webp thumbnails at native res, never cropped.

## Animation
- Easing ease-in-out, 7–16s ambient doodles; 0.2–0.3s ease for interactions. No springs.
- Scroll reveal: fade + 20px translateY, 0.6s ease-out. Hover: color/opacity 0.8, no scale.
  Press: translateY(1px), no shrink.

## Borders, radii, shadows
- Radii: buttons + tags = full pills (9999px). Cards 16px. Fields 8px. Images unrounded.
- Borders: 1px #e4e6ea cards; 1.5px white ghost buttons; 1px rgba(255,255,255,.4) mode toggles.
- Shadows warm/soft: card 0 2px 4px rgba(25,27,34,.1); hero CTA glow
  0 18px 40px -12px rgba(255,100,69,.35). No big diffuse shadows on hero text (use wash).
- No backdrop-blur / glassmorphism. Brand stays flat.

## Iconography
- No brand icon font. Lucide React in doc-maker (ExternalLink, Edit, Check, X, Plus,
  ChevronRight). Marketing hero doodles = inline SVG illustration (reuse verbatim).
  New work: Lucide, stroke-width 2, 24px, ink or white on colored headers.

## Caveats
- Brother 1816 is paid Typekit → fall back to Outfit locally.
- Marketing CSS inherits Webflow-era "balbs-*" class names (tokens renamed to --ibf-*).
- Gemini illustrations = inspiration only, not brand-approved.

---
## Social post themes (5) — grounded in the above, layout + content angle
1. **Hero Wash** — full-bleed mode-color wash, big UPPERCASE display headline + yellow
   eyebrow. Angle: the hook/headline.
2. **Doodle Announcement** — cream/white bg with drifting white doodles + bold headline
   + pill CTA. Angle: announcement / event.
3. **Testimonial** — mint #b9dbc5 bg, Great Vibes script accent + quote marks.
   Angle: a parent/coordinator quote.
4. **Impact Stat** — dark-blue #02176f "trust" field, oversized yellow number.
   Angle: a key stat (funds back to school, etc.).
5. **Book CTA** — white card, book-cover / blob imagery, UPPERCASE pill button
   ("BOOK A FAIR"). Angle: call-to-action.

## Platform sizes
| Platform | Size | Shape |
|---|---|---|
| Instagram | 1080×1080 | square |
| Facebook | 1080×1350 | portrait 4:5 |
| TikTok | 1080×1920 | vertical 9:16 |
| Pinterest | 1000×1500 | vertical 2:3 |
| X | 1600×900 | landscape 16:9 |
