import { getRequestConfig } from "next-intl/server";

const requestConfig = getRequestConfig(async () => ({
  locale: "cs",
  messages: (await import("@/messages/cs.json")).default,
}));

export default requestConfig;
