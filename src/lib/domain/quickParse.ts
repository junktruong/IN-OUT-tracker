export type ParsedTx = {
  type: "expense" | "income";
  amount: number;
  category: string;
  desc: string;
  source?: string;
};

const splitEntries = (raw: string) =>
  raw
    .split(/\n|;|；/g)
    .map((item) => item.trim())
    .filter(Boolean);

const parseAmount = (input: string) => {
  const matches = [...input.matchAll(/([0-9][0-9.,\s]*k?)/gi)];
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const match = matches[i];
    const rawToken = match[1];
    const index = match.index ?? 0;
    const prefix = input.slice(0, index).trimEnd();

    if (/[-−–—]$/.test(prefix)) {
      continue;
    }

    const isK = /k$/i.test(rawToken.trim());
    const digits = rawToken.replace(/[^0-9]/g, "");
    const value = Number(digits) * (isK ? 1000 : 1);

    if (Number.isFinite(value) && value > 0) {
      return { value, token: rawToken, index };
    }
  }

  return null;
};

export const quickParse = (raw: string) => {
  const items: ParsedTx[] = [];
  const skipped: string[] = [];

  splitEntries(raw).forEach((entry) => {
    let text = entry.trim();
    let type: "expense" | "income" = "expense";

    if (/^\+/u.test(text) || /^thu:/i.test(text)) {
      type = "income";
      text = text.replace(/^\+\s*/u, "");
      text = text.replace(/^thu:\s*/i, "");
    }

    let source: string | undefined;
    const atIndex = text.lastIndexOf("@");
    if (atIndex > -1) {
      source = text.slice(atIndex + 1).trim() || undefined;
      text = text.slice(0, atIndex).trim();
    }

    let category = type === "income" ? "Lương" : "Ăn uống";
    const categoryMatch = text.match(/^\[(.+?)\]/);
    if (categoryMatch) {
      category = categoryMatch[1].trim() || category;
      text = text.replace(/^\[(.+?)\]\s*/, "");
    }

    const amountResult = parseAmount(text);
    if (!amountResult) {
      skipped.push(entry);
      return;
    }

    const before = text.slice(0, amountResult.index).trim();
    const after = text
      .slice(amountResult.index + amountResult.token.length)
      .trim();
    const desc = `${before} ${after}`.trim() || category;

    items.push({
      type,
      amount: amountResult.value,
      category,
      desc,
      source,
    });
  });

  return { items, skipped };
};
