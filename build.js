#!/usr/bin/env -S node --no-deprecation

import { deleteAsync } from "del";
import esbuild from "esbuild";
import esbuildMdx from "@mdx-js/esbuild";
import { htmlPlugin as esbuildHtml } from "@craftamap/esbuild-plugin-html";
import fg from "fast-glob";

await deleteAsync("build.tmp");

const pageInputs = await fg(["*.mdx"]);

await esbuild.build({
  entryPoints: [
    ...pageInputs,
    { in: "eacs.css", out: "style/eacs.css" },
  ],
  bundle: true,
  format: "iife",
  jsxImportSource: "jsx-dom",
  jsx: "automatic",
  loader: {
    ".otf": "copy",
  },
  metafile: true,
  outdir: "build.tmp",
  plugins: [
    esbuildMdx({ jsxImportSource: "jsx-dom" }),
    esbuildHtml({
      files: pageInputs.map((path) => ({
        entryPoints: [path],
        filename: path.replace(/\.mdx?$/, ".html"),
        inline: true,
      })),
    }),
  ],
});
