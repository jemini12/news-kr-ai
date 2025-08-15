'use client';

import { useState, useEffect } from 'react';

interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  keyword: string;
  relevanceScore?: number;
  analysisReason?: string;
  category?: string;
}

interface BriefingData {
  timestamp: string;
  totalArticles: number;
  keywords: string[];
  articles: NewsItem[];
}

export default function Home() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<string>('all');

  useEffect(() => {
    fetchBriefing();
  }, []);

  const fetchBriefing = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/briefing');
      const data = await response.json();
      setBriefing(data.briefing);
      
      // Auto-trigger AI analysis after fetching news
      await analyzeRelevance(data.briefing.articles);
    } catch (error) {
      console.error('Error fetching briefing:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeRelevance = async (articlesToAnalyze?: any[]) => {
    const articles = articlesToAnalyze || briefing?.articles;
    if (!articles) return;
    
    try {
      setAnalyzing(true);
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles })
      });
      const data = await response.json();
      
      setBriefing(prev => ({
        ...prev!,
        articles: data.articles,
        totalArticles: data.filtered
      }));
    } catch (error) {
      console.error('Error analyzing articles:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredArticles = briefing?.articles.filter(article => 
    selectedKeyword === 'all' || article.keyword === selectedKeyword
  ) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            3대 특검 뉴스 브리핑
          </h1>
          <p className="text-gray-600">
            내란 특검 · 김건희 특검 · 채상병 특검 최신 뉴스
          </p>
        </header>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">뉴스를 불러오는 중...</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex flex-wrap items-center justify-between mb-4">
                <div className="text-sm text-gray-500">
                  마지막 업데이트: {briefing && formatDate(briefing.timestamp)}
                </div>
                <div className="text-sm text-gray-500">
                  총 {briefing?.totalArticles}개 기사
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedKeyword('all')}
                    className={`px-4 py-2 rounded-full text-sm ${
                      selectedKeyword === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    전체
                  </button>
                  {briefing?.keywords.map((keyword) => (
                    <button
                      key={keyword}
                      onClick={() => setSelectedKeyword(keyword)}
                      className={`px-4 py-2 rounded-full text-sm ${
                        selectedKeyword === keyword
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={fetchBriefing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  새로고침
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredArticles.map((article, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        {article.keyword}
                      </span>
                      {article.relevanceScore && (
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          article.relevanceScore >= 9 ? 'bg-red-100 text-red-800' :
                          article.relevanceScore >= 7 ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {article.relevanceScore}/10
                        </span>
                      )}
                      {article.category && (
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {article.category}
                        </span>
                      )}
                    </div>
                    <time className="text-sm text-gray-500">
                      {formatDate(article.pubDate)}
                    </time>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                    <a 
                      href={article.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 transition-colors"
                    >
                      {article.title}
                    </a>
                  </h3>
                  
                  <p className="text-gray-600 mb-3 leading-relaxed">
                    {article.description}
                  </p>
                  
                  {article.analysisReason && (
                    <p className="text-sm text-blue-600 mb-3 bg-blue-50 p-2 rounded">
                      💡 AI 분석: {article.analysisReason}
                    </p>
                  )}
                  
                  <a 
                    href={article.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    기사 전문 보기 →
                  </a>
                </div>
              ))}
            </div>

          </>
        )}
      </div>
    </div>
  );
}
