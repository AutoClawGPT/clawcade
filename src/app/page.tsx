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
  ArrowRight,
  Wallet,
  Play,
  Star,
  Zap,
  Target,
  TrendingUp,
  Coins,
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

// Featured games data — real slugs
const featuredGames = [
  {
    title: 'Crypto Smash',
    description: 'Smash matching crypto tiles in this fast-paced puzzle game. Chain combos for bonus points.',
    difficulty: 'Easy',
    slug: 'crypto-smash',
    gradient: 'from-green-500/20 to-emerald-500/5',
  },
  {
    title: 'Chomper',
    description: 'Navigate the maze, chomp pellets, and avoid ghosts in this crypto-themed arcade classic.',
    difficulty: 'Medium',
    slug: 'chomper',
    gradient: 'from-purple-500/20 to-violet-500/5',
  },
  {
    title: 'Swarm',
    description: 'Control a swarm of units to conquer territory and defeat rival swarms in real time.',
    difficulty: 'Hard',
    slug: 'swarm',
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
            <Link href="/register">
              <Button size="xl">
                <Wallet className="h-5 w-5" />
                Get Started
              </Button>
            </Link>
            <Link href="/dashboard/games">
              <Button variant="outline" size="xl">
                <Play className="h-5 w-5" />
                Browse Games
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Earn Tokens CTA */}
      <section className="relative border-y border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">Earn tokens by playing games</p>
            <p className="text-sm text-muted-foreground mt-1">Top players win $CLAW rewards every hour</p>
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
                        <span className="text-primary font-medium">
                          {game.difficulty}
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
            <Link href="/dashboard/games">
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

      {/* Leaderboard CTA */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeInUp}
          >
            <h2 className="text-3xl font-bold text-foreground mb-3 flex items-center justify-center gap-3">
              <Trophy className="h-7 w-7 text-accent" />
              Leaderboard
            </h2>
            <p className="text-muted-foreground mb-6">
              Compete with players worldwide. Top performers win $CLAW rewards every hour.
            </p>
            <Link href="/dashboard/leaderboard">
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
              <Link href="/register">
                <Button size="xl">
                  <Wallet className="h-5 w-5" />
                  Get Started
                </Button>
              </Link>
              <Link href="/dashboard/agents">
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
