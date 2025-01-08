import copy from "rollup-plugin-copy";
import del from "rollup-plugin-delete";
import dev from "rollup-plugin-dev";
import fg from "fast-glob";
import mdx from "@mdx-js/rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import url from "@rollup/plugin-url";

import htmlWrapper from "./rollup_html_wrapper.js";

export default {
  input: fg.sync("*.page.mdx"),
  output: { dir: "build.tmp", format: "es" },
  plugins: [
    copy({ targets: [{ src: "public/*", dest: "build.tmp" }] }),
    del({ targets: "build.tmp/*" }),
    dev("build.tmp"),
    htmlWrapper(),
    mdx({ jsxImportSource: "jsx-dom" }),
    nodeResolve(),
    terser(),
    url({ fileName: "assets/[name]-[hash][extname]" }),
  ],
};
