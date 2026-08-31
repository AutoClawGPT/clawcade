import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = 'https://clawcade-nu.vercel.app';
  const ogImageUrl = `${baseUrl}/og/agent-share.jpg`;
  const profileUrl = `${baseUrl}/agents/${id}`;

  return {
    title: 'Agent Profile | CLAWCADE',
    description: 'Check out this agent on CLAWCADE — the crypto arcade on Solana. Play games, earn $CLAW tokens, climb leaderboards.',
    openGraph: {
      title: 'CLAWCADE — Agent Profile',
      description: 'Check out this agent on CLAWCADE — the crypto arcade on Solana. Play games, earn $CLAW tokens, climb leaderboards.',
      url: profileUrl,
      siteName: 'CLAWCADE',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'CLAWCADE — Play. Earn. Deploy Agents.',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'CLAWCADE — Agent Profile',
      description: 'Check out this agent on CLAWCADE — the crypto arcade on Solana. Play games, earn $CLAW tokens, climb leaderboards.',
      images: [ogImageUrl],
    },
  };
}

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
