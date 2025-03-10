#!/usr/bin/env -S node --no-deprecation

import { Command } from "commander";
import { deleteAsync } from "del";
import esbuild from "esbuild";
import esbuildAddWrapper from "esbuild-plugin-add-wrapper";
import esbuildMdx from "@mdx-js/esbuild";
import { htmlPlugin as esbuildHtml } from "@craftamap/esbuild-plugin-html";
import fg from "fast-glob";
import recmaJsxIfFor from "recma-jsx-if-for";

process.chdir(import.meta.dirname);

const opts = new Command()
  .option("--debug", "Add debug logging")
  .option("--dev", "Run dev server")
  .parse().opts();

const pages = await fg(["page.*"]);
const outdir = "build.tmp";
const jsxImportSource = "jsx-dom";

const esbuildOptions = {
  absWorkingDir: process.cwd(),
  assetNames: "[dir]/[name]-[hash]",
  bundle: true,
  define: { ESBUILD_LIVE: JSON.stringify(opts.dev || false) },
  entryPoints: [...pages, { in: "eacs.css", out: "style/eacs" }],
  jsxImportSource,
  jsx: "automatic",
  loader: { ".otf": "copy" },
  logLevel: opts.debug ? "debug" : "info",
  metafile: true,
  minify: !opts.dev,
  outdir,
  plugins: [
    esbuildAddWrapper({ filter: /\.mdx/, wrapper: "./page_wrapper.jsx" }),
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

await deleteAsync(outdir);

if (opts.dev) {
  const context = await esbuild.context(esbuildOptions);
  await context.watch();
  await context.serve({ host: "localhost", servedir: outdir });
} else {
  await esbuild.build(esbuildOptions);
}
