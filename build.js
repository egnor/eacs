#!/usr/bin/env -S node --no-deprecation

import { Command } from "commander";
import { deleteAsync } from "del";
import esbuild from "esbuild";
import esbuildAddWrapper from "esbuild-plugin-add-wrapper";
import esbuildMdx from "@mdx-js/esbuild";
import { htmlPlugin as esbuildHtml } from "@craftamap/esbuild-plugin-html";
import fg from "fast-glob";
import recmaJsxIfFor from "recma-plugin-jsx-if-for";
import process from "node:process";

process.chdir(import.meta.dirname);

const opts = new Command()
  .option("--debug", "Add debug logging")
  .option("--no-minify", "Do not minify Javascript")
  .option("--serve", "Run dev server")
  .parse().opts();

const pages = await fg(["*.mdx"]);
const outdir = "build.tmp";

const context = await esbuild.context({
  absWorkingDir: process.cwd(),
  bundle: true,
  define: { ESBUILD_LIVE: JSON.stringify(opts.serve || false) },
  entryPoints: [...pages, { in: "eacs.css", out: "style/eacs" }],
  jsxImportSource: "jsx-dom",
  jsx: "automatic",
  loader: { ".otf": "copy" },
  logLevel: opts.debug ? "debug" : "info",
  metafile: true,
  minify: opts.minify,
  outdir,
  plugins: [
    esbuildAddWrapper({
      filter: /\.mdx/, loader: "jsx", wrapper: "./page_wrapper.jsx"
    }),
    esbuildMdx({
      jsx: true, jsxImportSource: "jsx-dom", recmaPlugins: [recmaJsxIfFor]
    }),
    esbuildHtml({
      files: pages.map(p => ({
        entryPoints: { includes(v) { return v.endsWith(p); } },
        filename: p.replace(/\.mdx$/, ".html"),
        inline: true,
      })),
    }),
  ],
});

await deleteAsync(outdir);

if (opts.serve) {
  await context.watch();
  await context.serve({ host: "localhost", servedir: outdir });
} else {
  const result = await context.rebuild();
  context.dispose();
}
