import { pool } from "../db.js";

/*
 * Suggests a category for imported transactions (MoneyFlow Pro).
 *
 * In order of trust:
 *   1. The same merchant in the user's own history ("shoprite lekki"),
 *      or the same brand at another branch ("shoprite ikota").
 *   2. A word the user's history consistently files under one category.
 *   3. Built-in keyword rules mapped onto the default categories.
 */

type TransactionType = "income" | "expense";

export type SuggestionInput = {
  description: string;
  type: TransactionType;
};

// Bank noise that says nothing about what was bought.
const STOP_WORDS = new Set([
  "pos", "purchase", "payment", "pay", "paid", "transfer", "trf", "trans", "tfr",
  "from", "to", "for", "via", "web", "online", "card", "debit", "credit", "nip",
  "ref", "reference", "txn", "transaction", "mobile", "app", "ussd", "the", "and",
  "of", "at", "in", "on", "ltd", "limited", "plc", "inc", "co", "nig", "ng",
  "lagos", "abuja", "ikeja", "lekki", "vi", "ltd.", "de", "du", "la", "le", "des",
  "der", "die", "das", "und", "el", "los", "las", "y", "da", "do", "dos", "e",
  "kartenzahlung", "lastschrift", "paiement", "carte", "compra", "pago",
]);

// Keywords -> default category name (as seeded by the database).
const KEYWORD_RULES: { type: TransactionType; category: string; words: string[] }[] = [
  { type: "income", category: "Salary", words: ["salary", "payroll", "wages", "salaire", "gehalt", "lohn", "nomina", "nómina", "salario", "salário"] },
  { type: "income", category: "Freelance", words: ["freelance", "upwork", "fiverr", "invoice", "honorar", "facture"] },
  { type: "income", category: "Gift", words: ["gift", "present", "cadeau", "geschenk", "regalo", "presente"] },
  { type: "expense", category: "Food", words: ["shoprite", "spar", "grocery", "groceries", "supermarket", "restaurant", "eatery", "chicken", "pizza", "kfc", "dominos", "chowdeck", "glovo", "jumia food", "food", "bakery", "cafe", "coffee", "starbucks", "mcdonalds", "lidl", "aldi", "rewe", "edeka", "carrefour", "leclerc", "auchan", "mercadona", "supermarché", "supermarche", "lebensmittel", "supermercado", "mercado", "boulangerie"] },
  { type: "expense", category: "Transport", words: ["uber", "bolt", "taxify", "indrive", "taxi", "fuel", "petrol", "diesel", "filling", "station", "total", "oando", "mobil", "conoil", "brt", "train", "bus", "flight", "airline", "airways", "parking", "toll", "shell", "esso", "bp", "sncf", "ratp", "bahn", "db", "renfe", "metro", "gasolina", "essence", "tanken"] },
  { type: "expense", category: "Bills", words: ["dstv", "gotv", "startimes", "electricity", "ikedc", "ekedc", "aedc", "phcn", "nepa", "prepaid", "postpaid", "airtime", "data", "mtn", "airtel", "glo", "9mobile", "internet", "spectranet", "smile", "starlink", "water", "waste", "lawma", "insurance", "vodafone", "orange", "telekom", "edf", "strom", "factura", "conta", "luz"] },
  { type: "expense", category: "Entertainment", words: ["netflix", "spotify", "showmax", "apple music", "youtube", "prime video", "disney", "cinema", "filmhouse", "genesis", "playstation", "xbox", "steam", "boomplay", "audiomack", "kino", "cine"] },
  { type: "expense", category: "Health", words: ["pharmacy", "hospital", "clinic", "medplus", "health", "hmo", "dental", "doctor", "lab", "apotheke", "pharmacie", "farmacia", "farmácia", "médecin", "arzt"] },
  { type: "expense", category: "Education", words: ["school", "tuition", "university", "college", "course", "udemy", "coursera", "books", "waec", "jamb", "école", "schule", "universidad", "escola"] },
  { type: "expense", category: "Housing", words: ["rent", "landlord", "agent", "estate", "service charge", "loyer", "miete", "alquiler", "aluguel"] },
  { type: "expense", category: "Shopping", words: ["jumia", "konga", "amazon", "temu", "shein", "aliexpress", "mall", "store", "boutique", "fashion", "zara", "h&m", "ikea", "slot", "pointek"] },
];

