import { Article } from "@/constants/interfaces";

// NewsData.io standard response format
interface NewsDataResult {
  article_id: string;
  title: string;
  link: string;
  keywords: string[] | null;
  creator: string[] | null;
  video_url: string | null;
  description: string | null;
  content: string | null;
  pubDate: string;
  image_url: string | null;
  source_id: string;
  source_priority: number;
  country: string[];
  category: string[];
  language: string;
}

interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: NewsDataResult[];
}

export async function fetchKnustUpdates(): Promise<Article[]> {
  const apiKey = process.env.EXPO_PUBLIC_GHANA_NEWS_API_KEY;
  if (!apiKey) {
    console.warn("EXPO_PUBLIC_GHANA_NEWS_API_KEY is not defined in environment variables.");
    return [];
  }

  const url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=knust&country=gh`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch KNUST news: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: NewsDataResponse = await response.json();
    if (data.status !== "success" || !data.results) {
      return [];
    }

    // Map to the existing Article interface
    return data.results.map((item) => {
      return {
        id: item.article_id,
        title: item.title || "No Title",
        category: "KNUST Update",
        categoryColor: "#4F46E5", // Indigo
        categoryBg: "#E0E7FF",
        publisher: item.source_id ? item.source_id.toUpperCase() : "News Source",
        time: item.pubDate ? new Date(item.pubDate).toLocaleDateString() : "Just now",
        image: item.image_url || "https://images.unsplash.com/photo-1541888075782-b7e3e9d8995a", // fallback to generic if image_url is null
        content: item.description || item.content || "No description available.",
        isFeatured: false,
        publishedAtIso: item.pubDate || undefined,
      };
    });
  } catch (err) {
    console.error("Error fetching KNUST updates from NewsData.io:", err);
    return [];
  }
}
