/** @type {import('tailwindcss').Config} */
function withOpacity(variableName, fallback) {
  return ({ opacityValue }) => {
    const color = fallback ? `var(${variableName}, ${fallback})` : `var(${variableName})`;
    if (opacityValue !== undefined) {
      return `color-mix(in srgb, ${color}, transparent ${Math.round((1 - opacityValue) * 100)}%)`;
    }
    return color;
  };
}

module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			serif: ['Playfair Display', 'serif'],
  			sans: ['Manrope', 'sans-serif'],
  			mono: ['JetBrains Mono', 'monospace'],
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			rpg: {
  				void: withOpacity('--rpg-void'),
  				surface: withOpacity('--rpg-surface'),
  				'surface-hover': withOpacity('--rpg-surface-hover'),
  				'surface-active': withOpacity('--rpg-surface-active'),
  				gold: withOpacity('--rpg-gold'),
  				'gold-hover': withOpacity('--rpg-gold-hover'),
  				crimson: withOpacity('--rpg-crimson'),
  				ic: withOpacity('--rpg-ic', 'var(--rpg-gold)'),
  				ooc: withOpacity('--rpg-ooc', 'var(--muted-foreground)'),
  				success: withOpacity('--rpg-success', '#22C55E'),
  				info: withOpacity('--rpg-info', '#3B82F6'),
  				onyx: withOpacity('--rpg-void', '#0F0F0F'),
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		boxShadow: {
  			'rpg-gold': '0 0 20px rgba(212, 175, 55, 0.2)',
  			'rpg-glow': '0 0 15px rgba(212, 175, 55, 0.1)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};