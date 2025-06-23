import { NextRequest, NextResponse } from 'next/server';

// Indonesian news sources
const NEWS_SOURCES = [
  'detik.com',
  'kompas.com',
  'liputan6.com',
  'cnn.co.id',
  'okezone.com',
  'tribunnews.com'
];

export async function GET(request: NextRequest) {
  try {
    // Option 1: Using NewsAPI (requires API key)
    if (process.env.NEWS_API_KEY) {
      const newsApiUrl = `https://newsapi.org/v2/top-headlines?country=id&apiKey=${process.env.NEWS_API_KEY}&pageSize=10`;
      
      const response = await fetch(newsApiUrl);
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          success: true,
          articles: data.articles
        });
      }
    }

    // Option 2: RSS Feed parsing (free alternative)
    const rssFeeds = [
      'https://www.detik.com/tag/trending/rss',
      'https://rss.cnn.com/rss/edition.rss'
    ];

    const feedPromises = rssFeeds.map(async (feedUrl) => {
      try {
        const response = await fetch(feedUrl);
        const text = await response.text();
        return parseRSSFeed(text);
      } catch (error) {
        console.warn(`Failed to fetch RSS feed: ${feedUrl}`, error);
        return [];
      }
    });

    const allFeeds = await Promise.all(feedPromises);
    const articles = allFeeds.flat().slice(0, 10);

    // Option 3: Fallback trending topics
    if (articles.length === 0) {
      const fallbackArticles = [
        {
          title: "Perkembangan AI Generative di Indonesia Mencapai Rekor Tertinggi",
          source: { name: "Tech Indonesia" },
          description: "Adopsi teknologi AI generative di Indonesia mengalami peningkatan signifikan pada 2024."
        },
        {
          title: "Ekonomi Digital Indonesia Tumbuh 20% Year-on-Year",
          source: { name: "Economic Times" },
          description: "Pertumbuhan ekonomi digital Indonesia didorong oleh UMKM dan fintech."
        },
        {
          title: "Startup Unicorn Baru dari Indonesia Raih Valuasi $1 Miliar",
          source: { name: "Startup News" },
          description: "Startup teknologi finansial Indonesia mencapai status unicorn."
        },
        {
          title: "Program Merdeka Belajar Transformasi Pendidikan Digital",
          source: { name: "Education Today" },
          description: "Implementasi teknologi dalam pendidikan menunjukkan hasil positif."
        },
        {
          title: "Tren Wisata Berkelanjutan Meningkat di Destinasi Indonesia",
          source: { name: "Travel Indonesia" },
          description: "Wisatawan domestik dan internasional mulai memilih destinasi ramah lingkungan."
        }
      ];

      return NextResponse.json({
        success: true,
        articles: fallbackArticles,
        source: 'fallback'
      });
    }

    return NextResponse.json({
      success: true,
      articles: articles
    });

  } catch (error) {
    console.error('News API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch news',
        articles: [] 
      },
      { status: 500 }
    );
  }
}

// Simple RSS parser (untuk fallback)
function parseRSSFeed(rssText: string): any[] {
  try {
    // Simple regex parsing untuk RSS (production: gunakan xml2js)
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/g;
    const linkRegex = /<link>(.*?)<\/link>/g;
    
    const titles = [];
    const links: string[] = [];
    
    let titleMatch;
    while ((titleMatch = titleRegex.exec(rssText)) !== null) {
      titles.push(titleMatch[1]);
    }
    
    let linkMatch;
    while ((linkMatch = linkRegex.exec(rssText)) !== null) {
      links.push(linkMatch[1]);
    }
    
    return titles.slice(0, 5).map((title, index) => ({
      title: title,
      source: { name: "RSS Feed" },
      url: links[index] || '#',
      description: `Berita trending: ${title}`
    }));
    
  } catch (error) {
    console.error('RSS parsing error:', error);
    return [];
  }
}