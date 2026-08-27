import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { AdminPanelSection } from "@/components/admin/sections/AdminPanelSection";
import { AccountStatusSection } from "@/components/account/sections/AccountStatusSection";
import { LoginFlowSection } from "@/components/login/sections/LoginFlowSection";
import { PageHero } from "@/components/shared/PageHero/PageHero";
import { InfoGrid } from "@/components/shared/InfoGrid/InfoGrid";
import { StaticPageTemplate } from "@/components/shared/StaticPageTemplate/StaticPageTemplate";
import { PageShell } from "@/components/shared/PageShell/PageShell";
import { StoreShowcaseSection } from "@/components/store/sections/StoreShowcaseSection";
import { TeamRosterSection } from "@/components/team/sections/TeamRosterSection";
import { genericPageMap, type GenericPageSlug } from "@/lib/constants/staticPages";

type RouteParams = Promise<{ slug: string }>;
type RouteProps = { params: RouteParams };

const isGenericPageSlug = (slug: string): slug is GenericPageSlug =>
  slug in genericPageMap;

export const generateMetadata = async ({
  params,
}: RouteProps): Promise<Metadata> => {
  const { slug } = await params;

  if (slug === "store") return { title: "Store" };
  if (slug === "team") return { title: "A-Team" };
  if (slug === "login") return { title: "Přihlášení" };
  if (slug === "account") return { title: "Můj účet" };
  if (slug === "admin") return { title: "Admin panel" };
  if (slug === "checkout-success") return { title: "Ověření platby" };
  if (isGenericPageSlug(slug)) return { title: genericPageMap[slug].metadataTitle };

  return {};
};

const DynamicPage = async ({ params }: RouteProps) => {
  const { slug } = await params;

  if (isGenericPageSlug(slug)) {
    return (
      <PageShell activePath={`/${slug}`}>
        <StaticPageTemplate config={genericPageMap[slug]} />
      </PageShell>
    );
  }

  if (slug === "team") {
    return (
      <PageShell activePath="/team">
        <TeamPage />
      </PageShell>
    );
  }

  if (slug === "store") {
    return (
      <PageShell activePath="/store">
        <StorePage />
      </PageShell>
    );
  }

  if (slug === "login") {
    return (
      <PageShell activePath="/login">
        <LoginPage />
      </PageShell>
    );
  }

  if (slug === "account") {
    return (
      <PageShell activePath="/account">
        <AccountPage />
      </PageShell>
    );
  }

  if (slug === "admin") {
    return (
      <PageShell activePath="/admin">
        <AdminPage />
      </PageShell>
    );
  }

  if (slug === "checkout-success") {
    return (
      <PageShell activePath="/checkout-success">
        <CheckoutSuccessPage />
      </PageShell>
    );
  }

  notFound();
};

const TeamPage = () => {
  const t = useTranslations("team");

  return (
    <>
      <PageHero
        description={t("hero.description")}
        title={t("hero.title")}
        variant="team"
      />
      <InfoGrid
        variant="team"
        items={[
          { title: t("overview.0.title"), description: t("overview.0.description") },
          { title: t("overview.1.title"), description: t("overview.1.description") },
          { title: t("overview.2.title"), description: t("overview.2.description") },
        ]}
      />
      <TeamRosterSection title={t("roster.title")} description={t("roster.description")} />
    </>
  );
};

const StorePage = () => {
  const t = useTranslations("store");

  return (
    <>
      <PageHero
        description={t("hero.description")}
        title={t("hero.title")}
      />
      <StoreShowcaseSection title={t("catalog.title")} description={t("catalog.description")} />
      <InfoGrid
        variant="store"
        items={[
          { kicker: t("essentials.0.kicker"), title: t("essentials.0.title"), description: t("essentials.0.description") },
          { kicker: t("essentials.1.kicker"), title: t("essentials.1.title"), description: t("essentials.1.description") },
          { kicker: t("essentials.2.kicker"), title: t("essentials.2.title"), description: t("essentials.2.description") },
        ]}
      />
    </>
  );
};

const LoginPage = () => {
  const t = useTranslations("login");

  return (
    <>
      <StaticPageTemplate
        config={{
          metadataTitle: "Přihlášení",
          namespace: "login",
          hero: {
            eyebrow: "hero.eyebrow",
            title: "hero.title",
            description: "hero.description",
          },
          cards: [
            {
              kicker: "summary.0.kicker",
              title: "summary.0.title",
              description: "summary.0.description",
            },
            {
              kicker: "summary.1.kicker",
              title: "summary.1.title",
              description: "summary.1.description",
            }
          ]
        }}
      />
      <LoginFlowSection title={t("flow.title")} description={t("flow.description")} />
    </>
  );
};

const AccountPage = () => {
  const t = useTranslations("account");

  return (
    <>
      <StaticPageTemplate
        config={{
          metadataTitle: "Můj účet",
          namespace: "account",
          hero: {
            eyebrow: "hero.eyebrow",
            title: "hero.title",
            description: "hero.description",
          },
          cards: [
            {
              kicker: "summary.0.kicker",
              title: "summary.0.title",
              description: "summary.0.description",
            },
            {
              kicker: "summary.1.kicker",
              title: "summary.1.title",
              description: "summary.1.description",
            },
            {
              kicker: "summary.2.kicker",
              title: "summary.2.title",
              description: "summary.2.description",
            }
          ]
        }}
      />
      <AccountStatusSection title={t("status.title")} description={t("status.description")} />
    </>
  );
};

const CheckoutSuccessPage = () => (
  <StaticPageTemplate
    config={{
      metadataTitle: "Ověření platby",
      namespace: "checkoutSuccess",
      hero: {
        eyebrow: "hero.eyebrow",
        title: "hero.title",
        description: "hero.description",
      },
      cards: [
        { title: "cards.0.title", description: "cards.0.description" },
        { title: "cards.1.title", description: "cards.1.description" }
      ],
      cta: {
        title: "cta.title",
        description: "cta.description",
        primaryHref: "/account",
        primaryLabel: "cta.primaryLabel",
        secondaryHref: "/store",
        secondaryLabel: "cta.secondaryLabel",
      }
    }}
  />
);

const AdminPage = () => <AdminPanelSection />;

export default DynamicPage;
