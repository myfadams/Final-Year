// Supabase Edge Function: send-push
//
// Called by Postgres triggers (via pg_net, see supabase/migrations/20260819_push_triggers.sql
// and 20260819_hotspot_push.sql) whenever something push-worthy happens — a new SOS, a new
// nearby emergency, a new chat message, or a detected hotspot. Given a list of user_ids, looks
// up their registered Expo push tokens and sends via Expo's push API.
//
// Deploy: supabase functions deploy send-push
// Required secrets (supabase secrets set ...): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY are
// provided automatically by the Supabase runtime for Edge Functions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100; // Expo's push API accepts at most 100 messages per request

interface SendPushBody {
  user_ids: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Only the Postgres triggers (authenticating with the service role key) should be able to
  // call this — it can message any user given their id, so it must not be publicly callable.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: SendPushBody;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { user_ids, title, body, data } = payload;
  if (!Array.isArray(user_ids) || user_ids.length === 0 || !title || !body) {
    return new Response(
      JSON.stringify({ sent: 0, reason: "missing user_ids/title/body" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: tokenRows, error } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .in("user_id", user_ids);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokens = [...new Set((tokenRows ?? []).map((r) => r.expo_push_token as string))];
  if (tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no registered tokens" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = tokens.map((token) => ({
    to: token,
    title,
    body,
    data: data ?? {},
    sound: "default",
    priority: "high",
  }));

  let sent = 0;
  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(chunk),
      });
      if (res.ok) sent += chunk.length;
    } catch (err) {
      console.warn("send-push: chunk failed", err);
    }
  }

  return new Response(JSON.stringify({ sent, tokens: tokens.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
