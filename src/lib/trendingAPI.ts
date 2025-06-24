// Enhanced TrendingAPI untuk trending topics Indonesia
interface TrendingTopic {
  title: string;
  category: string;
  source: string;
  prompt: string;
  popularity?: number;
  timestamp?: Date;
}

interface TrendingResponse {
  topics: TrendingTopic[];
  lastUpdated: Date;
}

interface NewsArticle {
  title: string;
  description?: string;
  source?: { name: string };
  publishedAt?: string;
  url?: string;
}

// Fallback trending topics yang diupdate secara manual
const fallbackTrending: TrendingTopic[] = [
  {
    title: "Dampak AI Generative terhadap UMKM Indonesia di 2024",
    category: "Teknologi",
    source: "Tech Indonesia",
    prompt: "Bagaimana AI Generative dapat membantu transformasi digital UMKM di Indonesia? Berikan contoh implementasi praktis dan manfaatnya."
  },
  {
    title: "Tren Ekonomi Digital dan Generasi Z Indonesia",
    category: "Ekonomi",
    source: "Economic Insight",
    prompt: "Analisis dampak ekonomi digital terhadap peluang kerja dan kewirausahaan generasi Z di Indonesia. Apa tantangan dan peluangnya?"
  },
  {
    title: "Wisata Berkelanjutan di Indonesia Pasca Pandemi",
    category: "Pariwisata",
    source: "Travel Indonesia",
    prompt: "Bagaimana tren wisata berkelanjutan berkembang di Indonesia? Sebutkan destinasi dan praktik terbaik yang sedang populer."
  },
  {
    title: "Perkembangan Fintech Syariah Indonesia 2024",
    category: "Finansial",
    source: "Finance Today",
    prompt: "Jelaskan perkembangan dan prospek fintech syariah di Indonesia. Apa keunggulan dan tantangan yang dihadapi?"
  },
  {
    title: "Inovasi Pendidikan Digital di Era Merdeka Belajar",
    category: "Pendidikan",
    source: "Education Hub",
    prompt: "Bagaimana inovasi pendidikan digital mendukung program merdeka belajar? Berikan contoh implementasi yang sukses di Indonesia."
  },
  {
    title: "Startup Unicorn Indonesia dan Dampak Ekonomi",
    category: "Bisnis",
    source: "Startup News",
    prompt: "Analisis kontribusi startup unicorn Indonesia terhadap perekonomian nasional dan ekosistem startup lokal."
  },
  {
    title: "Tren Kuliner Indonesia yang Viral di Media Sosial",
    category: "Kuliner",
    source: "Food Trend",
    prompt: "Jelaskan tren kuliner Indonesia terbaru yang viral di media sosial. Apa faktor yang membuatnya populer?"
  },
  {
    title: "Musik Pop Indonesia di Kancah Internasional",
    category: "Hiburan",
    source: "Music Indonesia",
    prompt: "Bagaimana perkembangan musik pop Indonesia di kancah internasional? Siapa artis yang berhasil dan apa strateginya?"
  },
  {
    title: "E-Sports dan Gaming Industry Indonesia",
    category: "Gaming",
    source: "Gaming Indonesia",
    prompt: "Analisis perkembangan industri e-sports dan gaming di Indonesia. Apa peluang karir dan potensi ekonominya?"
  },
  {
    title: "Fashion Sustainable dari Brand Lokal Indonesia",
    category: "Fashion",
    source: "Fashion Indonesia",
    prompt: "Bagaimana perkembangan fashion sustainable dari brand lokal Indonesia? Apa inovasi dan tren yang sedang berkembang?"
  }
];

class TrendingAPI {
  private static cache: TrendingResponse | null = null;
  private static cacheExpiry: Date | null = null;
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache

