import { Editor } from "@tiptap/core";
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  TextQuote,
  Code,
  CheckSquare,
  Minus,
  Type,
  ListCollapse,
  Bold,
  Italic,
  Strikethrough,
  CodeXml,
  RemoveFormatting,
  Columns3,
  Table,
  FilePlus,
  SquareMousePointer,
  LayoutList,
  Bookmark,
  Link,
  Image,
} from "lucide-react";

interface CommandProps {
  editor: Editor;
  range: { from: number; to: number };
  onCreatePage?: () => void;
  openMentionPagePicker?: () => void;
  openButtonBuilder?: () => void;
}

function applyContentCommand(
  { editor, range }: CommandProps,
  content: string,
  options?: { insertDividerBefore?: boolean; insertDividerAfter?: boolean },
) {
  const chain = editor.chain().focus().deleteRange(range);

  if (options?.insertDividerBefore) {
    chain.setHorizontalRule();
  }

  chain.insertContent(content);

  if (options?.insertDividerAfter) {
    chain.setHorizontalRule();
  }

  chain.run();
}

function insertCallout(
  editor: Editor,
  range: { from: number; to: number },
  variant: string,
) {
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .insertContent({
      type: "callout",
      attrs: { variant },
      content: [{ type: "paragraph" }],
    })
    .run();
}

export interface SlashCommandItem {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: (props: CommandProps) => void;
  category: string;
}

export interface SlashCommandCategory {
  name: string;
  items: SlashCommandItem[];
}

import { Info } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: {
        variant?: string;
        type?: string;
      }) => ReturnType;
      toggleCallout: (attributes?: {
        variant?: string;
        type?: string;
      }) => ReturnType;
    };
  }
}

function createBannerCommand(title: string, variant: string): SlashCommandItem {
  return {
    title,
    icon: Bookmark,
    category: "TEXT",
    action: ({ editor, range }) => {
      insertCallout(editor, range, variant);
    },
  };
}

const allCommands: SlashCommandItem[] = [
  // --- TEXT ---
  {
    title: "Normal text",
    icon: Type,
    category: "TEXT",
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "Callout",
    icon: Info,
    category: "TEXT",
    action: ({ editor, range }) => {
      insertCallout(editor, range, "strong-blue");
    },
  },
  {
    title: "Heading 1",
    icon: Heading1,
    category: "TEXT",
    action: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run();
    },
  },
  {
    title: "Heading 2",
    icon: Heading2,
    category: "TEXT",
    action: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run();
    },
  },
  {
    title: "Heading 3",
    icon: Heading3,
    category: "TEXT",
    action: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run();
    },
  },
  {
    title: "Heading 4",
    icon: Heading4,
    category: "TEXT",
    action: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 4 })
        .run();
    },
  },
  {
    title: "Checklist",
    icon: CheckSquare,
    category: "TEXT",
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Bulleted list",
    icon: List,
    category: "TEXT",
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered list",
    icon: ListOrdered,
    category: "TEXT",
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Toggle list",
    icon: ListCollapse,
    category: "TEXT",
    action: ({ editor, range }) => {
      applyContentCommand(
        { editor, range },
        "<ul><li>Toggle item 1</li><li>Toggle item 2</li></ul>",
      );
    },
  },
  createBannerCommand("Callout red", "red"),
  createBannerCommand("Callout orange", "orange"),
  createBannerCommand("Callout yellow", "yellow"),
  createBannerCommand("Callout blue", "blue"),
  createBannerCommand("Callout purple", "purple"),
  createBannerCommand("Callout green", "green"),
  createBannerCommand("Callout grey", "grey"),
  {
    title: "Code block",
    icon: Code,
    category: "TEXT",
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Block quote",
    icon: TextQuote,
    category: "TEXT",
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  // --- FORMATTING ---
  {
    title: "Clear format",
    icon: RemoveFormatting,
    category: "FORMATTING",
    action: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .clearNodes()
        .unsetAllMarks()
        .run();
    },
  },
  {
    title: "Bold",
    icon: Bold,
    category: "FORMATTING",
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBold().run();
    },
  },
  {
    title: "Italic",
    icon: Italic,
    category: "FORMATTING",
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleItalic().run();
    },
  },
  {
    title: "Strikethrough",
    icon: Strikethrough,
    category: "FORMATTING",
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleStrike().run();
    },
  },
  {
    title: "Inline code",
    icon: CodeXml,
    category: "FORMATTING",
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCode().run();
    },
  },

  // --- ADVANCED BLOCKS ---
  {
    title: "Columns",
    icon: Columns3,
    category: "ADVANCED BLOCKS",
    action: ({ editor, range }) => {
      applyContentCommand(
        { editor, range },
        "<h4>Column 1</h4><p>Write the first column content here.</p><h4>Column 2</h4><p>Write the second column content here.</p>",
        { insertDividerBefore: true, insertDividerAfter: true },
      );
    },
  },
  {
    title: "Table",
    icon: Table,
    category: "ADVANCED BLOCKS",
    action: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: "Divider",
    icon: Minus,
    category: "ADVANCED BLOCKS",
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "New Page",
    icon: FilePlus,
    category: "ADVANCED BLOCKS",
    action: ({ editor, range, onCreatePage }) => {
      editor.chain().focus().deleteRange(range).run();
      onCreatePage?.();
    },
  },
  {
    title: "Mention a Page",
    icon: Link,
    category: "ADVANCED BLOCKS",
    action: ({ editor, range, openMentionPagePicker }) => {
      editor.chain().focus().deleteRange(range).run();
      openMentionPagePicker?.();
    },
  },
  {
    title: "Button",
    icon: SquareMousePointer,
    category: "ADVANCED BLOCKS",
    action: ({ editor, range, openButtonBuilder }) => {
      editor.chain().focus().deleteRange(range).run();
      openButtonBuilder?.();
    },
  },
  {
    title: "Image",
    icon: Image,
    category: "ADVANCED BLOCKS",
    action: ({ editor, range }) => {
      const url = window.prompt("Enter image URL:");
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },
  {
    title: "Table of contents",
    icon: LayoutList,
    category: "ADVANCED BLOCKS",
    action: ({ editor, range }) => {
      applyContentCommand(
        { editor, range },
        "<h4>Table of contents</h4><ul><li>Introduction</li><li>Section 1</li><li>Section 2</li></ul>",
      );
    },
  },
  {
    title: "Bookmark",
    icon: Bookmark,
    category: "ADVANCED BLOCKS",
    action: ({ editor, range }) => {
      applyContentCommand(
        { editor, range },
        "<blockquote><p>Bookmark: Add a link or note to revisit this spot.</p></blockquote>",
      );
    },
  },
];

const CATEGORY_ORDER = ["TEXT", "FORMATTING", "ADVANCED BLOCKS"];

export function getSlashCommandCategories(
  query: string,
): SlashCommandCategory[] {
  const filtered = query
    ? allCommands.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()),
      )
    : allCommands;

  const categoryMap = new Map<string, SlashCommandItem[]>();
  for (const item of filtered) {
    const existing = categoryMap.get(item.category) || [];
    existing.push(item);
    categoryMap.set(item.category, existing);
  }

  return CATEGORY_ORDER.filter((name) => categoryMap.has(name)).map((name) => ({
    name,
    items: categoryMap.get(name)!,
  }));
}

export function getFlatItems(query: string): SlashCommandItem[] {
  return getSlashCommandCategories(query).flatMap((c) => c.items);
}
