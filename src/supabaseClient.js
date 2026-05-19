import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oaeogrhtqaivahxeisml.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_I8tmt1DFmQ6K7BbwXB8aLQ_xfYedd7G";

export const supabase = createClient("https://oaeogrhtqaivahxeisml.supabase.co", "sb_publishable_I8tmt1DFmQ6K7BbwXB8aLQ_xfYedd7G");
