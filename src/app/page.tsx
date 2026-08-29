'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Gamepad2,
  Trophy,
  Bot,
  Users,
  Swords,
  Coins,
  Cpu,
  ArrowRight,
  Wallet,
  Play,
  Star,
  Zap,
  Target,
  TrendingUp,
  Crown,
} from 'lucide-react';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' as const },
  }),
};

// Stats data
const stats = [
  { label: 'Total Players', value: '12,847', icon: Users },
  { label: 'Games Played', value: '1.2M', icon: Swords },
  { label: 'Tokens Distributed', value: '45.6M', icon: Coins },
  { label: 'Active Agents', value: '3,291', icon: Cpu },
];

// Featured games data
const featuredGames = [
  {
    title: 'Claw Machine',
    description: 'The classic arcade experience. Grab tokens, NFTs, and rare prizes with precision timing.',
    players: '4,521',
    reward: '100 $CLAW',
    difficulty: 'Medium',
    slug: 'claw-machine',
    gradient: 'from-green-500/20 to-emerald-500/5',
  },
  {
    title: 'Token Sniper',
    description: 'Fast-paced trading game. Buy low, sell high, and beat the market in 60 seconds.',
    players: '3,187',
    reward: '250 $CLAW',
    difficulty: 'Hard',
    slug: 'token-sniper',
    gradient: 'from-purple-500/20 to-violet-500/5',
  },
  {
    title: 'Block Builder',
    description: 'Stack blocks to build the tallest tower. One wrong move and it all comes crashing down.',
    players: '2,890',
    reward: '75 $CLAW',
    difficulty: 'Easy',
    slug: 'block-builder',
    gradient: 'from-yellow-500/20 to-amber-500/5',
  },
];

// How it works steps
const steps = [
  {
    step: '01',
    title: 'Play Games',
    description: 'Choose from our growing library of arcade games. Each game is provably fair with on-chain verification.',
    icon: Play,
    color: 'text-primary',
  },
  {
    step: '02',
    title: 'Earn Points',
    description: 'Score high to earn points on the leaderboard. Top players get bonus multipliers and exclusive rewards.',
    icon: Star,
    color: 'text-secondary',
  },
  {
    step: '03',
    title: 'Get Tokens',
    description: 'Convert your points into $CLAW and $ANSEM tokens. Hourly and weekly distributions to top performers.',
    icon: Coins,
    color: 'text-accent',
  },
];

