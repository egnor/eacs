import Content, * as contentExports from "wrapped-module";

import "./eacs.css";
import "sanitize.css";

if (CHANGE_EVENT_URL) {
  const source = new EventSource(CHANGE_EVENT_URL);
  source.addEventListener("change", () => location.reload());
}

document.title = Object(contentExports)["title"] || "";
document.head.appendChild(<link rel="stylesheet" href="style/eacs.css" />);
document.body.appendChild(<Content />);
