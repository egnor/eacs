console.log(content);

export default (props) => {
  if (props.title) document.title = props.title;
  document.head.appendChild(<link rel="stylesheet" href="/style/eacs.css" />);
  return <>{props.children}</>;
}
