import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageHero } from "@/components/shared/PageHero/PageHero";
import { PageShell } from "@/components/shared/PageShell/PageShell";

const NotFoundPage = () => {
  const t = useTranslations("notFound");

  return (
    <PageShell activePath="">
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <section className="section">
        <div className="container">
          <div className="cta-surface">
            <p>{t("body")}</p>
            <div className="button-row">
              <Link className="button button--primary" href="/">
                {t("primary")}
              </Link>
              <Link className="button button--secondary" href="/community">
                {t("secondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default NotFoundPage;
