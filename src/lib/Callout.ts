import { Node, type CommandProps } from "@tiptap/core";

export interface CalloutAttributes {
  variant?: string;
  type?: string;
}

const LEGACY_VARIANT_MAP: Record<string, string> = {
  info: "strong-blue",
  warning: "strong-yellow",
  success: "strong-green",
  danger: "strong-red",
};

const VARIANT_STYLE_MAP: Record<string, string> = {
  "strong-red": "background:#f9c4cb;border-color:#d12b35;color:#3f0e13;",
  "strong-orange": "background:#fbd5b5;border-color:#f97316;color:#4a2607;",
  "strong-yellow": "background:#fde9b0;border-color:#f5b700;color:#4a3603;",
  "strong-blue": "background:#b9d0e6;border-color:#4f46e5;color:#1f3142;",
  "strong-purple": "background:#c8c1f2;border-color:#5b44d6;color:#2f1f6d;",
  "strong-pink": "background:#f4bfd7;border-color:#db3b8d;color:#511433;",
  "strong-green": "background:#b7dcc8;border-color:#2f9a64;color:#173b2a;",
  "strong-grey": "background:#d9d9d9;border-color:#a7a7a7;color:#3a3a3a;",
  red: "background:#f7e1e4;border-color:#e7c1c6;color:#6a2e35;",
  orange: "background:#fbe7d1;border-color:#efcda2;color:#7f4a14;",
  yellow: "background:#f8edc8;border-color:#e5d39b;color:#6c5509;",
  blue: "background:#d5e4f2;border-color:#adc7e0;color:#30557a;",
  purple: "background:#e0def5;border-color:#c3bfea;color:#4a3f8f;",
  pink: "background:#f2dce8;border-color:#dfbed1;color:#7a3f64;",
  green: "background:#d9eadf;border-color:#b7d6c1;color:#2d6848;",
  grey: "background:#ececec;border-color:#d4d4d4;color:#5a5a5a;",
};

function normalizeVariant(input?: string) {
  if (!input) return "strong-blue";
  const mapped = LEGACY_VARIANT_MAP[input] ?? input;
  return VARIANT_STYLE_MAP[mapped] ? mapped : "strong-blue";
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",

  addAttributes() {
    return {
      variant: {
        default: "strong-blue",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-callout]",
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) {
            return { variant: "strong-blue" };
          }

          const variant = normalizeVariant(
            element.getAttribute("data-callout") || undefined,
          );
          return { variant };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = normalizeVariant(
      typeof node.attrs.variant === "string" ? node.attrs.variant : undefined,
    );
    const variantStyle =
      VARIANT_STYLE_MAP[variant] ?? VARIANT_STYLE_MAP["strong-blue"];

    return [
      "div",
      {
        "data-callout": variant,
        class: `callout callout-${variant}`,
        style: `background:#d5e4f2;border-color:transparent;color:#1f3142;${variantStyle}`,
        ...HTMLAttributes,
      },
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes?: CalloutAttributes) =>
        ({ commands }: CommandProps) => {
          const variant = normalizeVariant(
            attributes?.variant || attributes?.type,
          );
          return commands.insertContent({
            type: this.name,
            attrs: { variant },
            content: [{ type: "paragraph" }],
          });
        },
      toggleCallout:
        (attributes?: CalloutAttributes) =>
        ({ commands }: CommandProps) => {
          const variant = normalizeVariant(
            attributes?.variant || attributes?.type,
          );
          return commands.insertContent({
            type: this.name,
            attrs: { variant },
            content: [{ type: "paragraph" }],
          });
        },
    };
  },
});
