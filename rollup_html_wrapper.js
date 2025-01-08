import { basename } from "path";

function makeWrapper(scriptName) {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/style/eacs.css">
  </head>
  <body>
    <script type="module">
      import Content, * as metadata from "./${scriptName}";
      if (metadata.title) document.title = metadata.title
      document.body.appendChild(Content());
    </script>
  </body>
</html>
`
}

export default function() {
  return {
    name: "html-pages",
    async generateBundle(_, bundle) {
      for (const [name, chunk] of Object.entries(bundle)) {
        const htmlName = chunk.fileName.replace(/\.page\.js*$/, ".html");
        if (chunk.isEntry && htmlName != name) {
          this.debug(`Writing HTML for ${name}`);
          const html = makeWrapper(basename(chunk.fileName));
          this.emitFile({type: "asset", fileName: htmlName, source: html});
        }
      }
    },
  };
}
