import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.sashaai",
  appName: "Sasha AI",
  webDir: "native-shell",
  server: {
    url: "https://sashaai.lovable.app",
    cleartext: false,
  },
};

export default config;
