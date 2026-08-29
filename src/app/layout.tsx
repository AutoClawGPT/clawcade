import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CLAWCADE — Play. Earn. Deploy Agents.',
    template: '%s | CLAWCADE',
  },
  description:
    'The crypto arcade platform on Solana. Play games, earn $CLAW tokens, climb leaderboards, and deploy autonomous agents.',
  keywords: [
    'crypto gaming',
    'Solana',
    'arcade',
    'play to earn',
    'CLAWCADE',
    '$CLAW',
    'agents',
  ],
  openGraph: {
    title: 'CLAWCADE — Play. Earn. Deploy Agents.',
    description:
      'The crypto arcade platform on Solana. Play games, earn $CLAW tokens, and deploy autonomous agents.',
    siteName: 'CLAWCADE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CLAWCADE — Play. Earn. Deploy Agents.',
    description:
      'The crypto arcade platform on Solana. Play games, earn $CLAW tokens, and deploy autonomous agents.',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="min-h-screen bg-background font-sans antialiased flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
