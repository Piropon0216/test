import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // 公開ビルド(site/)を毎回コミットする運用のため、ファイル名にコンテンツハッシュを
    // 付けない。ハッシュ付きだと再ビルドのたびにファイルが増減しリポジトリが肥大化する。
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
