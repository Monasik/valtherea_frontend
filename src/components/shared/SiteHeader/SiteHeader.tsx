"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { navigationItems } from "@/lib/constants/navigation";
import styles from "./SiteHeader.module.scss";

type SiteHeaderProps = {
  activePath: string;
};

export const SiteHeader = ({ activePath }: SiteHeaderProps) => {
  const t = useTranslations("navigation");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className={`${styles.header} ${activePath === "/" ? styles.homeHeader : ""}`}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/">
          <Image
            alt=""
            aria-hidden="true"
            className={styles.logo}
            height={48}
            priority
            src="/assets/figma/branding/favicon.png"
            width={48}
          />
          <span className={styles.brandText}>
            <strong className={styles.brandTitle}>Valtherea</strong>
            <span className={styles.brandMeta}>valtherea.eu</span>
          </span>
        </Link>

        <button
          aria-controls="site-navigation"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Zavřít menu" : "Otevřít menu"}
          className={styles.menuButton}
          onClick={() => setIsMenuOpen((current) => !current)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          aria-label={t("aria")}
          className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ""}`}
          id="site-navigation"
        >
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              className={`${styles.navLink} ${activePath === item.href ? styles.navLinkActive : ""}`}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
            >
              {t(item.labelKey)}
            </Link>
          ))}

          <Link
            aria-current={activePath === "/account" ? "page" : undefined}
            className={`${styles.mobileAccount} ${activePath === "/account" ? styles.accountActive : ""}`}
            href="/account"
            onClick={() => setIsMenuOpen(false)}
          >
            {t("account")}
          </Link>
        </nav>

        <div className={styles.desktopActions}>
          <Link aria-label={t("store")} className={styles.cartLink} href="/store">
            <Image alt="" height={22} src="/assets/figma/icons/cart.png" width={22} />
          </Link>
          <Link
            aria-current={activePath === "/account" ? "page" : undefined}
            className={`${styles.account} ${activePath === "/account" ? styles.accountActive : ""}`}
            href="/account"
          >
            {t("account")}
          </Link>
        </div>
      </div>
    </header>
  );
};
