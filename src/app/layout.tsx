import type { Metadata } from "next";
import {
  Afacad,
  Cormorant_Garamond,
  Montserrat,
  Oxanium,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Providers } from "@/components/providers/Providers";
import "@/styles/globals.scss";

const headingFont = Oxanium({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700", "800"],
});

const bodyFont = Afacad({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const accentFont = Montserrat({
  subsets: ["latin"],
  variable: "--font-accent",
  weight: ["500", "600", "700", "800"],
});

const interfaceFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-interface",
  weight: ["500", "600", "700", "800"],
});

const brandFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Valtherea",
    template: "%s | Valtherea",
  },
  description:
    "Fantasy Minecraft server s jasným onboardingem, komunitou a přehledným webem pro hráče.",
  icons: {
    icon: [{ url: "/assets/figma/branding/favicon.png", type: "image/png" }],
    shortcut: "/assets/figma/branding/favicon.png",
  },
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const RootLayout = async ({ children }: RootLayoutProps) => {
  const messages = await getMessages();

  return (
    <html lang="cs" suppressHydrationWarning>
      <body
        className={`${headingFont.variable} ${bodyFont.variable} ${accentFont.variable} ${interfaceFont.variable} ${brandFont.variable}`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
