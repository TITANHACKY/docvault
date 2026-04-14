function getBodyFromHtml(html: string): HTMLElement | null {
  if (typeof window === "undefined") return null;
  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html").body;
}

function normalizeSpacing(value: string): string {
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

function textFromNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  const children = Array.from(element.childNodes).map(textFromNode).join("");

  switch (element.tagName.toLowerCase()) {
    case "h1":
      return `# ${children.trim()}\n\n`;
    case "h2":
      return `## ${children.trim()}\n\n`;
    case "h3":
      return `### ${children.trim()}\n\n`;
    case "h4":
      return `#### ${children.trim()}\n\n`;
    case "p":
      return `${children.trim()}\n\n`;
    case "strong":
    case "b":
      return `**${children}**`;
    case "em":
    case "i":
      return `*${children}*`;
    case "code":
      return `\`${children}\``;
    case "pre": {
      const block = element.textContent ?? "";
      return `\n\`\`\`\n${block.trim()}\n\`\`\`\n\n`;
    }
    case "blockquote": {
      const quoted = children
        .split("\n")
        .filter(Boolean)
        .map((line) => `> ${line}`)
        .join("\n");
      return `${quoted}\n\n`;
    }
    case "ul": {
      const items = Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === "li")
        .map((li) => `- ${textFromNode(li).trim()}`)
        .join("\n");
      return `${items}\n\n`;
    }
    case "ol": {
      const items = Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === "li")
        .map((li, index) => `${index + 1}. ${textFromNode(li).trim()}`)
        .join("\n");
      return `${items}\n\n`;
    }
    case "li":
      return children;
    case "a": {
      const href = element.getAttribute("href") ?? "";
      const text = children.trim() || href;
      return href ? `[${text}](${href})` : text;
    }
    case "br":
      return "\n";
    default:
      return children;
  }
}

export function htmlToMarkdown(html: string): string {
  const body = getBodyFromHtml(html);
  if (!body) return normalizeSpacing(html.replace(/<[^>]+>/g, " "));

  const markdown = Array.from(body.childNodes).map(textFromNode).join("");
  return normalizeSpacing(markdown);
}

export function htmlToPlainText(html: string): string {
  const body = getBodyFromHtml(html);
  if (!body) return normalizeSpacing(html.replace(/<[^>]+>/g, " "));

  const text = body.innerText || body.textContent || "";
  return normalizeSpacing(text);
}

export function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}
