/* eslint-disable @typescript-eslint/no-explicit-any */
import Mention from "@tiptap/extension-mention";

export const MentionExtension = Mention.configure({
  HTMLAttributes: {
    class: "tiptap-mention",
  },
  renderHTML({ node }) {
    return [
      "span",
      {
        class: "tiptap-mention",
        "data-type": node.attrs.mentionType ?? "user",
        "data-id": node.attrs.id,
        "data-label": node.attrs.label,
      },
      `@${node.attrs.label}`,
    ];
  },
  suggestion: {
    char: "@",
    allowSpaces: false,
    items: async ({ query }: { query: string }) => {
      try {
        const res = await fetch(
          `/api/kanban/mentions/search?q=${encodeURIComponent(query)}&types=user,customer,product`
        );
        if (!res.ok) return [];
        return await res.json();
      } catch {
        return [];
      }
    },
    render() {
      let component: any = null;
      let popup: any = null;

      return {
        onStart(props: any) {
          // Lazy load to avoid SSR issues
          Promise.all([
            import("./MentionList"),
            import("@tiptap/react").then((m) => m.ReactRenderer),
            import("tippy.js").then((m) => m.default),
          ]).then(([{ MentionList }, ReactRenderer, tippy]) => {
            component = new ReactRenderer(MentionList as any, {
              props: { ...props, onClose: () => popup?.[0]?.hide() },
              editor: props.editor,
            });

            popup = tippy("body", {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
            });
          });
        },
        onUpdate(props: any) {
          component?.updateProps(props);
          popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect });
        },
        onKeyDown(props: any) {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          return false;
        },
        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
          popup = null;
          component = null;
        },
      };
    },
  },
});
