import { useTranslations } from "next-intl";
import { CtaBand } from "@/components/shared/CtaBand/CtaBand";
import { InfoGrid, type InfoGridItem } from "@/components/shared/InfoGrid/InfoGrid";
import { PageHero } from "@/components/shared/PageHero/PageHero";
import styles from "./FigmaStaticPage.module.scss";

type PageCardConfig = {
  title: string;
  description: string;
  kicker?: string;
  listItems?: string[];
};

type StaticPageTemplateProps = {
  config: {
    metadataTitle: string;
    namespace: string;
    hero: {
      eyebrow?: string;
      title: string;
      description: string;
    };
    cards: PageCardConfig[];
    cta?: {
      title: string;
      description: string;
      primaryHref: string;
      primaryLabel: string;
      secondaryHref?: string;
      secondaryLabel?: string;
    };
  };
};

export const StaticPageTemplate = ({ config }: StaticPageTemplateProps) => {
  const t = useTranslations(config.namespace);

  const items: InfoGridItem[] = config.cards.map((card, index) => ({
    featured: index === 0,
    kicker: card.kicker ? t(card.kicker) : undefined,
    title: t(card.title),
    description: t(card.description),
    listItems: card.listItems?.map((item) => t(item))
  }));

  if (["market", "vote", "news", "rules"].includes(config.namespace)) {
    return (
      <div className={`${styles.page} ${styles[config.namespace]}`}>
        <PageHero
          title={t(config.hero.title)}
          description={t(config.hero.description)}
        />

        {config.namespace === "market" || config.namespace === "rules" ? (
          <section className={styles.cards}>
            {config.cards.map((card) => (
              <article className={styles.card} key={card.title}>
                <h2>{t(card.title)}</h2>
                <span aria-hidden="true" className={styles.cardLine} />
                <p>{t(card.description)}</p>
                {card.listItems?.length ? (
                  <ul>
                    {card.listItems.map((item) => <li key={item}>{t(item)}</li>)}
                  </ul>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}

        {config.namespace === "vote" ? (
          <section className={styles.votePortals} aria-labelledby="vote-portals-title">
            <h2 id="vote-portals-title">VOTE PORTÁLY</h2>
            <div className={styles.voteGrid}>
              <article className={styles.voteCard}>
                <h3>Craftlist</h3>
                <small>craftlist.cz</small>
                <p>Klikni na tlačítko a otevři hlasovací stránku Valtherea. Po odeslání hlasu se vrať do hry pro odměnu.</p>
                <a href="https://craftlist.org/" rel="noreferrer" target="_blank">HLASOVAT <span aria-hidden="true">→</span></a>
              </article>
              <article className={styles.voteCard}>
                <h3>MinecraftServery.eu</h3>
                <small>MinecraftServery.eu</small>
                <p>Klikni na tlačítko a otevři hlasovací stránku Valtherea. Po odeslání hlasu se vrať do hry pro odměnu.</p>
                <a href="https://minecraftservery.eu/" rel="noreferrer" target="_blank">HLASOVAT <span aria-hidden="true">→</span></a>
              </article>
            </div>
            <div className={styles.voteNotes}>
              <span>Hlasuj a získej odměny</span>
              <span>Hlasovat můžeš jednou denně</span>
            </div>
          </section>
        ) : null}

        {config.namespace === "news" ? <div className={styles.newsPattern} aria-hidden="true" /> : null}
      </div>
    );
  }

  return (
    <>
      <PageHero
        title={t(config.hero.title)}
        description={t(config.hero.description)}
      />
      <InfoGrid
        columns={items.length > 2 ? 3 : 2}
        items={items}
        variant={config.namespace === "account" ? "account" : "default"}
      />
      {config.cta ? (
        <CtaBand
          description={t(config.cta.description)}
          primaryHref={config.cta.primaryHref}
          primaryLabel={t(config.cta.primaryLabel)}
          secondaryHref={config.cta.secondaryHref}
          secondaryLabel={config.cta.secondaryLabel ? t(config.cta.secondaryLabel) : undefined}
          title={t(config.cta.title)}
        />
      ) : null}
    </>
  );
};
