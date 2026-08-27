import { useTranslations } from "next-intl";
import { CtaBand } from "@/components/shared/CtaBand/CtaBand";

export const HomeJoinSection = () => {
  const t = useTranslations("home.join");

  return (
    <section id="join">
      <CtaBand
        description={t("description")}
        primaryHref="https://discord.gg/valthereaeu"
        primaryLabel={t("primary")}
        secondaryHref="/account"
        secondaryLabel={t("secondary")}
        title={t("title")}
      />
    </section>
  );
};
