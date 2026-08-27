import { useTranslations } from "next-intl";
import styles from "./HomeStartSection.module.scss";

export const HomeStartSection = () => {
  const t = useTranslations("home.start");
  const steps = [0, 1, 2, 3] as const;

  return (
    <section className={styles.section} id="join">
      <div className={styles.inner}>
        <h2>{t("title")}</h2>
        <p className={styles.description}>{t("description")}</p>
        <div className={styles.grid}>
          {steps.map((step, index) => (
            <article className={styles.card} key={step}>
              <strong className={styles.number}>{index + 1}.</strong>
              <span className={styles.kicker}>{t(`steps.${step}.kicker`).replace(/^\d+\.\s*/, "")}</span>
              <h3>{t(`steps.${step}.title`)}</h3>
              <p>{t(`steps.${step}.description`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
