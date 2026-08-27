"use client";

import {
  ChakraProvider,
  LocaleProvider,
  defaultSystem,
} from "@chakra-ui/react";

type ProvidersProps = Readonly<{
  children: React.ReactNode;
}>;

export const Providers = ({ children }: ProvidersProps) => (
  <ChakraProvider value={defaultSystem}>
    <LocaleProvider locale="cs-CZ">{children}</LocaleProvider>
  </ChakraProvider>
);
