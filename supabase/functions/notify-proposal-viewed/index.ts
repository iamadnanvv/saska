import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proposal_id } = await req.json();

    if (!proposal_id) {
      return new Response(
        JSON.stringify({ error: "proposal_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get proposal with client name
    const { data: proposal, error: pErr } = await supabase
      .from("proposals")
      .select("id, title, user_id, status, share_id, clients(name)")
      .eq("id", proposal_id)
      .single();

    if (pErr || !proposal) {
      return new Response(
        JSON.stringify({ error: "Proposal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Debounce: skip if a "viewed" notification was sent in last 30 minutes
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("proposal_events")
      .select("*", { count: "exact", head: true })
      .eq("proposal_id", proposal_id)
      .eq("event_type", "viewed_notified")
      .gte("created_at", thirtyMinAgo);

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "recently_notified" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check notification preferences
    const { data: prefData } = await supabase
      .from("notification_preferences")
      .select("notify_viewed")
      .eq("user_id", proposal.user_id)
      .single();

    // If preference exists and is disabled, skip
    if (prefData && prefData.notify_viewed === false) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "notifications_disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get proposal owner's email from auth.users
    const { data: ownerData } = await supabase.auth.admin.getUserById(proposal.user_id);
    const ownerEmail = ownerData?.user?.email;

    if (!ownerEmail) {
      return new Response(
        JSON.stringify({ error: "Owner email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientName = (proposal as any).clients?.name || "A client";
    const title = proposal.title;

    // Send email via Resend
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      console.error("Missing API keys for email sending");
      return new Response(
        JSON.stringify({ error: "Email not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: hsl(152, 45%, 32%); padding: 10px 14px; border-radius: 10px;">
            <span style="color: #ffffff; font-weight: 700; font-size: 18px;">SASKA</span>
          </div>
        </div>
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 12px;">👀 Proposal Viewed</h1>
        <p style="color: #55575d; font-size: 14px; line-height: 1.6;">
          <strong>${clientName}</strong> has viewed your proposal <strong>"${title}"</strong>. This is a great time to follow up!
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">— The SASKA Team</p>
      </div>
    `;

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "SASKA <onboarding@resend.dev>",
        to: [ownerEmail],
        subject: `Your proposal "${title}" was viewed`,
        html: emailHtml,
      }),
    });

    const data = await response.json();

    // Track that we sent the notification to debounce
    await supabase.from("proposal_events").insert({
      proposal_id,
      event_type: "viewed_notified",
    });

    // Also update proposal status to "viewed" if it's currently "sent"
    if (proposal.status === "sent") {
      await supabase
        .from("proposals")
        .update({ status: "viewed" })
        .eq("id", proposal_id);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-proposal-viewed error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
