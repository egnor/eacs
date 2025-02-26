import * as estreeWalker from "estree-walker"; 
import * as estreeToJs from "estree-util-to-js";
import Debug from "debug";
import { VFileMessage } from "vfile-message";

const debug = Debug("recma-jsx-if-for");

export default function recmaJsxIfFor() {
  return (tree) => {
    console.log("=== recmaJsxIfFor ===");
    console.log(tree);

    estreeWalker.walk(tree, {
      leave(node, ...args) {
        const handler = nodeTypeHandlers[node.type];
        if (handler) handler(node, ...args);
      },
    });
  }
}

function unparse(tree) {
  return estreeToJs.toJs(tree, { handlers: estreeToJs.jsx }).value;
}

function fail(text, node) {
  var place;
  if (node?.loc) {
    place = {
      start: { ...node.loc.start, offset: 0 },
      end: { ...node.loc.end, offset: 0 },
    };
  }
  const m = new VFileMessage(text, { place, source: debug.namespace });
  console.log("Message:", m);
  throw m;
}

const nodeTypeHandlers = {
  JSXElement: function(node, ...args) {
    if (node.openingElement.name.type === "JSXIdentifier") {
      const handler = elementNameHandlers[node.openingElement?.name?.name];
      if (handler) handler(node, ...args);
    }
  },

  CallExpression: function(node) {
    if (
      node.callee.type === "Identifier" &&
      node.callee.name === "_missingMdxReference" &&
      node.arguments.length <= 1 &&
      node.arguments[0].type === "Literal"
    ) {
      // MDX inserts code to check every referenced component name.
      // We've rewritten the elements away, but we have to nerf the check also.
      const arg = node.arguments[0].value;
      if (Object.keys(elementNameHandlers).includes(arg)) {
        debug("Disabling %s('%s')", node.callee.name, arg);
        // text.overwrite(node.start, node.end, "{}");
      }
    }
  },
};

