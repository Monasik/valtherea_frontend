import styles from "./PageHero.module.scss";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  headingLevel?: "h1" | "h2";
  variant?: "default" | "team";
};

export const PageHero = ({
  eyebrow,
  title,
  description,
  headingLevel = "h1",
  variant = "default",
}: PageHeroProps) => {
  const Heading = headingLevel;

  return (
    <section className={`${styles.section} ${variant === "team" ? styles.team : ""}`}>
      <div className={styles.inner}>
        <div className={styles.surface}>
          {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
          <div className={styles.headingRow}>
            <span aria-hidden="true" className={styles.line} />
            <Heading className={styles.title}>{title}</Heading>
            <span aria-hidden="true" className={styles.line} />
          </div>
          <p className={styles.description}>{description}</p>
        </div>
      </div>
    </section>
  );
};
