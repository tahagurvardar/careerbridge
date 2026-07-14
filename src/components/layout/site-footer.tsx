import Link from "next/link";

import { Brand } from "@/components/shared/brand";
import { Separator } from "@/components/ui/separator";
import type { RouteLocale } from "@/i18n/config";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";

export async function SiteFooter({ locale }: { locale: RouteLocale }) {
  const { navigation, common } = await getDictionary(locale);
  const localize = (path: string) => localizeInternalPath(path, locale);

  const platformLinks = [
    { label: navigation.footer.browseJobs, href: localize("/jobs") },
    { label: navigation.footer.exploreCompanies, href: localize("/companies") },
    { label: navigation.footer.createAccount, href: localize("/register") },
  ];
  const accessLinks = [
    { label: navigation.footer.candidateAccess, href: localize("/login") },
    { label: navigation.footer.recruiterAccess, href: localize("/login") },
    { label: navigation.footer.join, href: localize("/register") },
  ];

  return (
    <footer className="bg-card border-t">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Brand href={localize("/")} ariaLabel={navigation.brandHomeAria} />
            <p className="text-muted-foreground mt-4 max-w-sm text-sm leading-6">
              {navigation.footer.description}
            </p>
          </div>
          <FooterLinkGroup
            title={navigation.footer.platform}
            links={platformLinks}
          />
          <FooterLinkGroup
            title={navigation.footer.access}
            links={accessLinks}
          />
        </div>
        <Separator className="my-8" />
        <div className="text-muted-foreground flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            {formatMessage(common.copyright, {
              year: new Date().getFullYear(),
            })}
          </p>
          <p>{common.footerTagline}</p>
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
