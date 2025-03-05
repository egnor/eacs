import * as estreeWalker from "estree-walker"; 
import * as estreeToJs from "estree-util-to-js";
import Debug from "debug";
import { VFileMessage } from "vfile-message";

// Use DEBUG=recma-jsx-if-for for debugging output
const debug = Debug("recma-jsx-if-for");

const hideProps = ["type", "start", "end", "loc", "range"];

export default function recmaJsxIfFor() {
  return (tree, file) => {
    console.log("=== recmaJsxIfFor %s ===", file.path);
    console.log(prettyTree(tree));

    estreeWalker.walk(tree, {
      leave(node, ...args) {
        const handler = nodeTypeHandlers[node.type];
        if (handler) handler.call(this, node, ...args);
      },
    });
  }
}

function unparse(tree) {
  return estreeToJs.toJs(tree, { handlers: estreeToJs.jsx }).value;
}

function prettyTree(tree, pre = "") {
  if (Array.isArray(tree)) {
    if (tree.length == 0) return "[]\n";
    return "\n" + tree.map((item, i) =>
      `${pre}  #${i} ${prettyTree(item, `${pre}  `)}`
    ).join("");
  } else if (typeof tree === "object" && tree) {
    return `${tree.type ? `[${tree.type}]` : ""}\n` +
      Object.entries(tree)
        .filter(([key, value]) => !hideProps.includes(key))
        .map(([k, v]) => `${pre}  ${k}: ${prettyTree(v, `${pre}  `)}`)
        .join("");
  } else {
    return JSON.stringify(tree) + "\n";
  }
}

function fail(text, stack = []) {
  var place;
  for (var node of stack.reverse()) {
    if (node.loc) {
      place = { start: { ...node.loc.start }, end: { ...node.loc.end } };
      if (node.range) [place.start.offset, place.end.offset] = node.range;
      break;
    }
  }
  const message = new VFileMessage(text, { place, source: debug.namespace });
  message.fatal = true;
  throw message;
}

function patternFromExpr(node, stack = []) {
  if (node.type === "Identifier") {
    return node;
  } else {
    fail(`Bad variable pattern ${unparse(node)}`, [...stack, node]);
  }
}

const nodeTypeHandlers = {
  JSXElement: function(node, ...args) {
    if (node.openingElement.name.type === "JSXIdentifier") {
      const handler = elementNameHandlers[node.openingElement?.name?.name];
      if (handler) handler.call(this, node, ...args);
    }
  },

  CallExpression: function(node, parent, prop, index) {
    if (
      node.callee.type === "Identifier" &&
      node.callee.name === "_missingMdxReference" &&
      node.arguments.length >= 1 &&
      node.arguments[0].type === "Literal"
    ) {
      // MDX inserts code to check every referenced component name.
      // We've rewritten the elements away, but we have to nerf the check also.
      const arg = node.arguments[0].value;
      if (Object.keys(elementNameHandlers).includes(arg)) {
        debug("Disabling %s", unparse(node));
        this.replace({ type: "EmptyStatement" })
      }
    }
  },
};

