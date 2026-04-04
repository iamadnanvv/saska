import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIREBASE_PROJECT_ID = "saska-bussiness-proposal-gen";

const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

async function verifyFirebaseToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_ID,
  });
  return payload;
}

async function generateDeterministicPassword(
  uid: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`firebase_bridge_${uid}`)
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { idToken } = await req.json();
    if (!idToken) throw new Error("Missing idToken");

    // Verify Firebase ID token
    const claims = await verifyFirebaseToken(idToken);
    const email = claims.email as string;
    const firebaseUid = claims.sub as string;
    const emailVerified = claims.email_verified as boolean;

    if (!email) throw new Error("Firebase token missing email claim");

    // Generate deterministic Supabase password from Firebase UID
    const password = await generateDeterministicPassword(
      firebaseUid,
      SERVICE_ROLE_KEY
    );

    // Try signing in first (existing user)
    let { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (signInError) {
      // User doesn't exist in Supabase — create them
      const { error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            firebase_uid: firebaseUid,
            email_verified: emailVerified,
          },
        });

      if (createError) {
        console.error("User creation failed:", createError);
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      // Now sign in as the newly created user
      const result = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });
      if (result.error) throw result.error;
      signInData = result.data;
    }

    return new Response(
      JSON.stringify({
        session: {
          access_token: signInData.session!.access_token,
          refresh_token: signInData.session!.refresh_token,
        },
        user: {
          id: signInData.user!.id,
          email: signInData.user!.email,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Firebase auth bridge error:", error);
    const msg = error instanceof Error ? error.message : "Auth bridge failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
