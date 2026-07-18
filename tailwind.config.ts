import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Practice Field brand — per BRAND_SPEC_practice_field.md, sampled
        // from the official logo. brand-600 (#EC3D50) is THE brand red, the
        // single accent color per the logo's own "one accent on dark" logic
        // — buttons, active states, links. brand-700/red-deep (#C9384D) is
        // a deliberately distinct deeper red reserved for severity-critical
        // UI (FeedbackCard, VideoAnalysisCard), so "this is broken/urgent"
        // never wears the exact same red as "click me" on the same screen.
        brand: {
          50:  '#fdf1f2',
          100: '#fbe1e4',
          200: '#f7c3c9',
          300: '#f09aa5',
          400: '#f66b7a',
          500: '#f1526a',
          600: '#ec3d50',   // brand-red — primary accent/action (spec-authoritative)
          700: '#c9384d',   // brand-red-deep — severity-critical (spec-authoritative)
          800: '#a32e3f',
          900: '#7a2330',
          950: '#4a151d',
          // Named aliases from the spec's gradient stops + deep-red, for
          // direct/semantic use (bg-brand-navy, text-brand-red-deep, etc.)
          navy:      '#072743',
          plum:      '#33253f',
          maroon:    '#652945',
          'red-deep': '#c9384d',
        },
        // Dark plum-navy field palette — nudged toward the spec's "supporting
        // dark neutrals" (derived from the gradient family) from the prior
        // navy-only values, so app surfaces read as part of the same brand
        // family as the hero/auth gradient, not a disconnected dark theme.
        field: {
          dark:   '#0b0e1a',   // page background — deep plum-navy, not pure black
          card:   '#1c1830',   // card / panel bg  — lifted plum-dark
          border: '#3a3050',   // borders           — plum mid-tone
          muted:  '#a99fb5',   // secondary/muted text on dark — desaturated lilac-grey
        }
      },
      backgroundImage: {
        // The signature gradient (BRAND_SPEC §1) — hero/landing and auth
        // surfaces only. Dense app UI uses flat field-* surfaces instead so
        // content stays readable; this is an accent, not every background.
        'brand-gradient': 'linear-gradient(135deg, #072743 0%, #33253f 55%, #652945 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
