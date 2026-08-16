import { supabase } from "./supabaseConfig";

export interface NewsRecord {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  image_url: string | null;
  author_id: string;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  users?: {
    name: string | null;
  };
}

/**
 * Fetches all published news from the Supabase database.
 * Orders them by the published_at date in descending order.
 */
export async function fetchPublishedNews(): Promise<NewsRecord[]> {
  const { data, error } = await supabase
    .from("news")
    .select(`
      *,
      users:author_id (
        name
      )
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Error fetching published news:", error);
    throw error;
  }

  return data as NewsRecord[];
}
