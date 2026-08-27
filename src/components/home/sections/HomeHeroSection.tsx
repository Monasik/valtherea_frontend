"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./HomeHeroSection.module.scss";

const SERVER_IP = "play.valtherea.eu";
const DISCORD_URL = "https://discord.gg/valthereaeu";

export const HomeHeroSection = () => {
  const t = useTranslations("home.hero");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const handleCopyIp = async () => {
    try {
      await navigator.clipboard.writeText(SERVER_IP);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.panel}>
          <Image
            alt=""
            aria-hidden="true"
            className={styles.emblem}
            height={1254}
            priority
            src="/assets/figma/branding/server-emblem.png"
            width={1254}
          />
          <span className={styles.eyebrow}>{t("eyebrow")}</span>
          <h1 className={styles.title}>
            <span className={styles.visuallyHidden}>{t("title")}</span>
            <Image
              alt=""
              aria-hidden="true"
              className={styles.headline}
              height={92}
              priority
              src="/assets/figma/branding/hero-headline.png"
              width={891}
            />
          </h1>
          <p className={styles.description}>{t("description")}</p>

          <div className={styles.ipBlock} aria-label={t("ipLabel")}>
            <Image
              alt=""
              aria-hidden="true"
              className={styles.statusIcon}
              height={24}
              src="/assets/figma/icons/server-status.svg"
              width={24}
            />
            <div>
              <span className={styles.ipLabel}>{t("ipLabel")}</span>
              <strong className={styles.ipValue}>{SERVER_IP}</strong>
            </div>
            <button
              aria-live="polite"
              aria-label={t("copyIp")}
              className="button button--primary"
              onClick={handleCopyIp}
              type="button"
            >
              {copyState === "copied" ? t("copyDone") : t("copyIp")}
            </button>
          </div>
          {copyState === "failed" ? (
            <p className={styles.copyHint} role="status">{t("copyFailed")}</p>
          ) : null}

          <Link className={`${styles.featuredAction} button button--primary`} href="/store">
            {t("secondary")}
          </Link>
          <div className={styles.actions}>
            <Link className="button button--ghost" href="/rules">
              {t("primary")}
            </Link>
            <a className="button button--ghost" href={DISCORD_URL} rel="noreferrer" target="_blank">
              {t("discord")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
