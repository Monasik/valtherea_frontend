import { useTranslations } from "next-intl";
import Image from "next/image";
import { teamRoster } from "@/lib/constants/teamRoster";
import styles from "./TeamRosterSection.module.scss";

type TeamRosterSectionProps = {
  title: string;
  description: string;
};

export const TeamRosterSection = ({ title, description }: TeamRosterSectionProps) => {
  const t = useTranslations("team.roles");

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>
        <div className={styles.grid}>
          {teamRoster.flatMap((entry) => {
            const members: readonly string[] = entry.members.length
              ? entry.members
              : [t("empty")];

            return members.map((member) => {
              const isEmpty = !entry.members.length;

              return (
                <article
                  className={`${styles.card} ${isEmpty ? styles.cardEmpty : ""}`}
                  data-role={entry.id}
                  key={`${entry.id}-${member}`}
                >
                  <div className={styles.characterWrap}>
                    <Image
                      alt=""
                      aria-hidden="true"
                      className={styles.character}
                      height={350}
                      src="/assets/figma/team/member-character.png"
                      width={350}
                    />
                  </div>
                  <h3 className={styles.memberName}>{member}</h3>
                  <span className={styles.role}>{t(`${entry.translationKey}.title`)}</span>
                  <p className={styles.roleDescription}>{t(`${entry.translationKey}.description`)}</p>
                </article>
              );
            });
          })}
        </div>
      </div>
    </section>
  );
};
