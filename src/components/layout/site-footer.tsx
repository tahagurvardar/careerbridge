import Link from "next/link";

import { Brand } from "@/components/shared/brand";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="bg-card border-t">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Brand />
            <p className="text-muted-foreground mt-4 max-w-sm text-sm leading-6">
              {siteConfig.description} Built for candidates, recruiters, and the
              teams supporting them.
            </p>
          </div>
          <FooterLinkGroup
            title="Platform"
            links={siteConfig.footerNavigation.platform}
          />
          <FooterLinkGroup
            title="Access"
            links={siteConfig.footerNavigation.access}
          />
        </div>
        <Separator className="my-8" />
        <div className="text-muted-foreground flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CareerBridge. All rights reserved.</p>
          <p>Building better routes to meaningful work.</p>
        </div>
      </div>
    </footer>
  );
}

interface FooterLinkGroupProps {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}

function FooterLinkGroup({ title, links }: FooterLinkGroupProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <Link
              href={link.href}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