const elementNameHandlers = {
  // Rewrite <$for var="id" of={expr}>...</$for>
  // to <>{(expr).map((id) => <>...</>)}</>
  $for: function(node, parent) {
    const { openingElement: open, closingElement: close } = node;
    debug("Rewriting %s", debug.enabled && unparse(open));
    const { var: varAttr, of: ofAttr, ...extraAttrs } = Object.fromEntries(
      open.attributes.map(a => [a.name.name, a])
    );
    if (varAttr?.value?.type !== "Literal") {
      fail(`Need var="name" in ${unparse(open)}`, node);
    }
    if (ofAttr?.value?.type !== "JSXExpressionContainer") {
      fail(`Need of={expression} in ${unparse(open)}`, node);
    }
    if (Object.keys(extraAttrs).length > 0) {
      fail(`Bad attribute in ${unparse(open)}`, node);
    }

    // TODO: validate varText as an identifier OR destructuring pattern
    // probably by parsing `let ${varText} = null;` and
    // verifying that we get exactly one valid let-expression?
    const varText = varAttr.value.value;
    const ofExpr = ofAttr.value.expression;
    // text.overwrite(open.start, ofExpr.start, "(");
    // text.overwrite(ofExpr.end, open.end, `).map((${varText}) => `);
    // wrapChildrenForCode(text, node);
    // if (close) text.remove(close.start, close.end);
    // text.appendLeft(node.end, ")");
    // wrapCodeForParent(text, node, parent);
  },

  // Rewrite <$if test={expr}>...</$if> to <>{(expr) ? <>...</> : null}</>
  $if: function(node, parent, prop, index) {
    const { openingElement: open, closingElement: close } = node;
    debug("Rewriting %s", debug.enabled && unparse(open));
    const { test: testAttr, ...extraAttrs } = Object.fromEntries(
      open.attributes.map(a => [a.name.name, a])
    );
    if (testAttr?.value?.type !== "JSXExpressionContainer") {
      fail(`Need test={expression} in ${unparse(open)}`, node);
    }
    if (Object.keys(extraAttrs).length > 0) {
      fail(`Bad attribute in ${unparse(open)}`, node);
    }

    // text.overwrite(open.start, testAttr.value.expression.start, "(");
    // text.overwrite(testAttr.value.expression.end, open.end, ") ? ");
    // wrapChildrenForCode(text, node);
    // if (close) text.remove(close.start, close.end);

    const nextNode = (prop === "children") && parent?.children[index + 1];
    if (["$else-if", "$else"].includes(nextNode?.openingElement?.name?.name)) {
      // text.appendLeft(node.end, " : ");
    } else {
      // text.appendLeft(node.end, " : null");
      // wrapCodeForParent(text, node, parent);
    }
  },

  "$else-if": function(node, parent, prop, index) {
    const { openingElement: open, closingElement: close } = node;
    debug("Rewriting %s", debug.enabled && unparse(open));
    const { test: testAttr, ...extraAttrs } = Object.fromEntries(
      open.attributes.map(a => [a.name.name, a])
    );
    if (testAttr?.value?.type !== "JSXExpressionContainer") {
      fail(`Need test={expression} in ${unparse(open)}`, node);
    }
    if (Object.keys(extraAttrs).length > 0) {
      fail(`Bad attribute in ${unparse(open)}`, node);
    }

    // text.overwrite(open.start, testAttr.value.expression.start, "(");
    // text.overwrite(testAttr.value.expression.end, open.end, ") ? ");
    // wrapChildrenForCode(text, node);
    // if (close) text.remove(close.start, close.end);

    const nextNode = (prop === "children") && parent?.children[index + 1];
    if (["$else-if", "$else"].includes(nextNode?.openingElement?.name?.name)) {
      // text.appendLeft(node.end, " : ");
    } else {
      // text.appendLeft(node.end, " : null");
      // wrapCodeForParent(text, node, parent);
    }
  },

  $else: function(node, parent, prop, index) {
    const { openingElement: open, closingElement: close } = node;
    debug("Rewriting %s", debug.enabled && unparse(open));
    if (open.attributes.length > 0) {
      fail(`Bad attribute in ${unparse(open)}`, node);
    }

    // text.remove(open.start, open.end);
    // wrapChildrenForCode(text, node);
    // if (close) text.remove(close.start, close.end);

    var pi = (parent && prop === "children") ? index - 1 : null;
    while (parent.children[pi]?.openingElement?.name?.name === "$else-if") {
      --pi;
    }

    const prevNode = parent.children[pi];
    if (prevNode?.openingElement?.name?.name !== "$if") {
      fail(`Found <$else> without previous <$if>`, node);
    }

    // wrapCodeForParent(text, { begin: prevNode.begin, end: node.end }, parent);
  },

  // Rewrite <$let var="id" value={expr}/>...</$let>
  // to <>{((id) => <>...</>)((expr))}</>
  $let: function(node, parent) {
    const { openingElement: open, closingElement: close } = node;
    debug("Rewriting %s", debug.enabled && unparse(open));

    const { var: varAttr, value: valAttr, ...extraAttrs } = Object.fromEntries(
      open.attributes.map(a => [a.name.name, a])
    );
    if (varAttr?.value?.type !== "Literal") {
      fail(`Need var="name" in ${unparse(open)}`, node);
    }
    if (valAttr?.value?.type !== "JSXExpressionContainer") {
      fail(`Need value={expression} in ${unparse(open)}`, node);
    }
    if (Object.keys(extraAttrs).length > 0) {
      fail(`Bad attribute in ${unparse(open)}`, node);
    }

    const varText = varAttr.value.value;
    // TODO: validate varText as above

    const valueExpr = valAttr.value.expression;
    // const valueText = text.slice(valueExpr.start, valueExpr.end);
    // text.overwrite(open.start, open.end, `((${varText}) => `);
    // wrapChildrenForCode(text, node);
    // if (close) text.remove(close.start, close.end);
    // text.appendLeft(node.end, `)((${valueText}))`);
    // wrapCodeForParent(text, node, parent);
  },
};
