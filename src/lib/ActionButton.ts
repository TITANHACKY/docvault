import { Node, type CommandProps } from "@tiptap/core";

export interface ActionButtonAttributes {
  title: string;
  url: string;
  color: string;
  align: "left" | "center" | "right";
}

export const ActionButton = Node.create({
  name: "actionButton",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      title: {
        default: "Add button",
      },
      url: {
        default: "https://",
      },
      color: {
        default: "#7c6ee6",
      },
      align: {
        default: "center",
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-action-button]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as ActionButtonAttributes;

    return [
      "div",
      {
        "data-action-button": "true",
        "data-title": attrs.title,
        "data-url": attrs.url,
        "data-color": attrs.color,
        "data-align": attrs.align,
        class: "action-button-block",
        style: `text-align:${attrs.align};`,
        ...HTMLAttributes,
      },
      [
        "a",
        {
          href: attrs.url,
          target: "_blank",
          rel: "noopener noreferrer",
          class: "action-button-link",
          style: `background-color:${attrs.color};`,
        },
        attrs.title,
      ],
    ];
  },

  addCommands() {
    return {
      setActionButton:
        (attributes: Partial<ActionButtonAttributes>) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              title: attributes.title ?? "Add button",
              url: attributes.url ?? "https://",
              color: attributes.color ?? "#7c6ee6",
              align: attributes.align ?? "center",
            },
          });
        },
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    actionButton: {
      setActionButton: (
        attributes: Partial<ActionButtonAttributes>,
      ) => ReturnType;
    };
  }
}
