import { NextRequest, NextResponse } from "next/server";
import { clickhouseQuery } from "@/lib/clickhouse";

// GET /api/analytics — real-time platform analytics from ClickHouse Cloud.
// Returns per-game and aggregated activity. Best-effort: if ClickHouse is
// down or unconfigured, returns empty defaults instead of failing the page.
export async function GET(_req: NextRequest) {
  try {
    const [perGame, totals, hourly, recent] = await Promise.all([
      clickhouseQuery(
        `SELECT game_slug, count() AS events, sum(score) AS total_score,
                uniqExact(actor_id) AS players
         FROM clawcade.game_events
         GROUP BY game_slug ORDER BY events DESC LIMIT 20 FORMAT JSONEachRow`
      ),
      clickhouseQuery(
        `SELECT count() AS total_events, uniqExact(actor_id) AS total_players,
                sum(score) AS total_score
         FROM clawcade.game_events FORMAT JSONEachRow`
      ),
      clickhouseQuery(
        `SELECT toString(toStartOfHour(event_time)) AS hour, count() AS events
         FROM clawcade.game_events
         WHERE event_time >= now() - INTERVAL 24 HOUR
         GROUP BY hour ORDER BY hour LIMIT 24 FORMAT JSONEachRow`
      ),
      clickhouseQuery(
        `SELECT actor_type, game_slug, score, event_time FROM clawcade.game_events
         ORDER BY event_time DESC LIMIT 20 FORMAT JSONEachRow`
      ),
    ]);

    return NextResponse.json({
      analytics: true,
      perGame: Array.isArray(perGame) ? perGame : [],
      totals: Array.isArray(totals) ? totals[0] || {} : {},
      hourly: Array.isArray(hourly) ? hourly : [],
      recent: Array.isArray(recent) ? recent : [],
    });
  } catch {
    return NextResponse.json({
      analytics: false,
      perGame: [],
      totals: {},
      hourly: [],
      recent: [],
    });
  }
}
