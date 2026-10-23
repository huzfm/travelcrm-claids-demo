import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',

        // Card
        card: {
          DEFAULT: 'rgb(var(--color-card) / <alpha-value>)',
          foreground: 'rgb(var(--color-card-foreground) / <alpha-value>)',
        },

        // Popover
        popover: {
          DEFAULT: 'rgb(var(--color-popover) / <alpha-value>)',
          foreground: 'rgb(var(--color-popover-foreground) / <alpha-value>)',
        },

        // Primary - Brand Red
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
          light: 'rgb(var(--color-primary-light) / <alpha-value>)',
        },

        // Secondary
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
          foreground: 'rgb(var(--color-secondary-foreground) / <alpha-value>)',
        },

        // Muted
        muted: {
          DEFAULT: 'rgb(var(--color-muted) / <alpha-value>)',
          foreground: 'rgb(var(--color-muted-foreground) / <alpha-value>)',
        },

        // Accent - Ink
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          foreground: 'rgb(var(--color-accent-foreground) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
        },

        // Graphite (legacy "gold" slot)
        gold: {
          DEFAULT: 'rgb(var(--color-gold) / <alpha-value>)',
          light: 'rgb(var(--color-gold-light) / <alpha-value>)',
          dark: 'rgb(var(--color-gold-dark) / <alpha-value>)',
        },

        // Status Colors - Lead Pipeline
        status: {
          new: 'rgb(var(--color-status-new) / <alpha-value>)',
          contacted: 'rgb(var(--color-status-contacted) / <alpha-value>)',
          qualified: 'rgb(var(--color-status-qualified) / <alpha-value>)',
          proposal: 'rgb(var(--color-status-proposal) / <alpha-value>)',
          negotiation: 'rgb(var(--color-status-negotiation) / <alpha-value>)',
          confirmed: 'rgb(var(--color-status-confirmed) / <alpha-value>)',
          lost: 'rgb(var(--color-status-lost) / <alpha-value>)',
          followup: 'rgb(var(--color-status-followup) / <alpha-value>)',
        },

        // Semantic Colors
        success: {
          DEFAULT: 'rgb(var(--color-success) / <alpha-value>)',
          light: 'rgb(var(--color-success-light) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning) / <alpha-value>)',
          light: 'rgb(var(--color-warning-light) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--color-destructive) / <alpha-value>)',
          foreground: 'rgb(var(--color-destructive-foreground) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'rgb(var(--color-error) / <alpha-value>)',
          light: 'rgb(var(--color-error-light) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--color-info) / <alpha-value>)',
          light: 'rgb(var(--color-info-light) / <alpha-value>)',
        },

        // WhatsApp Specific
        'wa-green': {
          DEFAULT: 'rgb(var(--color-wa-green) / <alpha-value>)',
          dark: 'rgb(var(--color-wa-green-dark) / <alpha-value>)',
        },
        'wa-chat-bg': 'rgb(var(--color-wa-chat-bg) / <alpha-value>)',
        'wa-outbound-bubble': 'rgb(var(--color-wa-outbound-bubble) / <alpha-value>)',
        'wa-inbound-bubble': 'rgb(var(--color-wa-inbound-bubble) / <alpha-value>)',

        // Text Colors
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',

        // Border & Input
        border: 'rgb(var(--color-border) / <alpha-value>)',
        input: 'rgb(var(--color-input) / <alpha-value>)',
        ring: 'rgb(var(--color-ring) / <alpha-value>)',

        // Sidebar
        sidebar: {
          DEFAULT: 'rgb(var(--color-sidebar) / <alpha-value>)',
          foreground: 'rgb(var(--color-sidebar-foreground) / <alpha-value>)',
          primary: 'rgb(var(--color-sidebar-primary) / <alpha-value>)',
          'primary-foreground': 'rgb(var(--color-sidebar-primary-foreground) / <alpha-value>)',
          accent: 'rgb(var(--color-sidebar-accent) / <alpha-value>)',
          'accent-foreground': 'rgb(var(--color-sidebar-accent-foreground) / <alpha-value>)',
          border: 'rgb(var(--color-sidebar-border) / <alpha-value>)',
          ring: 'rgb(var(--color-sidebar-ring) / <alpha-value>)',
        },

        // Chart colors
        chart: {
          1: 'rgb(var(--color-chart-1) / <alpha-value>)',
          2: 'rgb(var(--color-chart-2) / <alpha-value>)',
          3: 'rgb(var(--color-chart-3) / <alpha-value>)',
          4: 'rgb(var(--color-chart-4) / <alpha-value>)',
          5: 'rgb(var(--color-chart-5) / <alpha-value>)',
          6: 'rgb(var(--color-chart-6) / <alpha-value>)',
        },

        // Pipeline stage colors
        stage: {
          fresh: 'rgb(var(--color-stage-fresh) / <alpha-value>)',
          followup: 'rgb(var(--color-stage-followup) / <alpha-value>)',
          hot: 'rgb(var(--color-stage-hot) / <alpha-value>)',
          warm: 'rgb(var(--color-stage-warm) / <alpha-value>)',
          won: 'rgb(var(--color-stage-won) / <alpha-value>)',
          lost: 'rgb(var(--color-stage-lost) / <alpha-value>)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        brand: 'var(--shadow-brand)',
        'brand-lg': 'var(--shadow-brand-lg)',
        'brand-xl': 'var(--shadow-brand-xl)',
      },
    },
  },
  plugins: [],
} satisfies Config;