// Leaderboard preview
const leaderboard = [
  { rank: 1, name: 'CryptoKing', score: 98450, change: '+2' },
  { rank: 2, name: 'ArcadeWolf', score: 87320, change: '-1' },
  { rank: 3, name: 'NeonQueen', score: 76100, change: '+5' },
  { rank: 4, name: 'TokenHunter', score: 71890, change: '0' },
  { rank: 5, name: 'BlockMaster', score: 68540, change: '+3' },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px]" />

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeInUp}
          >
            <Badge variant="default" className="mb-6 px-4 py-1.5">
              <Zap className="h-3 w-3 mr-1" />
              Live on Solana
            </Badge>
          </motion.div>

          <motion.h1
            className="font-arcade text-4xl sm:text-6xl lg:text-7xl text-primary glow-green tracking-wider mb-6"
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeInUp}
          >
            CLAWCADE
          </motion.h1>

          <motion.p
            className="text-xl sm:text-2xl text-foreground/80 font-light mb-4 max-w-2xl mx-auto"
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeInUp}
          >
            Play. Earn. Deploy Agents.
          </motion.p>

          <motion.p
            className="text-base text-muted-foreground mb-10 max-w-xl mx-auto"
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeInUp}
          >
            The crypto arcade where every game earns you real tokens.
            Climb leaderboards, compete for hourly rewards, and deploy AI agents
            to play on your behalf.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial="hidden"
            animate="visible"
            custom={4}
            variants={fadeInUp}
          >
            <Button size="xl">
              <Wallet className="h-5 w-5" />
              Connect Wallet
            </Button>
            <Link href="/games">
              <Button variant="outline" size="xl">
                <Play className="h-5 w-5" />
                Browse Games
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative border-y border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeInUp}
              >
                <stat.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Games */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeInUp}
          >
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Featured Games
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Choose your game, prove your skills, and earn $CLAW tokens.
              Every score is verified on-chain.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {featuredGames.map((game, i) => (
              <motion.div
                key={game.slug}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={scaleIn}
              >
                <Link href={`/games/${game.slug}`}>
                  <Card className="group h-full overflow-hidden cursor-pointer">
                    {/* Game preview area */}
                    <div
                      className={`h-40 bg-gradient-to-br ${game.gradient} flex items-center justify-center relative scanline-overlay`}
                    >
                      <Gamepad2 className="h-12 w-12 text-foreground/20 group-hover:text-primary/40 transition-colors" />
                      <Badge
                        variant="accent"
                        className="absolute top-3 right-3"
                      >
                        {game.difficulty}
                      </Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {game.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {game.description}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {game.players} playing
                        </span>
                        <span className="text-primary font-medium flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          {game.reward}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={3}
            variants={fadeInUp}
          >
            <Link href="/games">
              <Button variant="ghost" className="gap-2">
                View All Games
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 border-y border-border">
        <div className="absolute inset-0 gradient-radial opacity-50" />
        <div className="relative mx-auto max-w-5xl">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeInUp}
          >
            <h2 className="text-3xl font-bold text-foreground mb-3">
              How It Works
            </h2>
            <p className="text-muted-foreground">
              Three simple steps from player to token holder.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                className="relative text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={scaleIn}
              >
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
                )}

                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border border-border bg-card mb-5">
                  <step.icon className={`h-8 w-8 ${step.color}`} />
                </div>
                <div className="font-arcade text-xs text-muted-foreground mb-2">
                  STEP {step.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeInUp}
          >
            <h2 className="text-3xl font-bold text-foreground mb-3 flex items-center justify-center gap-3">
              <Trophy className="h-7 w-7 text-accent" />
              Top Players
            </h2>
            <p className="text-muted-foreground">
              This hour&apos;s leaderboard. Top 3 win $CLAW every hour.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            variants={fadeInUp}
          >
            <Card>
              <CardContent className="p-0">
                {leaderboard.map((player, i) => (
                  <div
                    key={player.rank}
                    className={`flex items-center gap-4 px-6 py-4 ${
                      i !== leaderboard.length - 1 ? 'border-b border-border' : ''
                    } ${player.rank <= 3 ? 'bg-primary/[0.02]' : ''}`}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center">
                      {player.rank === 1 ? (
                        <Crown className="h-5 w-5 text-accent mx-auto" />
                      ) : player.rank <= 3 ? (
                        <span className="text-accent font-bold font-mono">
                          {player.rank}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-mono">
                          {player.rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-bold text-foreground">
                        {player.name[0]}
                      </span>
                    </div>

                    {/* Name & Score */}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {player.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {player.score.toLocaleString()} pts
                      </p>
                    </div>

                    {/* Change */}
                    <div
                      className={`text-xs font-mono ${
                        player.change.startsWith('+')
                          ? 'text-primary'
                          : player.change === '0'
                          ? 'text-muted-foreground'
                          : 'text-destructive'
                      }`}
                    >
                      {player.change === '0' ? '—' : player.change}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            className="text-center mt-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
            variants={fadeInUp}
          >
            <Link href="/leaderboard">
              <Button variant="outline" className="gap-2">
                View Full Leaderboard
                <TrendingUp className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeInUp}
          >
            <Target className="h-10 w-10 text-primary mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to Play?
            </h2>
            <p className="text-muted-foreground mb-10 max-w-lg mx-auto">
              Connect your Solana wallet and start earning $CLAW tokens today.
              No deposits required — just play and earn.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="xl">
                <Wallet className="h-5 w-5" />
                Connect Wallet
              </Button>
              <Link href="/agents">
                <Button variant="secondary" size="xl">
                  <Bot className="h-5 w-5" />
                  Deploy an Agent
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
