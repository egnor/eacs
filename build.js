#!/usr/bin/env -S node --no-deprecation

import { Command } from "commander";
import esbuild from "esbuild";
import esbuildAddWrapper from "esbuild-plugin-add-wrapper";
import esbuildCleanOutDir from "esbuild-plugin-clean-outdir";
import esbuildMdx from "@mdx-js/esbuild";
import { htmlPlugin as esbuildHtml } from "@craftamap/esbuild-plugin-html";
import fg from "fast-glob";
import recmaJsxIfFor from "recma-plugin-jsx-if-for";

process.chdir(import.meta.dirname);

const flags = new Command()
  .option("--minify", "Minimize Javascript", false)
  .option("--serve", "Run dev server on localhost", false)
  .parse().opts();

const pages = await fg(["page.*"]);
const outdir = "build.tmp";
const jsxImportSource = "jsx-dom";

const esbuildOptions = {
  absWorkingDir: process.cwd(),
  assetNames: "[dir]/[name]-[hash]",
  bundle: true,
  define: { CHANGE_EVENT_URL: JSON.stringify(flags.serve && "/esbuild") },
  entryPoints: [...pages, { in: "eacs.css", out: "style/eacs" }],
  jsxImportSource,
  jsx: "automatic",
  loader: { ".otf": "copy" },
  logLevel: "info",
  metafile: true,
  minify: flags.minify,
  outdir,
  plugins: [
    esbuildAddWrapper({ filter: /\.mdx/, wrapper: "./page_wrapper.jsx" }),
    esbuildCleanOutDir(),
    esbuildMdx({ jsx: true, jsxImportSource, recmaPlugins: [recmaJsxIfFor] }),
    esbuildHtml({
      files: pages.map(p => ({
        entryPoints: { includes(v) { return v.endsWith(p); } },
        filename: p.split(".").slice(1, -1).join(".") + ".html",
        inline: true,
      })),
    }),
  ],
};

if (flags.serve) {
  const context = await esbuild.context(esbuildOptions);
  await context.watch();
  await context.serve({ host: "localhost", servedir: outdir });
} else {
  await esbuild.build(esbuildOptions);
}
