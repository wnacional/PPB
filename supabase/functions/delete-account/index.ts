import { createClient } from "npm:@supabase/supabase-js@2";
const allowedOrigins = new Set([
  "https://pinoypocketbudget.app",
  "https://www.pinoypocketbudget.app",
  "https://pocket-budget.w-nacional16.chatgpt.site"
]);
function headers(origin) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://pinoypocketbudget.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}
Deno.serve(async (req)=>{
  const origin = req.headers.get("origin");
  const responseHeaders = headers(origin);
  if (req.method === "OPTIONS") return new Response(null, {
    status: 204,
    headers: responseHeaders
  });
  if (req.method !== "POST") return new Response(JSON.stringify({
    error: "Method not allowed"
  }), {
    status: 405,
    headers: responseHeaders
  });
  if (origin && !allowedOrigins.has(origin)) return new Response(JSON.stringify({
    error: "Origin not allowed"
  }), {
    status: 403,
    headers: responseHeaders
  });
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({
    error: "Authentication required"
  }), {
    status: 401,
    headers: responseHeaders
  });
  let body;
  try {
    body = await req.json();
  } catch  {
    return new Response(JSON.stringify({
      error: "Invalid request"
    }), {
      status: 400,
      headers: responseHeaders
    });
  }
  if (body.confirmation !== "DELETE") return new Response(JSON.stringify({
    error: "Confirmation required"
  }), {
    status: 400,
    headers: responseHeaders
  });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return new Response(JSON.stringify({
    error: "Service configuration unavailable"
  }), {
    status: 500,
    headers: responseHeaders
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const token = authorization.slice(7);
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return new Response(JSON.stringify({
    error: "Invalid or expired session"
  }), {
    status: 401,
    headers: responseHeaders
  });
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
  if (!lastSignIn || Date.now() - lastSignIn > 15 * 60 * 1000) return new Response(JSON.stringify({
    error: "Please sign out, sign back in, and retry within 15 minutes"
  }), {
    status: 403,
    headers: responseHeaders
  });
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);
  if (deleteError) return new Response(JSON.stringify({
    error: "Account deletion failed"
  }), {
    status: 500,
    headers: responseHeaders
  });
  return new Response(JSON.stringify({
    deleted: true
  }), {
    status: 200,
    headers: responseHeaders
  });
});
