import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import styles from "./SiteFooter.module.scss";

const exploreLinks = [
  { href: "/", labelKey: "home" },
  { href: "/community", labelKey: "community" },
  { href: "/account", labelKey: "account" },
  { href: "/store", labelKey: "store" }
];

const legalLinks = [
  { href: "/legal", labelKey: "legal" },
  { href: "/terms", labelKey: "terms" },
  { href: "/privacy", labelKey: "privacy" },
  { href: "/cookies", labelKey: "cookies" },
  { href: "/refunds", labelKey: "refunds" }
];

export const SiteFooter = () => {
  const t = useTranslations("footer");

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.brandColumn}>
            <div className={styles.brandLockup}>
              <Image
                alt={`${t("title")}.eu`}
                className={styles.wordmark}
                height={92}
                src="/assets/figma/branding/hero-headline.png"
                width={891}
              />
            </div>
            <p className={styles.copy}>{t("description")}</p>
            <p className={styles.trust}>{t("trust")}</p>
          </div>
          <div>
            <h3 className={styles.listTitle}>{t("exploreTitle")}</h3>
            <div className={styles.links}>
              {exploreLinks.map((link) => (
                <Link className={styles.link} href={link.href} key={link.href}>
                  {t(link.labelKey)}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className={styles.listTitle}>{t("legalTitle")}</h3>
            <div className={styles.links}>
              {legalLinks.map((link) => (
                <Link className={styles.link} href={link.href} key={link.href}>
                  {t(link.labelKey)}
                </Link>
              ))}
              <a className={styles.link} href="mailto:support@valtherea.eu">
                {t("supportEmail")}
              </a>
            </div>
          </div>
        </div>
        <div className={styles.meta}>
          <p>{t("operator")}</p>
          <p>{t("disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
};
