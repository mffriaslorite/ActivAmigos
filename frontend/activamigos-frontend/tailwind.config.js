/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      // Accessible color palette with high contrast ratios
      colors: {
        // Primary colors with high contrast
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',  // Main primary color
          600: '#0284c7',  // Focus/hover state
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Semantic colors with sufficient contrast
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        // High contrast theme
        'high-contrast': {
          bg: '#000000',
          text: '#ffffff',
          border: '#ffffff',
          accent: '#ffff00',
        }
      },
      // Typography with accessibility in mind
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.6' }],      // 16px minimum
        'lg': ['1.125rem', { lineHeight: '1.6' }],    // 18px
        'xl': ['1.25rem', { lineHeight: '1.6' }],     // 20px
        '2xl': ['1.5rem', { lineHeight: '1.5' }],     // 24px
        '3xl': ['1.875rem', { lineHeight: '1.4' }],   // 30px
        '4xl': ['2.25rem', { lineHeight: '1.3' }],    // 36px
        '5xl': ['3rem', { lineHeight: '1.2' }],       // 48px
        // Large text variants for accessibility
        'large-base': ['1.25rem', { lineHeight: '1.6' }],  // 20px
        'large-lg': ['1.5rem', { lineHeight: '1.6' }],     // 24px
        'large-xl': ['1.75rem', { lineHeight: '1.5' }],    // 28px
      },
      // Spacing for touch targets (minimum 44px)
      spacing: {
        '11': '2.75rem',  // 44px
        '13': '3.25rem',  // 52px
        '15': '3.75rem',  // 60px
      },
      // Focus ring utilities
      ringWidth: {
        '3': '3px',
        '4': '4px',
      },
      // Animation with reduced motion support
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // Custom accessibility plugin
    function({ addUtilities, theme }) {
      const newUtilities = {
        // High contrast mode utilities
        '.high-contrast': {
          backgroundColor: theme('colors.high-contrast.bg'),
          color: theme('colors.high-contrast.text'),
          borderColor: theme('colors.high-contrast.border'),
        },
        // Focus utilities for keyboard navigation
        '.focus-visible-ring': {
          '&:focus-visible': {
            outline: 'none',
            ringWidth: '3px',
            ringColor: theme('colors.primary.600'),
            ringOffset: '2px',
          },
        },
        // Touch target utilities
        '.touch-target': {
          minHeight: '44px',
          minWidth: '44px',
        },
        // Screen reader only content
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0',
        },
        // Reduced motion preferences
        '@media (prefers-reduced-motion: reduce)': {
          '.animate-fade-in, .animate-slide-up, .animate-pulse-slow': {
            animation: 'none',
          },
        },
      }
      addUtilities(newUtilities)
    }
  ],
  // Enable high contrast mode
  media: {
    'high-contrast': '(prefers-contrast: high)',
  },
}