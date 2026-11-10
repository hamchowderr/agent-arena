const LETTER = /\p{L}/u;

const TEXT_ARGUMENT = { text: 1, wrap: 1, drawButton: 2, fitSize: 1, measure: 1 };
const TEXT_PROPERTIES = new Set(["title", "subtitle", "speaker", "line", "text", "label"]);

function rawText(node) {
  if (!node) {
    return null;
  }
  if (node.type === "Literal" && typeof node.value === "string" && LETTER.test(node.value)) {
    return node;
  }
  if (node.type === "TemplateLiteral" && node.quasis.some((quasi) => LETTER.test(quasi.value.cooked ?? ""))) {
    return node;
  }
  if (node.type === "ConditionalExpression") {
    return rawText(node.consequent) ?? rawText(node.alternate);
  }
  if (node.type === "LogicalExpression") {
    return rawText(node.left) ?? rawText(node.right);
  }
  return null;
}

export default {
  meta: {
    type: "problem",
    docs: { description: "Player-facing text must come from the message catalog so every language gets it." },
    schema: [],
    messages: { rawText: "Player-facing text must go through t(\"key\") from src/i18n, with the English in src/i18n/locales/en.ts." },
  },
  create(context) {
    const report = (node) => {
      const found = rawText(node);
      if (found) {
        context.report({ node: found, messageId: "rawText" });
      }
    };
    return {
      CallExpression(node) {
        const name = node.callee.type === "Identifier" ? node.callee.name : null;
        const index = name ? TEXT_ARGUMENT[name] : undefined;
        if (index !== undefined) {
          report(node.arguments[index]);
        }
      },
      Property(node) {
        const key = node.key.type === "Identifier" ? node.key.name : node.key.type === "Literal" ? String(node.key.value) : null;
        if (key && TEXT_PROPERTIES.has(key)) {
          report(node.value);
        }
      },
    };
  },
};
