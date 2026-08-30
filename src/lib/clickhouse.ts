// ClickHouse Cloud client (HTTP interface).
// Optional telemetry/analytics backend. All calls are best-effort:
// if ClickHouse is unreachable or unconfigured, the app keeps working.

const host = process.env.CLICKHOUSE_HOST || "";
const user = process.env.CLICKHOUSE_USER || "default";
const password = process.env.CLICKHOUSE_PASSWORD || "";

export const clickhouseEnabled = Boolean(host && password);

export interface ChRow {
  [key: string]: string | number | null;
}

export async function clickhouseQuery(
  sql: string,
  options: { format?: "JSONEachRow" | "JSON"; timeoutMs?: number } = {}
): Promise<ChRow[] | ChRow | null> {
  if (!clickhouseEnabled) return null;
  const format = options.format || "JSONEachRow";
  const timeoutMs = options.timeoutMs || 15000;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const url = host.includes("?") ? host + "&wait_for_async_insert=1" : host + "?wait_for_async_insert=1";
    const res = await fetch(url, {
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
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          rows.push(JSON.parse(trimmed));
        } catch {
          /* ignore partial/empty lines */
        }
      }
      return rows;
    }
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text } as ChRow;
    }
  } catch (err) {
    console.error("[clickhouse] request failed", (err as Error).message);
    return null;
  }
}

export async function clickhouseInsert(
  table: string,
  columns: string[],
  rows: Array<Array<string | number | null>>
): Promise<boolean> {
  if (!clickhouseEnabled || rows.length === 0) return false;
  const esc = (v: string | number | null): string => {
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "number") return String(v);
    return "'" + v.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  };
  const values = rows.map((r) => "(" + r.map(esc).join(",") + ")").join(",");
  const sql = "INSERT INTO " + table + " (" + columns.join(",") + ") VALUES " + values;
  const result = await clickhouseQuery(sql, { timeoutMs: 15000 });
  return result !== null;
}
