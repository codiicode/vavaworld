import {
  Inter,
  Manrope,
  Plus_Jakarta_Sans,
  Space_Grotesk,
  Playfair_Display,
  Cormorant_Garamond,
  DM_Sans,
} from 'next/font/google';
import { GeistSans } from 'geist/font/sans';

// next/font requires each loader to be called at module scope and assigned to
// a const — not inline inside an object literal — so it can statically analyse
// and prebundle the fonts at build time.
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});
const space = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'] });
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

export const FONTS = {
  geist: { name: 'Geist (current)', kind: 'sans', font: GeistSans },
  inter: { name: 'Inter', kind: 'sans', font: inter },
  manrope: { name: 'Manrope', kind: 'sans', font: manrope },
  jakarta: { name: 'Plus Jakarta Sans', kind: 'sans', font: jakarta },
  space: { name: 'Space Grotesk', kind: 'sans', font: space },
  dm: { name: 'DM Sans', kind: 'sans', font: dmSans },
  playfair: { name: 'Playfair Display', kind: 'serif', font: playfair },
  cormorant: { name: 'Cormorant Garamond', kind: 'serif', font: cormorant },
} as const;

export type FontKey = keyof typeof FONTS;
