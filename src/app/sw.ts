import { defaultCache } from "@serwist/next/worker";
import { installSerwist } from "@serwist/sw";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const self: any;

installSerwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});