const elementNameHandlers = {
  // Rewrite <$for var={name} of={expr}>...</$for>
  // to <>{(expr).map((name) => <>...</>)}</>
  $for: function(node, parent) {
    const { openingElement: open, closingElement: close } = node;
    debug("Rewriting %s", debug.enabled && unparse(open));
    const { var: varAttr, of: ofAttr, ...extraAttrs } = Object.fromEntries(
      open.attributes.map(a => [a.name.name, a])
    );
    if (varAttr?.value?.type !== "JSXExpressionContainer") {
      fail(`Need var={name} in ${unparse(open)}`, [parent, node, open]);
    }
    if (ofAttr?.value?.type !== "JSXExpressionContainer") {
      fail(`Need of={expression} in ${unparse(open)}`, [parent, node, open]);
    }
    if (Object.keys(extraAttrs).length > 0) {
      const attr = extraAttrs[Object.keys(extraAttrs)[0]];
      fail(`Bad attribute in ${unparse(open)}`, [parent, node, open, attr]);
    }

    const varStack = [varAttr, open, node];
    const varPattern = patternFromExpr(varAttr.value.expression, varStack);

    var newExpr = {
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        object: ofAttr.value.expression,
        property: { type: "Identifier", name: "map" },
      },
      arguments: [{
        type: "ArrowFunctionExpression",
        id: null,
        expression: true,
        params: [varPattern],
        body: {
          type: "JSXFragment",
          openingFragment: { type: "JSXOpeningFragment" },
          children: node.children,
          closingFragment: { type: "JSXClosingFragment" },
        },
      }],
    };

    newExpr = { type: "JSXExpressionContainer", expression: newExpr };
    if (!parent.type.startsWith("JSX")) {
      newExpr = {
        type: "JSXFragment",
        openingFragment: { type: "JSXOpeningFragment" },
        children: [newExpr],
        closingFragment: { type: "JSXClosingFragment" },
      };
    }

    this.replace(newExpr);
  },

  // Rewrite <$if test={expr}>...</$if> to <>{(expr) ? <>...</> : null}</>
  $if: function(node, parent, prop, index) {
    const { openingElement: open, closingElement: close } = node;
    debug("Rewriting %s", debug.enabled && unparse(open));
    const { test: testAttr, ...extraAttrs } = Object.fromEntries(
      open.attributes.map(a => [a.name.name, a])
    );
    if (testAttr?.value?.type !== "JSXExpressionContainer") {
      fail(`Need test={expression} in ${unparse(open)}`, [parent, node, open]);
    }
    if (Object.keys(extraAttrs).length > 0) {
      const attr = extraAttrs[Object.keys(extraAttrs)[0]];
      fail(`Bad attribute in ${unparse(open)}`, [parent, node, open], attr);
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
      fail(`Need test={expression} in ${unparse(open)}`, [parent, node, open]);
    }
    if (Object.keys(extraAttrs).length > 0) {
      const attr = extraAttrs[Object.keys(extraAttrs)[0]];
      fail(`Bad attribute in ${unparse(open)}`, [parent, node, open], attr);
    }

    // text.overwrite(open.start, testAttr.value.expression.start, "(");
    // text.overwrite(testAttr.value.expression.end, open.end, ") ? ");
    // wrapChildrenForCode(text, node);
    // if (close) text.remove(close.start, close.end);

    var pi = (parent && prop === "children") ? index - 1 : null;
    const prevNode = parent.children[pi];
    if (!["$if", "$else-if"].includes(prevNode?.openingElement?.name?.name)) {
      fail(`<$else-if> without preceding <$[else-]if>`, [parent, node, open]);
    }

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
      const attr = open.attributes[Object.keys(open.attributes)[0]];
      fail(`Bad attribute in ${unparse(open)}`, [parent, node, open, attr]);
    }

    // text.remove(open.start, open.end);
    // wrapChildrenForCode(text, node);
    // if (close) text.remove(close.start, close.end);

    var pi = (parent && prop === "children") ? index - 1 : null;
    while (parent.children[pi]?.openingElement?.name?.name === "$else-if") --pi;
    const ifNode = parent.children[pi];
    if (ifNode?.openingElement?.name?.name !== "$if") {
      fail(`<$else> without previous <$if>`, [parent, node, open]);
    }

    // wrapCodeForParent(text, { begin: ifNode.begin, end: node.end }, parent);
  },

  // Rewrite <$let var={name} value={expr}/>...</$let>
  // to <>{((name) => <>...</>)((expr))}</>
  $let: function(node, parent) {
    const { openingElement: open, closingElement: close } = node;
    debug("Rewriting %s", debug.enabled && unparse(open));

    const { var: varAttr, value: valAttr, ...extraAttrs } = Object.fromEntries(
      open.attributes.map(a => [a.name.name, a])
    );
    if (varAttr?.value?.type !== "JSXExpressionContainer") {
      fail(`Need var={name} in ${unparse(open)}`, [parent, node, open]);
    }
    if (valAttr?.value?.type !== "JSXExpressionContainer") {
      fail(`Need value={expression} in ${unparse(open)}`, [parent, node, open]);
    }
    if (Object.keys(extraAttrs).length > 0) {
      const attr = extraAttrs[Object.keys(extraAttrs)[0]];
      fail(`Bad attribute in ${unparse(open)}`, [parent, node, open, attr]);
    }

    const varStack = [varAttr, open, node];
    const varPattern = patternFromExpr(varAttr.value.expression, varStack);

    var newExpr = {
      type: "CallExpression",
      callee: {
        type: "ArrowFunctionExpression",
        expression: true,
        params: [varPattern],
        body: {
          type: "JSXFragment",
          openingFragment: { type: "JSXOpeningFragment" },
          children: node.children,
          closingFragment: { type: "JSXClosingFragment" },
        },
      },
      arguments: [valAttr.value.expression],
    };

    newExpr = { type: "JSXExpressionContainer", expression: newExpr };
    if (!parent.type.startsWith("JSX")) {
      newExpr = {
        type: "JSXFragment",
        openingFragment: { type: "JSXOpeningFragment" },
        children: [newExpr],
        closingFragment: { type: "JSXClosingFragment" },
      };
    }

    this.replace(newExpr);
  },
};
