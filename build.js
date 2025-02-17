#!/usr/bin/env -S node --no-deprecation
import { Command } from "commander";
import { deleteAsync } from "del";
import esbuild from "esbuild";
import esbuildAddWrapper from "./esbuild_plugin_add_wrapper.js";
import esbuildMdx from "@mdx-js/esbuild";
import { htmlPlugin as esbuildHtml } from "@craftamap/esbuild-plugin-html";
import fg from "fast-glob";
import path from "node:path";

const opts = new Command()
  .option("--debug", "Add debug logging")
  .option("--no-minify", "Do not minify Javascript")
  .option("--serve", "Run dev server")
  .parse().opts();

const outdir = "build.tmp";
const pages = await fg(["*.mdx"]);
const htmlFiles = pages.map(p => ({
  entryPoints: { includes(v) { return v.endsWith(p); } },
  filename: p.replace(/\.mdx$/, ".html"),
  inline: true,
}));

const context = await esbuild.context({
  bundle: true,
  define: { "window.ESBUILD_LIVE_RELOAD": JSON.stringify(opts.serve || false) },
  entryPoints: [...pages, { in: "eacs.css", out: "style/eacs" }],
  format: "iife",
  jsxImportSource: "jsx-dom",
  jsx: "automatic",
  loader: { ".otf": "copy" },
  logLevel: opts.debug ? "debug" : "info",
  metafile: true,
  minify: opts.minify,
  outdir,
  plugins: [
    esbuildAddWrapper({
      filter: /.*\.mdx/, loader: "jsx", wrapper: "./page_layout.jsx"
    }),
    esbuildMdx({ jsxImportSource: "jsx-dom" }),
    esbuildHtml({ files: htmlFiles }),
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
