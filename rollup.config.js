import fg from "fast-glob";
import rollupAutomountDOM from "rollup-plugin-automount-dom";
import rollupCopy from "rollup-plugin-copy";
import rollupDelete from "rollup-plugin-delete";
import rollupDev from "rollup-plugin-dev";
import rollupHTML from "@rollup/plugin-html";
import rollupMDX from "@mdx-js/rollup";
import { nodeResolve as rollupNodeResolve } from "@rollup/plugin-node-resolve";
import rollupTerser from "@rollup/plugin-terser";
import rollupURL from "@rollup/plugin-url";

const isWatch = process.env.ROLLUP_WATCH === "true";

const configs = fg.sync("*.mdx").map((input) => ({
  input,
  jsx: { mode: "automatic", jsxImportSource: "jsx-dom" },
  output: { dir: "build.tmp", format: "iife" },
  plugins: [
    rollupAutomountDOM(),
    rollupHTML({ fileName: input.replace(/mdx$/, "html"), title: "" }),
    rollupMDX({ jsxImportSource: "jsx-dom" }),
    rollupNodeResolve(),
    !isWatch && rollupTerser(),
    rollupURL({ fileName: "assets/[name]-[hash][extname]" }),
  ],
}));

// Plugins that should only run once
configs[0].plugins = [
  rollupCopy({ targets: [{ src: "public/*", dest: "build.tmp" }] }),
  rollupDelete({ targets: "build.tmp/*" }),
  rollupDev("build.tmp"),
  ...configs[0].plugins,
];

export default configs;
