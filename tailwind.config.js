/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"SF Pro Display"', '"SF Pro Text"', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        shell: {
          light: '#f4f5f7',
          dark: '#111214',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.68)',
          dark: 'rgba(24, 25, 29, 0.72)',
        },
        stroke: {
          light: 'rgba(23, 23, 26, 0.08)',
          dark: 'rgba(255, 255, 255, 0.08)',
        },
        ink: {
          light: '#17171c',
          dark: '#f5f5f7',
        },
        mist: {
          light: '#6b6d76',
          dark: '#9b9ea8',
        },
        accent: {
          DEFAULT: '#111827',
          soft: '#eef1f4',
        },
        success: '#1f9d63',
        warning: '#d97706',
        danger: '#e5484d',
        info: '#2563eb',
      },
      boxShadow: {
        panel:
          '0 24px 60px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
        panelDark:
          '0 30px 80px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      keyframes: {
        pulsebar: {
          '0%, 100%': { transform: 'scaleY(0.35)', opacity: '0.35' },
          '50%': { transform: 'scaleY(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulsebar: 'pulsebar 1.1s ease-in-out infinite',
        slideUp: 'slideUp 180ms ease-out',
      },
    },
  },
  plugins: [],
}
