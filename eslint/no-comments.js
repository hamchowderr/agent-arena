export default {
  meta: {
    type: "suggestion",
    docs: { description: "Bans code comments. Use a clearer name or a test instead." },
    schema: [],
    messages: { noComment: "No comments: rename something or write a test that shows the behavior." },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (/^\s*@ts-expect-error\s/.test(comment.value)) {
            continue;
          }
          context.report({ loc: comment.loc, messageId: "noComment" });
        }
      },
    };
  },
};
