/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // BICE Hipotecaria Brand Colors
        bice: {
          navy: '#003A70',           // Pantone 654 C — primary corporate blue
          'navy-dark': '#002a52',    // Darker navy for hover/active
          'navy-light': '#1a5a9e',  // Lighter navy for backgrounds
          'navy-tint': '#e8f0f8',   // Very light navy tint for backgrounds
          cyan: '#00ABC8',           // Pantone 3125 C — secondary accent cyan
          'cyan-light': '#5cc9dd',  // Lighter cyan for secondary accents
          'cyan-tint': '#e6f7fa',   // Very light cyan tint for backgrounds
          // Semantic colors
          success: '#1d8e6e',
          'success-bg': '#e3f4ee',
          warning: '#b8761b',
          'warning-bg': '#fbf1de',
          alert: '#c0392b',
          'alert-bg': '#fbe7e3',
        },
        // Neutrals (cool greys to harmonize with navy)
        slate: {
          50: '#f9fafb',
          100: '#f3f4f6',
          150: '#eef1f5',  // custom: lighter
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Open Sans', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'section-enter': 'section-enter 0.28s ease-out',
        'spin': 'spin 1s linear infinite',
        'slide': 'slide 1.5s ease-in-out infinite',
      },
      keyframes: {
        'section-enter': {
          'from': { opacity: '0', transform: 'translateY(4px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'spin': {
          'to': { transform: 'rotate(360deg)' },
        },
        'slide': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}