  // Method untuk fetch dari Google Trends Indonesia
  static async fetchGoogleTrends(): Promise<TrendingTopic[]> {
    try {
      const response = await fetch('/api/trending/google', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return this.formatGoogleTrends(data.trends || []);
      }
    } catch (error) {
      console.warn('Google Trends API failed:', error);
    }
    return [];
  }

  // Method untuk fetch dari News API Indonesia
  static async fetchNewsHeadlines(): Promise<TrendingTopic[]> {
    try {
      const response = await fetch('/api/trending/news', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return this.formatNewsHeadlines(data.articles || []);
      }
    } catch (error) {
      console.warn('News API failed:', error);
    }
    return [];
  }

  // Method untuk fetch dari Twitter Trends Indonesia
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
        return this.formatTwitterTrends(data.trends || []);
      }
    } catch (error) {
      console.warn('Twitter Trends API failed:', error);
    }
    return [];
  }

  // Method untuk fetch dari Reddit Indonesia
  static async fetchRedditTrends(): Promise<TrendingTopic[]> {
    try {
      const response = await fetch('/api/trending/reddit', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return this.formatRedditTrends(data.posts || []);
      }
    } catch (error) {
      console.warn('Reddit API failed:', error);
    }
    return [];
  }

  // Main method untuk get trending topics
  static async getTrendingTopics(forceRefresh = false): Promise<TrendingTopic[]> {
    const now = new Date();
    
    // Check cache
    if (!forceRefresh && this.cache && this.cacheExpiry && now < this.cacheExpiry) {
      console.log('Using cached trending topics');
      return this.cache.topics;
    }

    console.log('Fetching fresh trending topics...');

    try {
      // Fetch dari multiple sources secara parallel
      const [newsHeadlines, googleTrends, twitterTrends, redditTrends] = await Promise.allSettled([
        this.fetchNewsHeadlines(),
        this.fetchGoogleTrends(), 
        this.fetchTwitterTrends(),
        this.fetchRedditTrends()
      ]);

      let allTopics: TrendingTopic[] = [];

      // Combine results dari semua sources
      if (newsHeadlines.status === 'fulfilled' && newsHeadlines.value.length > 0) {
        allTopics.push(...newsHeadlines.value);
        console.log(`Added ${newsHeadlines.value.length} news topics`);
      }
      
      if (googleTrends.status === 'fulfilled' && googleTrends.value.length > 0) {
        allTopics.push(...googleTrends.value);
        console.log(`Added ${googleTrends.value.length} Google trends`);
      }
      
      if (twitterTrends.status === 'fulfilled' && twitterTrends.value.length > 0) {
        allTopics.push(...twitterTrends.value);
        console.log(`Added ${twitterTrends.value.length} Twitter trends`);
      }
      
      if (redditTrends.status === 'fulfilled' && redditTrends.value.length > 0) {
        allTopics.push(...redditTrends.value);
        console.log(`Added ${redditTrends.value.length} Reddit trends`);
      }

      // Jika semua API gagal, gunakan fallback
      if (allTopics.length === 0) {
        console.warn('All trending APIs failed, using fallback data');
        allTopics = [...fallbackTrending];
      } else {
        // Mix dengan beberapa fallback untuk variety
        const shuffledFallback = fallbackTrending.sort(() => Math.random() - 0.5);
        allTopics.push(...shuffledFallback.slice(0, 3));
      }

      // Remove duplicates dan limit
      const uniqueTopics = this.removeDuplicates(allTopics);
      const limitedTopics = uniqueTopics.slice(0, 15); // Max 15 topics

      // Update cache
      this.cache = {
        topics: limitedTopics,
        lastUpdated: now
      };
      this.cacheExpiry = new Date(now.getTime() + this.CACHE_DURATION);

      console.log(`Successfully fetched ${limitedTopics.length} trending topics`);
      return limitedTopics;
    } catch (error) {
      console.error('Error fetching trending topics:', error);
      return fallbackTrending;
    }
  }

  // Get random trending prompts untuk suggestion cards
  static async getRandomPrompts(count = 4): Promise<string[]> {
    try {
      const topics = await this.getTrendingTopics();
      const shuffled = topics.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count).map(topic => topic.prompt);
    } catch (error) {
      console.error('Error getting random prompts:', error);
      // Fallback ke prompts statis
      const staticPrompts = fallbackTrending.map(topic => topic.prompt);
      const shuffled = staticPrompts.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    }
  }

  // Get trending by category
  static async getTrendingByCategory(category: string): Promise<TrendingTopic[]> {
    const topics = await this.getTrendingTopics();
    return topics.filter(topic => 
      topic.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  // Helper methods untuk format data dari berbagai API
  private static formatGoogleTrends(trends: any[]): TrendingTopic[] {
    return trends.map((trend: any) => ({
      title: trend.title || trend.query,
      category: "Google Trends",
      source: "Google",
      prompt: `Jelaskan tentang "${trend.title || trend.query}" yang sedang trending di Indonesia. Apa yang membuatnya populer dan bagaimana dampaknya?`,
      popularity: trend.traffic || 100,
      timestamp: new Date()
    }));
  }

  private static formatNewsHeadlines(articles: NewsArticle[]): TrendingTopic[] {
    return articles.map((article: NewsArticle) => ({
      title: article.title,
      category: "Berita",
      source: article.source?.name || "News",
      prompt: `Berikan analisis mendalam tentang berita: "${article.title}". Apa implikasi dan dampaknya bagi Indonesia?`,
      timestamp: article.publishedAt ? new Date(article.publishedAt) : new Date()
    }));
  }

  private static formatTwitterTrends(trends: any[]): TrendingTopic[] {
    return trends.map((trend: any) => ({
      title: trend.name || trend.trend,
      category: "Social Media",
      source: "Twitter",
      prompt: `Analisis trending topic "${trend.name || trend.trend}" di Twitter Indonesia. Mengapa hal ini viral dan apa opini publik tentangnya?`,
      popularity: trend.tweet_volume || 50,
      timestamp: new Date()
    }));
  }

  private static formatRedditTrends(posts: any[]): TrendingTopic[] {
    return posts.map((post: any) => ({
      title: post.title,
      category: "Forum",
      source: "Reddit",
      prompt: `Diskusikan topik "${post.title}" yang sedang trending di komunitas online Indonesia. Apa perspektif dan opini yang berkembang?`,
      popularity: post.ups || post.score || 25,
      timestamp: new Date(post.created_utc * 1000)
    }));
  }

  private static removeDuplicates(topics: TrendingTopic[]): TrendingTopic[] {
    const seen = new Set();
    return topics.filter(topic => {
      // Create key berdasarkan judul yang sudah dibersihkan
      const cleanTitle = topic.title.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special chars
        .trim();
      
      if (seen.has(cleanTitle)) {
        return false;
      }
      seen.add(cleanTitle);
      return true;
    });
  }

  // Method untuk admin refresh trending data
  static async refreshTrendingData(): Promise<boolean> {
    try {
      console.log('Admin refreshing trending data...');
      const topics = await this.getTrendingTopics(true);
      return topics.length > 0;
    } catch (error) {
      console.error('Failed to refresh trending data:', error);
      return false;
    }
  }

  // Get cache info untuk debugging
  static getCacheInfo(): { 
    hasCachedData: boolean; 
    lastUpdated: Date | null; 
    expiresAt: Date | null;
    topicsCount: number;
  } {
    return {
      hasCachedData: !!this.cache,
      lastUpdated: this.cache?.lastUpdated || null,
      expiresAt: this.cacheExpiry,
      topicsCount: this.cache?.topics.length || 0
    };
  }

  // Clear cache (untuk testing)
  static clearCache(): void {
    this.cache = null;
    this.cacheExpiry = null;
    console.log('Trending cache cleared');
  }
}

export default TrendingAPI;