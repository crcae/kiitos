/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      // Culinary Canvas - Gastronomy Color Palette
      colors: {
        culinary: {
          saffron: '#E67E22',
          'saffron-dark': '#D35400',
          'cast-iron': '#2C3E50',
          'oat-cream': '#FDFBF7',
          'stone-grey': '#F0EFEB',
          'deep-charcoal': '#1F2933',
          'surface-dark': '#2D3748',
          albahaca: '#27AE60',
          curcuma: '#F39C12',
          chile: '#C0392B',
        },
        // Kiitos Brand Colors
        kiitos: {
          orange: '#f89219',
          black: '#111827',
          green: '#10B981',
          cream: '#FFF7ED',
        },
        // Keeping existing gray scale for compatibility
        gray: {
          50: '#F7F7F7',
          100: '#F0F0F0',
          200: '#E5E5E5',
          300: '#D1D1D1',
          400: '#A0A0A0',
          500: '#767676',
          600: '#5E5E5E',
          700: '#484848',
          800: '#222222',
          900: '#1A1A1A',
        },
      },
      // Airbnb typography
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
        '5xl': ['48px', { lineHeight: '1' }],
      },
      // Airbnb shadows (soft elevation)
      boxShadow: {
        'airbnb-sm': '0 2px 4px rgba(0, 0, 0, 0.08)',
        'airbnb-md': '0 6px 16px rgba(0, 0, 0, 0.12)',
        'airbnb-lg': '0 8px 28px rgba(0, 0, 0, 0.15)',
        'airbnb-xl': '0 16px 48px rgba(0, 0, 0, 0.18)',
      },
      // Rounded corners
      borderRadius: {
        'airbnb-sm': '8px',
        'airbnb-md': '12px',
        'airbnb-lg': '16px',
        'airbnb-xl': '24px',
        'airbnb-full': '9999px',
      },
      // Spacing adjustments for generous white space
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}
