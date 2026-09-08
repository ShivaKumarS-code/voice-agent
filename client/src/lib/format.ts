export function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

let counter = 0;

export function createId(): string {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

export function normalizeMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!content) return "";
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          if ("text" in item && typeof (item as any).text === "string") return (item as any).text;
          if ("content" in item && typeof (item as any).content === "string") return (item as any).content;
        }
        return "";
      })
      .join("");
  }
  if (typeof content === "object") {
    if ("text" in content && typeof (content as any).text === "string") return (content as any).text;
    if ("content" in content && typeof (content as any).content === "string") return (content as any).content;
  }
  return String(content);
}

