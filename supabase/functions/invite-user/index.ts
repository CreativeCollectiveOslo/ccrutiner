import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteUserRequest {
  email: string;
  name?: string;
  role: "admin" | "employee";
}

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

    const { email, name, role }: InviteUserRequest = await req.json();

    // Validate input
    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "Email and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["admin", "employee"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be 'admin' or 'employee'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a memorable two-word password
    const generatedPassword = generatePassword();
    console.log(`Generated password for ${email}: ${generatedPassword}`);

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: { name: name || '' }
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The profile will be created automatically via the handle_new_user trigger

    console.log("User created successfully:", newUser.user?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser.user,
        generatedPassword: generatedPassword,
        message: "User invited successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in invite-user function:", error);
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
