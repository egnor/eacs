import * as esbuild from "esbuild";
import fs from "node:fs";
import { dirname } from "node:path";
import process from "node:process";

export default function esbuildAddWrapper({
  filter = /.*/, loader, innerName = "wrapped-module", wrapper
}) {
  const name = `add-wrapper:${wrapper}`.replace("|", ":");
  const resolveDir = process.cwd();

  return {
    name,

    setup(build) {
      build.onResolve({ filter }, async ({ path, namespace, ...args }) => {
        const namespaceParts = namespace.split("|");
        if (namespaceParts.indexOf(name) >= 0) return undefined;

        namespace = [name, ...namespaceParts].join("|");
        const innerOptions = { ...args, namespace };
        const innerFound = await build.resolve(path, innerOptions);
        if (innerFound.errors.length > 0) {
          innerFound.errors.push({ text: "Couldn't resolve wrapped module" });
          return innerFound;
        }

        const wrapperOptions = { kind: "entry-point", namespace, resolveDir };
        const wrapperFound = await build.resolve(wrapper, wrapperOptions);
        if (wrapperFound.errors.length > 0) {
          wrapperFound.errors.push({ text: "Couldn't resolve module wrapper" });
          return wrapperFound;
        }

        return {
          ...wrapperFound,
          namespace: name,
          pluginData: innerFound,
          suffix: `?${innerFound.namespace}:${innerFound.path}`,
        };
      });

      const loadFilter = { filter: /.*/, namespace: name };
      build.onLoad(loadFilter, async ({ path, pluginData, suffix }) => {
        return {
          contents: await fs.promises.readFile(path, "utf8"),
          loader,
          pluginData,
          resolveDir: dirname(path),
          watchFiles: [path],
        };
      });

      const innerFilter = {
        filter: new RegExp(`^${innerName.replace(/(?=\W)/g, "\\")}$`),
        namespace: name,
      };
      build.onResolve(innerFilter, ({ pluginData }) => pluginData);
    },
  };
};
