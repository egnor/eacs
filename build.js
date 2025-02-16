#!/usr/bin/env -S node --no-deprecation

import { deleteAsync } from "del";
import esbuild from "esbuild";
import esbuildMdx from "@mdx-js/esbuild";
import { htmlPlugin as esbuildHtml } from "@craftamap/esbuild-plugin-html";
import fg from "fast-glob";

const outDir = "build.tmp";
const pageLayoutSource = "page_layout.jsx";
const pageContentSources = await fg(["*.mdx"]);

await deleteAsync("build.tmp");

await Promise.all([
  esbuild.build({
    entryPoints: ["eacs.css"],
    bundle: true,
    loader: { ".otf": "copy" },
    outdir: `${outDir}/style`,
  }),

  ...pageContentSources.map((pageContentSource) => esbuild.build({
    entryPoints: [pageLayoutSource],
    bundle: true,
    format: "iife",
    inject: [pageContentSource],
    jsxImportSource: "jsx-dom",
    jsx: "automatic",
    metafile: true,
    outdir: outDir,
    plugins: [
      esbuildMdx({ jsxImportSource: "jsx-dom" }),
      esbuildHtml({
        files: [{
          entryPoints: [pageLayoutSource],
          filename: pageContentSource.replace(/\.mdx?$/, ".html"),
          inline: true,
        }],
      }),
    ],
  }))
]);
