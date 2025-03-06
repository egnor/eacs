import Content, * as contentExports from "wrapped-module";

import "./eacs.css";
import "sanitize.css";

if (window.ESBUILD_LIVE) {
  const source = new EventSource("/esbuild");
  source.addEventListener("change", () => location.reload());
}

document.title = Object(contentExports)["title"] || "";
document.head.appendChild(<link rel="stylesheet" href="style/eacs.css" />);
document.body.appendChild(<Content />);
