import imagemin from "imagemin";
import imageminWebp from "imagemin-webp";
import path, { resolve } from "path";
import { defineConfig } from "vite";
import glob from "fast-glob";
import { fileURLToPath } from "url";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import handlebars from "vite-plugin-handlebars";
import { createSvgIconsPlugin } from "vite-plugin-svg-icons";

const htmlTransformPlugin = () => {
  let config;
  return {
    name: "html-transform",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    transformIndexHtml(html) {
      if (config.command === "build") {
        const regex = /src\/pages\//g;
        const regexImg = /..\/img/g;
        let newString = html.replaceAll(regex, "");
        return newString.replaceAll(regexImg, "/assets/images");
      }
    },
  };
};
export default defineConfig({
  plugins: [
    htmlTransformPlugin(),

    {
      name: "remove-src-dir-from-html-path",
      enforce: "post",
      generateBundle(_, bundle) {
        const htmlFileInSrcFolderPattern = /^src\/pages\/.*\.html$/;
        for (const outputItem of Object.values(bundle)) {
          if (!htmlFileInSrcFolderPattern.test(outputItem.fileName)) {
            continue;
          }
          outputItem.fileName = outputItem.fileName.replace(
            "../img",
            "/assets/images/"
          );
          outputItem.fileName = outputItem.fileName.replace("src/pages/", "");
        }
      },
    },
    createSvgIconsPlugin({
      iconDirs: [path.resolve(process.cwd(), "src/icons_sprite")],
      symbolId: "icon-[name]",
      customDomId: "__svg__icons__dom__",
    }),
    handlebars({
      partialDirectory: resolve(__dirname, "src/html/partials"),
    }),
    ViteImageOptimizer({
      input: "/src/images/**/*.{jpg,png,jpeg}",
      output: "/assets/images",
      png: {
        quality: 100,
      },
      jpeg: {
        quality: 70,
      },
      jpg: {
        quality: 70,
      },
      recursive: true,
    }),
    {
      ...imagemin(["./src/images/**/*.{jpg,png,jpeg}"], {
        destination: "./src/images/webp/",
        plugins: [imageminWebp({ quality: 70 })],
      }),
      apply: "serve",
    },
  ],
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: Object.fromEntries(
        glob
          .sync(["./*.html", "./src/pages/**/*.html"])
          .map((file) => [
            path.relative(
              __dirname,
              file.slice(0, file.length - path.extname(file).length)
            ),
            fileURLToPath(new URL(file, import.meta.url)),
          ])
      ),
      output: {
        chunkFileNames: "assets/js/main-[hash].js",
        entryFileNames: "assets/js/main-[hash].js",

        assetFileNames: ({ name }) => {
          if (/\.(gif|jpe?g|png|svg)$/.test(name ?? "")) {
            return "assets/images/[name][extname]";
          }
          if (/\.(woff|woff2|ttf|eot)$/.test(name ?? "")) {
            return "assets/fonts/[name][extname]";
          }

          if (/\.css$/.test(name ?? "")) {
            return "assets/css/main-[hash][extname]";
          }

          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  resolve: {},
});
