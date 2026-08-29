import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';

const footerLinks = {
  Platform: [
    { label: 'Games', href: '/games' },
    { label: 'Leaderboard', href: '/leaderboard' },
    { label: 'Rewards', href: '/rewards' },
    { label: 'Agents', href: '/agents' },
  ],
  Resources: [
    { label: 'Documentation', href: '/docs' },
    { label: 'API', href: '/api-docs' },
    { label: 'Blog', href: '/blog' },
  ],
  Community: [
    { label: 'Discord', href: 'https://discord.gg/clawcade' },
    { label: 'Twitter', href: 'https://twitter.com/clawcade' },
    { label: 'GitHub', href: 'https://github.com/clawcade' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <span className="font-arcade text-xs text-primary glow-green">
                CLAWCADE
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              The crypto arcade where playing games earns you real tokens.
              Deploy agents. Climb leaderboards. Win big.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {title}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} CLAWCADE. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Built on</span>
            <span className="text-secondary font-medium">Solana</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
