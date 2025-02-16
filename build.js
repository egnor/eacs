#!/usr/bin/env -S node --no-deprecation

import path from "node:path";

import { deleteAsync } from "del";
import esbuild from "esbuild";
import esbuildMdx from "@mdx-js/esbuild";
import { htmlPlugin as esbuildHtml } from "@craftamap/esbuild-plugin-html";
import fg from "fast-glob";

const outdir = "build.tmp";
const pageLayoutSource = "page_layout.jsx";
const pageSources = await fg(["*.mdx"]);

await deleteAsync("build.tmp");

await Promise.all([
  esbuild.build({
    entryPoints: [{ in: "eacs.css", out: "style/eacs" }],
    bundle: true,
    loader: { ".otf": "copy" },
    outdir,
  }),

  ...pageSources.map((page) => {
    const outbase = path.format({ ...path.parse(page), base: "", ext: "" });
    return esbuild.build({
      entryPoints: [{ in: pageLayoutSource, out: outbase }],
      bundle: true,
      format: "iife",
      alias: { content: `./${page}` },
      jsxImportSource: "jsx-dom",
      jsx: "automatic",
      metafile: true,
      outdir,
      plugins: [
        esbuildMdx({ jsxImportSource: "jsx-dom" }),
        esbuildHtml({
          files: [{
            entryPoints: [pageLayoutSource],
            filename: `${outbase}.html`,
          }],
        }),
      ],
    });
  })
]);
