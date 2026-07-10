// Ignatius Book Fairs design tokens — the source of truth for the social post
// generator (and reusable elsewhere). Values transcribed from the IBF design
// system (design-system.md + the reference screenshots).

export const modeColors = {
  catholic: '#0088ff', // bright blue (in-person Catholic)
  parish: '#50db92', // green
  public: '#ff6445', // coral
  virtual: '#42ade2', // sky
} as const;
export type Mode = keyof typeof modeColors;

export const accents = {
  yellow: '#ffd41d',
  orange: '#f29500',
  darkBlue: '#02176f',
  lightMint: '#b9dbc5',
  mint: '#c0dac7',
} as const;

export const neutrals = {
  background: '#ffffff',
  cream: '#fafafa',
  alice: '#f5fbfc',
  ink: '#1a1b1f', // fg1 — body/heading text
  slate: '#7e828f', // fg3 — muted
} as const;

// Fonts. Brother 1816 is paid Typekit; Outfit is the design system's own local
// near-metric fallback and is what we render posts with (safe to embed).
export const fonts = {
  display: 'Outfit', // headlines (Brother 1816 stand-in)
  body: 'Open Sans',
  soft: 'Fredoka', // rounded / kid-facing
  script: 'Great Vibes', // seasonal flourish
} as const;

// Website type scale (Brother 1816). Posts scale these up for their canvas but
// keep the 800 weight + ratios. Headlines are sentence/title case; eyebrows,
// buttons and nav are UPPERCASE with .02em tracking. Text on yellow = darkBlue.
export const typeScale = {
  h1: { size: 38, line: 44, weight: 800 },
  h2: { size: 32, line: 36, weight: 800 },
  h3: { size: 22, line: 30, weight: 800 },
  body: { size: 16, line: 24, weight: 400 },
  small: { size: 14, line: 21, weight: 400 },
} as const;

export const radii = { pill: 9999, card: 16, field: 8 } as const;

export const shadows = {
  card: '0 2px 4px rgba(25,27,34,.1)',
  heroGlow: '0 18px 40px -12px rgba(255,100,69,.35)',
} as const;

// Logo files in public/images (reversed = white, for colored backgrounds).
export const logos = {
  white: '/images/ibc-final-logo-rev.png',
} as const;

export const platforms = {
  instagram: { w: 1080, h: 1080, label: 'Instagram' },
  facebook: { w: 1080, h: 1350, label: 'Facebook' },
  tiktok: { w: 1080, h: 1920, label: 'TikTok' },
  pinterest: { w: 1000, h: 1500, label: 'Pinterest' },
  x: { w: 1600, h: 900, label: 'X' },
} as const;
export type Platform = keyof typeof platforms;

// The 5 post themes — transcribed from the IBF design system's real post
// templates (screenshot reference). Each has a distinct layout + content angle,
// its own eyebrow, and a hashtag convention.
export const themes = [
  {
    key: 'by-numbers',
    name: 'By the Numbers',
    eyebrow: 'BY THE NUMBERS',
    layout: 'Cream/peach field, oversized orange stat, eyebrow above, subline below, logo.',
    angle: 'A headline stat (e.g. "1,200+ parishes & schools").',
    needsPhoto: false,
  },
  {
    key: 'spotlight',
    name: 'Spotlight',
    eyebrow: 'PRINCIPAL SPOTLIGHT',
    layout: 'Photo left, light quote card right with mode-color rule, name + school.',
    angle: 'A quote with an attributed person + photo.',
    needsPhoto: true,
  },
  {
    key: 'feature-list',
    name: 'Feature List',
    eyebrow: 'TURNKEY SYSTEM',
    layout: 'Bold headline + checkmark list (or resource grid) on white; accent rule.',
    angle: 'What is included / "we did the work so you don\'t have to."',
    needsPhoto: false,
  },
  {
    key: 'school-hero',
    name: 'Your School Hero',
    eyebrow: 'MAKE THE SWITCH',
    layout: 'Full-bleed photo + dark overlay, pill tag, headline with yellow shout, URL.',
    angle: 'The switch pitch ("Your book fair should reflect your school").',
    needsPhoto: true,
  },
  {
    key: 'switch-quote',
    name: 'Switch Quote',
    eyebrow: 'MAKE THE SWITCH',
    layout: 'Large testimonial quote on a tint, name + school, "SWITCHED · 2024" pill.',
    angle: 'A longer testimonial / decision story.',
    needsPhoto: true,
  },
] as const;
export type ThemeKey = (typeof themes)[number]['key'];
