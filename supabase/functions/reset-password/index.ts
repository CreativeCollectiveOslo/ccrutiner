import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const ResetPasswordSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

// Norwegian word lists for generating memorable passwords
const adjectives = [
  "Sulten", "Glad", "Rask", "Stor", "Liten", "Blå", "Rød", "Grønn", "Gul", "Hvit",
  "Sort", "Varm", "Kald", "Søt", "Sur", "Morsom", "Sterk", "Rask", "Lat", "Modig",
  "Stille", "Høy", "Lav", "Bred", "Smal", "Tung", "Lett", "Myk", "Hard", "Våt",
  "Tørr", "Ung", "Gammel", "Ny", "Frisk", "Klok", "Vill", "Tam", "Rik", "Smart",
  "Snill", "Grei", "Fin", "Pen", "Kjapp", "Rolig", "Lystig", "Munter", "Ivrig", "Flott"
];

const nouns = [
  "Katt", "Hund", "Fugl", "Fisk", "Bjørn", "Ulv", "Rev", "Elg", "Hest", "Ku",
  "Sau", "Gris", "Høne", "And", "Gås", "Ørn", "Ugle", "Ravn", "Hare", "Mus",
  "Sol", "Måne", "Stjerne", "Sky", "Regn", "Snø", "Vind", "Storm", "Lyn", "Torden",
  "Fjell", "Dal", "Elv", "Sjø", "Hav", "Skog", "Tre", "Blomst", "Gress", "Stein",
  "Vifte", "Lampe", "Stol", "Bord", "Bok", "Penn", "Klokke", "Nøkkel", "Kopp", "Tallerken"
];

const generatePassword = (): string => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}${noun}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (rolesError || !roles) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    const parseResult = ResetPasswordSchema.safeParse(await req.json());
    
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId } = parseResult.data;

    // Generate a new memorable password
    const newPassword = generatePassword();
    console.log(`Password reset initiated for user`);

    // Update the user's password
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateAuthError) {
      console.error("Error updating password:", updateAuthError);
      return new Response(
        JSON.stringify({ error: updateAuthError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reset has_logged_in flag - password is NOT stored in database for security
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        has_logged_in: false 
      })
      .eq("id", userId);

    if (updateProfileError) {
      console.error("Error updating profile:", updateProfileError);
    }

    console.log("Password reset successfully for user:", userId);

    // Password is returned to admin only once and NOT stored in database
    return new Response(
      JSON.stringify({ 
        success: true, 
        newPassword: newPassword,
        message: "Password reset successfully. Password shown only once." 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
