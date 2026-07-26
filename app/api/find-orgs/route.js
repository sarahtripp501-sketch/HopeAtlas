import { NextResponse } from "next/server";

const CATMAP = {
  Support: "support",
  Financial: "financial",
  Research: "research",
  Information: "info",
  Practical: "practical",
  Caregiver: "caregiver",
};

export async function POST(req) {
  try {
    const { type, cats = [], location, catLabels = [] } = await req.json();

    const catList = catLabels.length
      ? catLabels.join(", ")
      : "support, financial help, research, information, lodging/travel";
    const typeTxt =
      type === "All / general" ? "cancer (any type)" : type.replace(/\s*\/.*/, "") + " cancer";

    const sys =
      "You build a directory of REAL cancer-support organizations using web search. " +
      "Return ONLY a JSON array (no prose, no markdown, no code fences). Up to 8 objects shaped exactly: " +
      '{"name":string,"url":string,"desc":string (one short sentence),"category":one of [Support,Financial,Research,Information,Practical,Caregiver]}. ' +
      "Only include organizations you actually found via search with a real, working URL. Never invent organizations or URLs. " +
      "Prefer reputable nonprofits and well-known programs. If location is given, favor groups serving that area.";

    const user =
      `Find organizations that help people with ${typeTxt}. Categories of interest: ${catList}.` +
      (location ? ` Location: ${location}.` : "") +
      " Return the JSON array only.";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: sys,
        messages: [{ role: "user", content: user }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error:", res.status, errText);
      return NextResponse.json({ error: "Search failed" }, { status: 502 });
    }

    const data = await res.json();
    const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1) {
      return NextResponse.json({ items: [] });
    }

    const arr = JSON.parse(text.slice(start, end + 1));
    const items = arr
      .filter((o) => o.name && o.url)
      .map((o) => ({
        name: o.name,
        url: o.url,
        desc: o.desc || "",
        cats: [CATMAP[o.category] || "info"],
        types: [type],
        web: true,
      }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("find-orgs route error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
