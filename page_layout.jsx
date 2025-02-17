import Content, * as contentExports from "wrapped-module";

document.title = Object(contentExports)["title"] || "";
document.head.appendChild(<link rel="stylesheet" href="style/eacs.css" />);
document.body.appendChild(<Content />);

if (window.ESBUILD_LIVE_RELOAD) {
  const source = new EventSource("/esbuild");
  source.addEventListener("change", () => location.reload());
}
