import styles from "./InfoCard.module.scss";

type InfoCardProps = {
  title: string;
  description: string;
  kicker?: string;
  featured?: boolean;
  listItems?: string[];
};

export const InfoCard = ({
  title,
  description,
  kicker,
  featured = false,
  listItems
}: InfoCardProps) => (
  <article className={`${styles.card} ${featured ? styles.featured : ""}`}>
    {kicker ? <span className={styles.kicker}>{kicker}</span> : null}
    <h2 className={styles.title}>{title}</h2>
    <p className={styles.description}>{description}</p>
    {listItems?.length ? (
      <ul className={styles.list}>
        {listItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : null}
  </article>
);