export function tokenize(description: string): string[] {
  return description
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z&\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

// "POS PURCHASE SHOPRITE LEKKI 0042" -> "shoprite"
export function merchantKey(description: string): string {
  return tokenize(description).slice(0, 2).join(" ");
}

function topCategory(counts: Map<string, number> | undefined) {
  if (!counts) {
    return null;
  }

  let best: string | null = null;
  let bestCount = 0;
  let total = 0;

  for (const [categoryId, count] of counts) {
    total += count;

    if (count > bestCount) {
      best = categoryId;
      bestCount = count;
    }
  }

  return best ? { categoryId: best, count: bestCount, share: bestCount / total } : null;
}

export async function suggestCategories(
  userId: string,
  items: SuggestionInput[],
): Promise<(string | null)[]> {
  const [history, categories] = await Promise.all([
    pool.query<{ description: string; type: TransactionType; category_id: string }>(
      `
        SELECT description, type, category_id
        FROM public.transactions
        WHERE user_id = $1
        ORDER BY transaction_date DESC
        LIMIT 5000
      `,
      [userId],
    ),
    pool.query<{ id: string; name: string; kind: TransactionType }>(
      `
        SELECT id, name, kind
        FROM public.categories
        WHERE user_id = $1
          AND is_active = true
          AND parent_id IS NULL
      `,
      [userId],
    ),
  ]);

  // type -> key -> categoryId -> count
  const byMerchant = new Map<string, Map<string, number>>();
  // First meaningful word: the same shop across branches ("shoprite ikota" / "shoprite lekki").
  const byBrand = new Map<string, Map<string, number>>();
  const byToken = new Map<string, Map<string, number>>();

  const bump = (map: Map<string, Map<string, number>>, key: string, categoryId: string) => {
    if (!key) {
      return;
    }

    const counts = map.get(key) ?? new Map<string, number>();
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    map.set(key, counts);
  };

  for (const row of history.rows) {
    bump(byMerchant, `${row.type}|${merchantKey(row.description)}`, row.category_id);
    bump(byBrand, `${row.type}|${tokenize(row.description)[0] ?? ""}`, row.category_id);

    for (const token of new Set(tokenize(row.description))) {
      bump(byToken, `${row.type}|${token}`, row.category_id);
    }
  }

  const categoryIdByName = new Map(
    categories.rows.map((category) => [`${category.kind}|${category.name}`, category.id]),
  );

  return items.map(({ description, type }) => {
    // 1. Same merchant as before.
    const merchant = topCategory(byMerchant.get(`${type}|${merchantKey(description)}`));

    if (merchant) {
      return merchant.categoryId;
    }

    const brand = topCategory(byBrand.get(`${type}|${tokenize(description)[0] ?? ""}`));

    if (brand && brand.share >= 0.8) {
      return brand.categoryId;
    }

    // 2. A word the user consistently files the same way (seen twice+, 80%+).
    const tokens = tokenize(description);
    let bestToken: { categoryId: string; count: number } | null = null;

    for (const token of tokens) {
      const candidate = topCategory(byToken.get(`${type}|${token}`));

      if (
        candidate &&
        candidate.count >= 2 &&
        candidate.share >= 0.8 &&
        (!bestToken || candidate.count > bestToken.count)
      ) {
        bestToken = candidate;
      }
    }

    if (bestToken) {
      return bestToken.categoryId;
    }

    // 3. Built-in keywords.
    const text = ` ${tokens.join(" ")} `;

    for (const rule of KEYWORD_RULES) {
      if (
        rule.type === type &&
        rule.words.some((word) => text.includes(` ${word} `))
      ) {
        return categoryIdByName.get(`${type}|${rule.category}`) ?? null;
      }
    }

    return null;
  });
}
