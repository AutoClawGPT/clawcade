// ClickHouse Cloud client (HTTP interface).
// The primary data store for CLAWCADE. All calls are best-effort with
// graceful failure so pages never hard-crash if ClickHouse is down.

const host = process.env.CLICKHOUSE_HOST || "";
const user = process.env.CLICKHOUSE_USER || "default";
const password = process.env.CLICKHOUSE_PASSWORD || "";

export const clickhouseEnabled = Boolean(host && password);

export type ChVal = string | number | boolean | null;
export type ChRow = Record<string, ChVal>;

function escLiteral(v: ChVal): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  return "'" + String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

function buildUrl(extra?: string): string {
  const hasQ = host.includes("?");
  const base = host + (hasQ ? "&" : "?");
  return base + "wait_for_async_insert=1" + (extra ? "&" + extra : "");
}

export async function chExec(
  sql: string,
  options: { format?: "JSONEachRow" | "JSON" | "TSV"; timeoutMs?: number } = {}
): Promise<ChRow[] | ChRow | string | null> {
  if (!clickhouseEnabled) return null;
  const format = options.format || "JSONEachRow";
  const timeoutMs = options.timeoutMs || 20000;
  // ClickHouse defaults to TSV when no FORMAT is given; force the format we need
  // by appending FORMAT when the statement is a SELECT and no FORMAT is present.
  const upper = sql.trim().toUpperCase();
  if ((upper.startsWith("SELECT") || upper.startsWith("WITH") || upper.startsWith("DESCRIBE")) && !/FORMAT\s\w+/.test(sql)) {
    if (format === "JSONEachRow") sql = sql + " FORMAT JSONEachRow";
    else if (format === "JSON") sql = sql + " FORMAT JSON";
    else if (format === "TSV") sql = sql + " FORMAT TSV";
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(buildUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization: "Basic " + Buffer.from(user + ":" + password).toString("base64"),
      },
      body: sql,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) {
      const errText = await res.text();
      console.error("[clickhouse] query failed", res.status, errText.slice(0, 300));
      return null;
    }
    const text = await res.text();
    if (format === "JSONEachRow") {
      const rows: ChRow[] = [];
      for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        try { rows.push(JSON.parse(t)); } catch { /* ignore */ }
      }
      return rows;
    }
    if (format === "JSON") {
      try { return JSON.parse(text); } catch { return { raw: text } as ChRow; }
    }
    return text;
  } catch (err) {
    clearTimeout(timer);
    console.error("[clickhouse] request failed", (err as Error).message);
    return null;
  }
}

// insert(table, rows) where rows are objects of column->value
export async function chInsert(table: string, rows: Array<Record<string, ChVal>>): Promise<boolean> {
  if (!clickhouseEnabled || rows.length === 0) return false;
  const allKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const values = rows.map((r) => "(" + allKeys.map((k) => escLiteral(r[k] ?? null)).join(",") + ")").join(",");
  const sql = "INSERT INTO " + table + " (" + allKeys.join(",") + ") VALUES " + values;
  const res = await chExec(sql, { timeoutMs: 15000 });
  return res !== null;
}

// insert with explicit columns and positional rows: (table, [cols], [[v1,v2],...])
export async function clickhouseInsert(table: string, columns: string[], rows: unknown[][]): Promise<boolean> {
  if (!clickhouseEnabled || !rows.length || !columns.length) return false;
  const values = rows
    .map((r) => "(" + columns.map((c, i) => escLiteral(r[i] as ChVal)).join(",") + ")")
    .join(",");
  const sql = "INSERT INTO " + table + " (" + columns.join(",") + ") VALUES " + values;
  const res = await chExec(sql, { timeoutMs: 15000 });
  return res !== null;
}

// raw query helper used by analytics
export async function clickhouseQuery(sql: string): Promise<ChRow[]> {
  const res = await chExec(sql, { format: "JSONEachRow" });
  return Array.isArray(res) ? res : [];
}

// update - ClickHouse uses ALTER TABLE ... UPDATE ... WHERE (mutations are async, use sync)
// A value wrapped in { raw: "..." } is emitted verbatim (used for DateTime columns
// in ALTER UPDATE, which reject plain string literals in ClickHouse Cloud).
export type ChRaw = { raw: string };

export async function chUpdate(table: string, sets: Record<string, ChVal | ChRaw>, where: string): Promise<boolean> {
  const assignments = Object.entries(sets)
    .map(([k, v]) => k + " = " + (v && typeof v === "object" && "raw" in v ? (v as ChRaw).raw : escLiteral(v as ChVal)))
    .join(", ");
  const sql = "ALTER TABLE " + table + " UPDATE " + assignments + " WHERE " + where + "";
  const res = await chExec(sql, { timeoutMs: 20000 });
  return res !== null;
}

export async function chDelete(table: string, where: string): Promise<boolean> {
  const sql = "ALTER TABLE " + table + " DELETE WHERE " + where + "";
  const res = await chExec(sql, { timeoutMs: 20000 });
  return res !== null;
}

export async function chSelectFirst(sql: string): Promise<ChRow | null> {
  const res = await chExec(sql, { format: "JSONEachRow" });
  return Array.isArray(res) && res.length > 0 ? res[0] : null;
}

export async function chSelectAll(sql: string): Promise<ChRow[]> {
  const res = await chExec(sql, { format: "JSONEachRow" });
  return Array.isArray(res) ? res : [];
}

export { escLiteral };
