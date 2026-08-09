/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,jsx,mdx}',
    './components/**/*.{js,jsx,mdx}',
    './app/**/*.{js,jsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        brand: {
          DEFAULT: 'hsl(217, 91%, 60%)',
          light: 'hsl(217, 100%, 75%)',
          dark: 'hsl(217, 91%, 45%)',
          purple: 'hsl(262, 83%, 58%)',
          cyan: 'hsl(172, 66%, 50%)',
          gold: 'hsl(43, 96%, 56%)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease forwards',
        'slide-up': 'slideUp 0.5s ease forwards',
        'slide-in-left': 'slideInLeft 0.5s ease forwards',
        'slide-in-right': 'slideInRight 0.5s ease forwards',
        'scale-in': 'scaleIn 0.4s ease forwards',
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'gradient-shift': 'gradientShift 6s ease infinite',
        'spin-slow': 'spin-slow 12s linear infinite',
        'orb-1': 'orb-move-1 12s ease-in-out infinite',
        'orb-2': 'orb-move-2 15s ease-in-out infinite',
        'orb-3': 'orb-move-3 18s ease-in-out infinite',
        'border-pulse': 'borderPulse 2s ease-in-out infinite',
        'bounce-slow': 'bounce 3s ease-in-out infinite',
        'count-up': 'countUp 0.6s ease forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 hsl(217 91% 60% / 0.4)' },
          '50%': { boxShadow: '0 0 20px 8px hsl(217 91% 60% / 0.15)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'orb-move-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(40px, -30px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.95)' },
        },
        'orb-move-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(-35px, 25px) scale(1.05)' },
          '66%': { transform: 'translate(30px, -20px) scale(0.9)' },
        },
        'orb-move-3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(20px, 35px) scale(0.95)' },
          '66%': { transform: 'translate(-40px, -15px) scale(1.1)' },
        },
        borderPulse: {
          '0%, 100%': { borderColor: 'hsl(217 91% 60% / 0.3)' },
          '50%': { borderColor: 'hsl(217 91% 60% / 0.7)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundSize: {
        '200': '200% 100%',
        '400': '400% 400%',
      },
      boxShadow: {
        'glow-sm': '0 0 10px hsl(217 91% 60% / 0.2)',
        'glow': '0 0 20px hsl(217 91% 60% / 0.3), 0 0 60px hsl(217 91% 60% / 0.1)',
        'glow-lg': '0 0 40px hsl(217 91% 60% / 0.4), 0 0 80px hsl(217 91% 60% / 0.15)',
        'glow-purple': '0 0 20px hsl(262 83% 58% / 0.3), 0 0 60px hsl(262 83% 58% / 0.1)',
        'glow-cyan': '0 0 20px hsl(172 66% 50% / 0.3), 0 0 60px hsl(172 66% 50% / 0.1)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 20px 40px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};