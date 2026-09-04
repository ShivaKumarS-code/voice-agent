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
