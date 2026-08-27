export type GenericPageSlug =
  | "professions"
  | "market"
  | "worlds"
  | "community"
  | "vote"
  | "news"
  | "rules"
  | "legal"
  | "terms"
  | "privacy"
  | "cookies"
  | "refunds";

type GenericPageConfig = {
  metadataTitle: string;
  namespace: string;
  hero: { eyebrow?: string; title: string; description: string };
  cards: Array<{
    kicker?: string;
    title: string;
    description: string;
    listItems?: string[];
  }>;
};

export const genericPageMap: Record<GenericPageSlug, GenericPageConfig> = {
  professions: {
    metadataTitle: "Profese",
    namespace: "professions",
    hero: { eyebrow: "hero.eyebrow", title: "hero.title", description: "hero.description" },
    cards: [
      { title: "cards.0.title", description: "cards.0.description" },
      { title: "cards.1.title", description: "cards.1.description" },
      { title: "cards.2.title", description: "cards.2.description" }
    ]
  },
  market: {
    metadataTitle: "Ekonomika",
    namespace: "market",
    hero: { eyebrow: "hero.eyebrow", title: "hero.title", description: "hero.description" },
    cards: [
      { title: "cards.0.title", description: "cards.0.description" },
      { title: "cards.1.title", description: "cards.1.description", listItems: ["cards.1.list.0", "cards.1.list.1", "cards.1.list.2"] }
    ]
  },
  worlds: {
    metadataTitle: "Světy",
    namespace: "worlds",
    hero: { eyebrow: "hero.eyebrow", title: "hero.title", description: "hero.description" },
    cards: [
      { title: "cards.0.title", description: "cards.0.description" },
      { title: "cards.1.title", description: "cards.1.description" },
      { title: "cards.2.title", description: "cards.2.description" }
    ]
  },
  community: {
    metadataTitle: "Komunita",
    namespace: "community",
    hero: { eyebrow: "hero.eyebrow", title: "hero.title", description: "hero.description" },
    cards: [
      { title: "cards.0.title", description: "cards.0.description" },
      { title: "cards.1.title", description: "cards.1.description", listItems: ["cards.1.list.0", "cards.1.list.1", "cards.1.list.2"] }
    ]
  },
  vote: {
    metadataTitle: "Hlasování",
    namespace: "vote",
    hero: { eyebrow: "hero.eyebrow", title: "hero.title", description: "hero.description" },
    cards: [
      { title: "cards.0.title", description: "cards.0.description" },
      { title: "cards.1.title", description: "cards.1.description" },
      { title: "cards.2.title", description: "cards.2.description" }
    ]
  },
  news: {
    metadataTitle: "Novinky",
    namespace: "news",
    hero: { eyebrow: "hero.eyebrow", title: "hero.title", description: "hero.description" },
    cards: [
      { kicker: "cards.0.kicker", title: "cards.0.title", description: "cards.0.description" },
      { kicker: "cards.1.kicker", title: "cards.1.title", description: "cards.1.description" }
    ]
  },
  rules: {
    metadataTitle: "Pravidla",
    namespace: "rules",
    hero: { eyebrow: "hero.eyebrow", title: "hero.title", description: "hero.description" },
    cards: [
      { title: "cards.0.title", description: "cards.0.description", listItems: ["cards.0.list.0", "cards.0.list.1", "cards.0.list.2"] },
      { title: "cards.1.title", description: "cards.1.description", listItems: ["cards.1.list.0", "cards.1.list.1", "cards.1.list.2"] }
    ]
  },
  terms: {
    metadataTitle: "Obchodní podmínky",
    namespace: "terms",
    hero: { eyebrow: "hero.eyebrow", title: "hero.title", description: "hero.description" },
    cards: [
      { title: "cards.0.title", description: "cards.0.description", listItems: ["cards.0.list.0", "cards.0.list.1", "cards.0.list.2"] },
      { title: "cards.1.title", description: "cards.1.description", listItems: ["cards.1.list.0", "cards.1.list.1", "cards.1.list.2"] },
      { title: "cards.2.title", description: "cards.2.description", listItems: ["cards.2.list.0", "cards.2.list.1", "cards.2.list.2"] },
      { title: "cards.3.title", description: "cards.3.description", listItems: ["cards.3.list.0", "cards.3.list.1", "cards.3.list.2"] },
      { title: "cards.4.title", description: "cards.4.description", listItems: ["cards.4.list.0", "cards.4.list.1", "cards.4.list.2"] },
      { title: "cards.5.title", description: "cards.5.description", listItems: ["cards.5.list.0", "cards.5.list.1", "cards.5.list.2"] }
    ]
  },
  privacy: {
    metadataTitle: "Ochrana osobních údajů",
    namespace: "privacy",
    hero: { eyebrow: "hero.eyebrow", title: "hero.title", description: "hero.description" },
    cards: [
      { title: "cards.0.title", description: "cards.0.description", listItems: ["cards.0.list.0", "cards.0.list.1", "cards.0.list.2"] },
      { title: "cards.1.title", description: "cards.1.description", listItems: ["cards.1.list.0", "cards.1.list.1", "cards.1.list.2"] },
      { title: "cards.2.title", description: "cards.2.description", listItems: ["cards.2.list.0", "cards.2.list.1", "cards.2.list.2"] },
      { title: "cards.3.title", description: "cards.3.description", listItems: ["cards.3.list.0", "cards.3.list.1", "cards.3.list.2"] },
      { title: "cards.4.title", description: "cards.4.description", listItems: ["cards.4.list.0", "cards.4.list.1", "cards.4.list.2"] }
    ]
  },
  refunds: {
    metadataTitle: "Refundace a reklamace",
    namespace: "refunds",
    hero: { eyebrow: "hero.eyebrow", title: "hero.title", description: "hero.description" },
    cards: [
      { title: "cards.0.title", description: "cards.0.description", listItems: ["cards.0.list.0", "cards.0.list.1", "cards.0.list.2"] },
      { title: "cards.1.title", description: "cards.1.description", listItems: ["cards.1.list.0", "cards.1.list.1", "cards.1.list.2"] },
      { title: "cards.2.title", description: "cards.2.description", listItems: ["cards.2.list.0", "cards.2.list.1", "cards.2.list.2"] },
      { title: "cards.3.title", description: "cards.3.description", listItems: ["cards.3.list.0", "cards.3.list.1", "cards.3.list.2"] }
    ]
  },
  legal: {
    metadataTitle: "Právní informace",
    namespace: "legal",
    hero: { eyebrow: "hero.eyebrow", title: "hero.title", description: "hero.description" },
    cards: [
      { title: "cards.0.title", description: "cards.0.description", listItems: ["cards.0.list.0", "cards.0.list.1", "cards.0.list.2"] },
      { title: "cards.1.title", description: "cards.1.description", listItems: ["cards.1.list.0", "cards.1.list.1", "cards.1.list.2"] },
      { title: "cards.2.title", description: "cards.2.description", listItems: ["cards.2.list.0", "cards.2.list.1", "cards.2.list.2"] }
    ]
  },
  cookies: {
    metadataTitle: "Cookies",
    namespace: "cookies",
    hero: { eyebrow: "hero.eyebrow", title: "hero.title", description: "hero.description" },
    cards: [
      { title: "cards.0.title", description: "cards.0.description", listItems: ["cards.0.list.0", "cards.0.list.1", "cards.0.list.2"] },
      { title: "cards.1.title", description: "cards.1.description", listItems: ["cards.1.list.0", "cards.1.list.1", "cards.1.list.2"] },
      { title: "cards.2.title", description: "cards.2.description", listItems: ["cards.2.list.0", "cards.2.list.1", "cards.2.list.2"] }
    ]
  }
};
