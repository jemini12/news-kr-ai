import { NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

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

const CACHE_DIR = path.join(process.cwd(), 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'news-briefing.json');
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

function cleanHtmlTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCachedData() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return null;
    }
    
    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const now = Date.now();
    
    if (now - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached data');
      return cached.data;
    }
    
    console.log('Cache expired');
    return null;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

function setCachedData(data: any) {
  try {
    ensureCacheDir();
    const cacheData = {
      timestamp: Date.now(),
      data
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log('Data cached successfully');
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

export async function GET() {
  try {
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      return NextResponse.json({ briefing: cachedData });
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
    
    const briefingData = {
      timestamp: new Date().toISOString(),
      totalArticles: flatResults.length,
      keywords: KEYWORDS,
      articles: flatResults
    };

    // Cache the fresh data
    setCachedData(briefingData);
    
    return NextResponse.json({ briefing: briefingData });

  } catch (error) {
    console.error('Error fetching briefing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news briefing' },
      { status: 500 }
    );
  }
}