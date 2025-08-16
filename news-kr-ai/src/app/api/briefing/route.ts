import { NextResponse } from 'next/server';
import axios from 'axios';
import { cache } from '../../../../lib/supabase-cache';

export const revalidate = 3600; // 1 hour cache

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BASE_URL = "https://openapi.naver.com/v1/search/news.json";

const KEYWORDS = [
  "내란 특검",
  "김건희 특검", 
  "채상병 특검"
];

interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  keyword: string;
}

function cleanHtmlTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
}

export async function GET() {
  try {
    // Check cache first
    const cachedData = await cache.getNewsBriefing();
    if (cachedData) {
      console.log('Using cached data');
      return NextResponse.json({ briefing: cachedData }, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
        }
      });
    }

    console.log('Fetching fresh data from Naver API');
    const allResults = await Promise.all(
      KEYWORDS.map(async (keyword) => {
        const response = await axios.get(BASE_URL, {
          headers: {
            'X-Naver-Client-Id': CLIENT_ID,
            'X-Naver-Client-Secret': CLIENT_SECRET
          },
          params: {
            query: keyword,
            display: 100,
            start: 1,
            sort: 'date'
          }
        });

        return response.data.items.map((item: any) => ({
          title: cleanHtmlTags(item.title),
          description: cleanHtmlTags(item.description),
          link: item.link,
          pubDate: item.pubDate,
          keyword
        }));
      })
    );

    const flatResults = allResults.flat();
    
    // Group articles by title and collect all keywords
    const articleMap = new Map();
    flatResults.forEach(article => {
      const existing = articleMap.get(article.title);
      if (existing) {
        // Add keyword to existing article if not already present
        if (!existing.keywords.includes(article.keyword)) {
          existing.keywords.push(article.keyword);
          console.log(`Added keyword "${article.keyword}" to article: ${article.title.substring(0, 50)}...`);
        }
      } else {
        articleMap.set(article.title, {
          ...article,
          keywords: [article.keyword] // Convert single keyword to array
        });
      }
    });
    
    const uniqueArticles = Array.from(articleMap.values());
    console.log(`Processed ${flatResults.length} articles into ${uniqueArticles.length} unique articles`);
    
    const briefingData = {
      timestamp: new Date().toISOString(),
      totalArticles: uniqueArticles.length,
      keywords: KEYWORDS,
      articles: uniqueArticles
    };

    // Cache the fresh data
    await cache.setNewsBriefing(briefingData);
    console.log('Data cached successfully');
    
    return NextResponse.json({ briefing: briefingData }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });

  } catch (error) {
    console.error('Error fetching briefing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news briefing' },
      { status: 500 }
    );
  }
}