import { useTranslations } from "next-intl";
import styles from "./HomeHighlightsSection.module.scss";

export const HomeHighlightsSection = () => {
  const t = useTranslations("home.highlights");
  const cards = [0, 1, 2] as const;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2>{t("title")}</h2>
        <p className={styles.description}>{t("description")}</p>
        <div className={styles.grid}>
          {cards.map((card) => (
            <article className={styles.card} key={card}>
              <span>{t(`cards.${card}.kicker`)}</span>
              <h3>{t(`cards.${card}.title`)}</h3>
              <p>{t(`cards.${card}.description`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
