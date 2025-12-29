import type { Config } from 'tailwindcss'

export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            maxWidth: {
                content: '720px',
                'content-narrow': '500px',
                'content-wide': '1200px'
            },
            screens: {
                'xs': '320px',
                'sm': '640px',
                'md': '768px',
                'lg': '1024px',
                'xl': '1280px',
                '2xl': '1536px',
            },
            spacing: {
                'safe-top': 'env(safe-area-inset-top)',
                'safe-bottom': 'env(safe-area-inset-bottom)',
                'safe-left': 'env(safe-area-inset-left)',
                'safe-right': 'env(safe-area-inset-right)',
            },
            minHeight: {
                'touch': '44px',  // iOS touch target minimum
            },
            minWidth: {
                'touch': '44px',
            }
        }
    },
    plugins: []
} satisfies Config

