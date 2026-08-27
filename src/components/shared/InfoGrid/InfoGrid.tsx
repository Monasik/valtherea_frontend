import { InfoCard } from "@/components/shared/InfoCard/InfoCard";
import styles from "./InfoGrid.module.scss";

export type InfoGridItem = {
  title: string;
  description: string;
  kicker?: string;
  featured?: boolean;
  listItems?: string[];
};

type InfoGridProps = {
  items: InfoGridItem[];
  columns?: 2 | 3 | 4;
  variant?: "default" | "team" | "account" | "store";
};

export const InfoGrid = ({ items, columns = 3, variant = "default" }: InfoGridProps) => (
  <section className={`${styles.section} ${styles[variant]}`}>
    <div className={styles.inner}>
      <div className={styles.grid} data-columns={columns}>
        {items.map((item) => (
          <InfoCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  </section>
);
