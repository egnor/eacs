import Content, * as contentExports from "content";

if (contentExports.title) document.title = contentExports.title;
document.head.appendChild(<link rel="stylesheet" href="style/eacs.css" />);
document.body.appendChild(<Content />);
