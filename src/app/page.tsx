import type { Metadata } from "next";
import { HomeHighlightsSection } from "@/components/home/sections/HomeHighlightsSection";
import { HomeHeroSection } from "@/components/home/sections/HomeHeroSection";
import { HomeJoinSection } from "@/components/home/sections/HomeJoinSection";
import { HomeStartSection } from "@/components/home/sections/HomeStartSection";
import { PageShell } from "@/components/shared/PageShell/PageShell";

export const metadata: Metadata = {
  title: "Minecraft server a komunita",
};

const HomePage = () => (
  <PageShell activePath="/">
    <HomeHeroSection />
    <HomeStartSection />
    <HomeHighlightsSection />
    <HomeJoinSection />
  </PageShell>
);

export default HomePage;
