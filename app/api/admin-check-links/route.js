import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ORGS } from "../../../lib/orgData";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

async function checkUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    let res;
    try {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal, headers: BROWSER_HEADERS });
    } catch {
      res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal, headers: BROWSER_HEADERS });
    }
    clearTimeout(timeout);

    // These statuses usually mean a bot-blocker, not a dead site — flag separately, not as "broken"
    const likelyBlocked = [403, 405, 406, 429].includes(res.status);
    const genuinelyBroken = res.status === 404 || res.status === 410 || res.status >= 500;

    return { ok: !genuinelyBroken, status: res.status, likelyBlocked };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, status: null, error: err.name === "AbortError" ? "Timed out" : "Couldn't connect" };
  }
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function next() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, next);
  await Promise.all(runners);
  return results;
}

export async function POST(req) {
  try {
    const { password } = await req.json();
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const curated = ORGS.map(([name, url]) => ({ name, url }));
    let custom = [];
    try {
      const { data } = await supabase.from("custom_orgs").select("name, url");
      custom = data || [];
    } catch {}

    const all = [...curated, ...custom];
    const seen = new Set();
    const unique = all.filter((o) => {
      if (seen.has(o.url)) return false;
      seen.add(o.url);
      return true;
    });

    const results = await runWithConcurrency(unique, 6, async (o) => {
      const r = await checkUrl(o.url);
      return { name: o.name, url: o.url, ...r };
    });

    const broken = results.filter((r) => !r.ok && !r.likelyBlocked);
    const blocked = results.filter((r) => r.likelyBlocked);

    return NextResponse.json({
      total: results.length,
      brokenCount: broken.length,
      broken,
      blockedCount: blocked.length,
      blocked,
    });
  } catch (err) {
    console.error("admin-check-links error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}