import { NextRequest, NextResponse } from 'next/server';

// Indonesian news sources RSS feeds
const NEWS_SOURCES = [
  {
    name: 'Detik',
    url: 'https://rss.detik.com/index.php/detikcom',
    category: 'Umum'
  },
  {
    name: 'Kompas',
    url: 'https://www.kompas.com/rss/',
    category: 'Umum'
  },
  {
    name: 'CNN Indonesia',
    url: 'https://www.cnnindonesia.com/rss/',
    category: 'Berita'
  },
  {
    name: 'Liputan6',
    url: 'https://www.liputan6.com/rss',
    category: 'Berita'
  }
];

interface NewsArticle {
  title: string;
  description?: string;
  link?: string;
  pubDate?: string;
  source: { name: string };
  category?: string;
}

// Simple RSS parser untuk extract basic info
function parseRSSFeed(rssText: string, sourceName: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  
  try {
    // Extract items menggunakan regex (simple approach)
    const itemRegex = /<item>(.*?)<\/item>/gs;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/s;
    const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s;
    const linkRegex = /<link>(.*?)<\/link>/s;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/s;
    
    let match;
    while ((match = itemRegex.exec(rssText)) !== null && articles.length < 10) {
      const itemContent = match[1];
      
      const titleMatch = titleRegex.exec(itemContent);
      const descMatch = descRegex.exec(itemContent);
      const linkMatch = linkRegex.exec(itemContent);
      const pubDateMatch = pubDateRegex.exec(itemContent);
      
      const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
      
      if (title && title.length > 10) {
        articles.push({
          title,
          description: descMatch ? (descMatch[1] || descMatch[2] || '').trim() : '',
          link: linkMatch ? linkMatch[1].trim() : '',
          pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
          source: { name: sourceName }
        });
      }
    }
  } catch (error) {
    console.warn(`Failed to parse RSS feed from ${sourceName}:`, error);
  }
  
  return articles;
}

// Fallback news jika RSS feeds gagal
function getFallbackNews(): NewsArticle[] {
  return [
    {
      title: "Perkembangan AI Generative di Indonesia Mencapai Rekor Tertinggi 2024",
      description: "Adopsi teknologi AI generative di Indonesia mengalami peningkatan signifikan, terutama di sektor UMKM dan startup teknologi.",
      source: { name: "Tech Indonesia" },
      pubDate: new Date().toISOString(),
      category: "Teknologi"
    },
    {
      title: "Ekonomi Digital Indonesia Tumbuh 25% Year-on-Year",
      description: "Pertumbuhan ekonomi digital Indonesia didorong oleh penetrasi internet yang meningkat dan adopsi fintech.",
      source: { name: "Economic Times Indonesia" },
      pubDate: new Date().toISOString(),
      category: "Ekonomi"
    },
    {
      title: "Startup Unicorn Baru dari Indonesia Raih Valuasi $1.2 Miliar",
      description: "Startup teknologi finansial Indonesia berhasil mencapai status unicorn dengan inovasi pembayaran digital.",
      source: { name: "Startup News Indonesia" },
      pubDate: new Date().toISOString(),
      category: "Bisnis"
    },
    {
      title: "Program Merdeka Belajar: Transformasi Pendidikan Digital Nasional",
      description: "Implementasi teknologi dalam pendidikan menunjukkan hasil positif dengan peningkatan literasi digital.",
      source: { name: "Education Today" },
      pubDate: new Date().toISOString(),
      category: "Pendidikan"
    },
    {
      title: "Tren Wisata Berkelanjutan Meningkat di Destinasi Indonesia",
      description: "Wisatawan domestik dan internasional mulai memilih destinasi ramah lingkungan dan berkelanjutan.",
      source: { name: "Travel Indonesia" },
      pubDate: new Date().toISOString(),
      category: "Pariwisata"
    },
    {
      title: "Fintech Syariah Indonesia Raih Pertumbuhan 40% di 2024",
      description: "Sektor finansial teknologi syariah menunjukkan pertumbuhan yang konsisten dengan dukungan regulasi OJK.",
      source: { name: "Finance Indonesia" },
      pubDate: new Date().toISOString(),
      category: "Finansial"
    },
    {
      title: "E-Sports Indonesia Masuk Top 5 Asia Tenggara",
      description: "Prestasi atlet e-sports Indonesia di kompetisi regional menunjukkan perkembangan industri gaming lokal.",
      source: { name: "Gaming Indonesia" },
      pubDate: new Date().toISOString(),
      category: "Gaming"
    },
    {
      title: "Musik Pop Indonesia Trending di Platform Digital Global",
      description: "Artis Indonesia berhasil menembus pasar internasional melalui platform streaming musik digital.",
      source: { name: "Music Indonesia" },
      pubDate: new Date().toISOString(),
      category: "Hiburan"
    }
  ];
}

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching Indonesian news headlines...');
    
    // Option 1: Try NewsAPI if API key available
    if (process.env.NEWS_API_KEY) {
      try {
        const newsApiUrl = `https://newsapi.org/v2/top-headlines?country=id&apiKey=${process.env.NEWS_API_KEY}&pageSize=15&category=general`;
        
        const response = await fetch(newsApiUrl, {
          headers: {
            'User-Agent': 'AI-Chatbot/1.0'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.articles && data.articles.length > 0) {
            console.log(`NewsAPI returned ${data.articles.length} articles`);
            return NextResponse.json({
              success: true,
              articles: data.articles,
              source: 'NewsAPI'
            });
          }
        }
      } catch (error) {
        console.warn('NewsAPI failed:', error);
      }
    }

    // Option 2: Try RSS feeds from Indonesian news sources
    const rssPromises = NEWS_SOURCES.map(async (source) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(source.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AI-Chatbot/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const text = await response.text();
          const articles = parseRSSFeed(text, source.name);
          console.log(`RSS ${source.name} returned ${articles.length} articles`);
          return articles;
        }
      } catch (error) {
        console.warn(`Failed to fetch RSS from ${source.name}:`, error);
      }
      return [];
    });

    const allRSSResults = await Promise.allSettled(rssPromises);
    const allArticles: NewsArticle[] = [];
    
    allRSSResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      }
    });

    // Filter dan limit articles
    const uniqueArticles = allArticles
      .filter((article, index, self) => 
        index === self.findIndex(a => a.title === article.title)
      )
      .slice(0, 12);

    if (uniqueArticles.length > 0) {
      console.log(`RSS feeds returned ${uniqueArticles.length} unique articles`);
      return NextResponse.json({
        success: true,
        articles: uniqueArticles,
        source: 'RSS'
      });
    }

    // Option 3: Fallback to curated trending topics
    console.log('Using fallback news data');
    const fallbackNews = getFallbackNews();
    
    return NextResponse.json({
      success: true,
      articles: fallbackNews,
      source: 'Fallback'
    });

  } catch (error) {
    console.error('Error in trending news API:', error);
    
    // Return fallback on any error
    return NextResponse.json({
      success: true,
      articles: getFallbackNews(),
      source: 'Error-Fallback'
    });
  }
}