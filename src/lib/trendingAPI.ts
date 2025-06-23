// Real trending topics dari berbagai sumber API Indonesia
interface TrendingTopic {
  title: string;
  category: string;
  source: string;
  prompt: string;
}

interface TrendingResponse {
  topics: TrendingTopic[];
  lastUpdated: Date;
}

// Fallback trending topics jika API gagal
const fallbackTrending: TrendingTopic[] = [
  {
    title: "Peran AI dalam transformasi digital UMKM Indonesia",
    category: "Teknologi",
    source: "Tech Trend",
    prompt: "Bagaimana AI dapat membantu transformasi digital UMKM di Indonesia? Berikan contoh konkret dan langkah implementasinya."
  },
  {
    title: "Dampak ekonomi digital terhadap generasi Z Indonesia",
    category: "Ekonomi",
    source: "Economic News",
    prompt: "Analisis dampak ekonomi digital terhadap peluang kerja dan kewirausahaan generasi Z di Indonesia."
  },
  {
    title: "Tren wisata berkelanjutan di Indonesia pasca pandemi",
    category: "Pariwisata",
    source: "Travel Insight",
    prompt: "Bagaimana tren wisata berkelanjutan berkembang di Indonesia? Apa saja destinasi dan praktik terbaik yang sedang populer?"
  },
  {
    title: "Perkembangan fintech syariah di Indonesia 2024",
    category: "Finansial",
    source: "Finance Today",
    prompt: "Jelaskan perkembangan dan prospek fintech syariah di Indonesia. Apa keunggulan dan tantangannya?"
  },
  {
    title: "Inovasi pendidikan digital di era merdeka belajar",
    category: "Pendidikan",
    source: "Education Hub",
    prompt: "Bagaimana inovasi pendidikan digital mendukung program merdeka belajar? Berikan contoh implementasi yang sukses."
  },
  {
    title: "Startup unicorn Indonesia dan dampaknya ke ekonomi",
    category: "Bisnis",
    source: "Startup News",
    prompt: "Analisis kontribusi startup unicorn Indonesia terhadap perekonomian nasional dan ekosistem startup lokal."
  }
];

class TrendingAPI {
  private static cache: TrendingResponse | null = null;
  private static cacheExpiry: Date | null = null;
  private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  // Method untuk fetch dari Google Trends API (unofficial)
  static async fetchGoogleTrends(): Promise<TrendingTopic[]> {
    try {
      // Menggunakan serpapi.com atau apify untuk Google Trends Indonesia
      const response = await fetch('/api/trending/google', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return this.formatGoogleTrends(data);
      }
    } catch (error) {
      console.warn('Google Trends API failed:', error);
    }
    return [];
  }

  // Method untuk fetch dari Twitter/X Trending Indonesia
  static async fetchTwitterTrends(): Promise<TrendingTopic[]> {
    try {
      const response = await fetch('/api/trending/twitter', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return this.formatTwitterTrends(data);
      }
    } catch (error) {
      console.warn('Twitter Trends API failed:', error);
    }
    return [];
  }

  // Method untuk fetch dari news aggregator Indonesia
  static async fetchNewsHeadlines(): Promise<TrendingTopic[]> {
    try {
      // Menggunakan NewsAPI atau RSS feed dari detik.com, kompas.com, etc
      const response = await fetch('/api/trending/news', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return this.formatNewsHeadlines(data);
      }
    } catch (error) {
      console.warn('News API failed:', error);
    }
    return [];
  }

  // Main method untuk get trending topics
  static async getTrendingTopics(forceRefresh = false): Promise<TrendingTopic[]> {
    const now = new Date();
    
    // Check cache
    if (!forceRefresh && this.cache && this.cacheExpiry && now < this.cacheExpiry) {
      return this.cache.topics;
    }

    try {
      // Fetch dari multiple sources secara parallel
      const [googleTrends, twitterTrends, newsHeadlines] = await Promise.allSettled([
        this.fetchGoogleTrends(),
        this.fetchTwitterTrends(),
        this.fetchNewsHeadlines()
      ]);

      let allTopics: TrendingTopic[] = [];

      // Combine results dari semua sources
      if (googleTrends.status === 'fulfilled') {
        allTopics.push(...googleTrends.value);
      }
      if (twitterTrends.status === 'fulfilled') {
        allTopics.push(...twitterTrends.value);
      }
      if (newsHeadlines.status === 'fulfilled') {
        allTopics.push(...newsHeadlines.value);
      }

      // Jika semua API gagal, gunakan fallback
      if (allTopics.length === 0) {
        console.warn('All trending APIs failed, using fallback data');
        allTopics = fallbackTrending;
      }

      // Remove duplicates dan limit
      const uniqueTopics = this.removeDuplicates(allTopics);
      const limitedTopics = uniqueTopics.slice(0, 12); // Max 12 topics

      // Update cache
      this.cache = {
        topics: limitedTopics,
        lastUpdated: now
      };
      this.cacheExpiry = new Date(now.getTime() + this.CACHE_DURATION);

      return limitedTopics;
    } catch (error) {
      console.error('Error fetching trending topics:', error);
      return fallbackTrending;
    }
  }

  // Get random trending prompts untuk suggestion cards
  static async getRandomPrompts(count = 4): Promise<string[]> {
    const topics = await this.getTrendingTopics();
    const shuffled = topics.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(topic => topic.prompt);
  }

  // Helper methods untuk format data dari berbagai API
  private static formatGoogleTrends(data: any): TrendingTopic[] {
    return data.trends?.map((trend: any) => ({
      title: trend.title,
      category: "Google Trends",
      source: "Google",
      prompt: `Jelaskan tentang "${trend.title}" yang sedang trending di Indonesia. Apa yang membuatnya populer dan bagaimana dampaknya?`
    })) || [];
  }

  private static formatTwitterTrends(data: any): TrendingTopic[] {
    return data.trends?.map((trend: any) => ({
      title: trend.name,
      category: "Social Media",
      source: "Twitter",
      prompt: `Analisis trending topic "${trend.name}" di Twitter Indonesia. Mengapa hal ini viral dan apa opini publik tentangnya?`
    })) || [];
  }

  private static formatNewsHeadlines(data: any): TrendingTopic[] {
    return data.articles?.map((article: any) => ({
      title: article.title,
      category: "Berita",
      source: article.source?.name || "News",
      prompt: `Berikan analisis mendalam tentang berita: "${article.title}". Apa implikasi dan dampaknya bagi Indonesia?`
    })) || [];
  }

  private static removeDuplicates(topics: TrendingTopic[]): TrendingTopic[] {
    const seen = new Set();
    return topics.filter(topic => {
      const key = topic.title.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Method untuk admin refresh trending data
  static async refreshTrendingData(): Promise<boolean> {
    try {
      const topics = await this.getTrendingTopics(true);
      return topics.length > 0;
    } catch (error) {
      console.error('Failed to refresh trending data:', error);
      return false;
    }
  }
}

export default TrendingAPI;