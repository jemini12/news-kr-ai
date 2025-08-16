'use client';

import { useState, useEffect } from 'react';

interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  keyword: string;
  keywords?: string[]; // Multiple keywords for articles appearing in multiple categories
  relevanceScore?: number;
  relevanceIcons?: string;
  analysisReason?: string;
  category?: string;
}

interface BriefingData {
  timestamp: string;
  totalArticles: number;
  keywords: string[];
  articles: NewsItem[];
}

interface SummaryData {
  overall: string;
  by_investigation: {
    "내란특검": string;
    "김건희특검": string;
    "채상병특검": string;
  };
  key_developments: string[];
  tone: "urgent" | "normal" | "quiet";
  article_count: number;
  generated_at: string;
}

export default function Home() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 10;

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

      // Generate summary in background (non-blocking)
      generateSummary(data.articles);
    } catch (error) {
      console.error('Error analyzing articles:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateSummary = async (articlesToSummarize?: any[]) => {
    const articles = articlesToSummarize || briefing?.articles;
    if (!articles || articles.length === 0) return;

    // Check for cached summary first
    try {
      setGeneratingSummary(true);
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles })
      });
      const data = await response.json();
      
      setSummary(data.summary);
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const filteredArticles = briefing?.articles.filter(article => {
    // Filter by category
    const categoryMatch = selectedKeyword === 'all' || 
      article.keyword === selectedKeyword || 
      (article.keywords && article.keywords.includes(selectedKeyword));
    
    // Filter by search keyword
    const searchMatch = searchKeyword === '' || 
      article.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      article.description.toLowerCase().includes(searchKeyword.toLowerCase());
    
    return categoryMatch && searchMatch;
  }) || [];

  // Reset to page 1 when filtering changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKeyword, searchKeyword]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
  const startIndex = (currentPage - 1) * articlesPerPage;
  const endIndex = startIndex + articlesPerPage;
  const currentArticles = filteredArticles.slice(startIndex, endIndex);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getToneText = (tone: string) => {
    switch (tone) {
      case 'urgent': return '[긴급]';
      case 'normal': return '[보통]';
      case 'quiet': return '[조용]';
      default: return '[보통]';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-5xl mx-auto px-4">
        <header className="text-center mb-8 border-b border-gray-300 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            3대 특검 뉴스 브리핑
          </h1>
          <p className="text-gray-600">
            내란 특검 · 김건희 특검 · 채상병 특검
          </p>
        </header>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">뉴스를 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* Daily Summary Section */}
            {(summary || generatingSummary) && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">

                {generatingSummary ? (
                  <div className="text-center py-4">
                    <p className="text-gray-600">요약을 생성하고 있습니다...</p>
                  </div>
                ) : summary ? (
                  <div className="space-y-4">
                    {/* Overall Summary */}
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {summary.overall}
                    </div>

                    {/* Investigation Breakdown */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">특검별 현황</h3>
                      <div className="space-y-2 text-gray-700">
                        <div>
                          <strong>내란 특검:</strong> {summary.by_investigation.내란특검}
                        </div>
                        <div>
                          <strong>김건희 특검:</strong> {summary.by_investigation.김건희특검}
                        </div>
                        <div>
                          <strong>채상병 특검:</strong> {summary.by_investigation.채상병특검}
                        </div>
                      </div>
                    </div>

                    {/* Key Developments */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">주요 발전사항</h3>
                      <ul className="space-y-1 text-gray-700">
                        {summary.key_developments.map((development, index) => (
                          <li key={index}>
                            • {development}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex justify-between mb-4 text-sm text-gray-600">
                <div>총 {filteredArticles.length}개 기사</div>
                <div>({currentPage}/{totalPages} 페이지)</div>
              </div>
              
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="기사 제목이나 내용에서 검색..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                  {searchKeyword && (
                    <button
                      onClick={() => setSearchKeyword('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Category Filters */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedKeyword('all')}
                    className={`px-3 py-2 rounded text-sm ${
                      selectedKeyword === 'all' 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    전체
                  </button>
                  {briefing?.keywords.map((keyword) => (
                    <button
                      key={keyword}
                      onClick={() => setSelectedKeyword(keyword)}
                      className={`px-3 py-2 rounded text-sm ${
                        selectedKeyword === keyword 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {currentArticles.map((article, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex justify-between mb-3">
                    <div className="flex gap-2 flex-wrap">
                      {article.keywords && article.keywords.length > 1 ? (
                        article.keywords.map((keyword, keywordIndex) => (
                          <span key={keywordIndex} className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {keyword}
                          </span>
                        ))
                      ) : (
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {article.keyword}
                        </span>
                      )}
                      {article.relevanceIcons && (
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {article.relevanceIcons}
                        </span>
                      )}
                      {article.category && (
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {article.category}
                        </span>
                      )}
                    </div>
                    <time className="text-sm text-gray-500">
                      {formatDate(article.pubDate)}
                    </time>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-3 leading-tight">
                    <a 
                      href={article.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-900 hover:text-gray-600"
                    >
                      {article.title}
                    </a>
                  </h3>
                  
                  <p className="text-gray-700 mb-3 leading-relaxed">
                    {article.description}
                  </p>
                  
                  {article.analysisReason && (
                    <p className="text-sm bg-gray-50 border-l-4 border-gray-300 p-3 mb-3">
                      <span className="font-medium">AI 분석:</span> {article.analysisReason}
                    </p>
                  )}
                  
                  <div>
                    <a 
                      href={article.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900 text-sm"
                    >
                      기사 전문 보기 →
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mt-6">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {startIndex + 1}-{Math.min(endIndex, filteredArticles.length)} / {filteredArticles.length}개 기사
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-3 py-2 rounded text-sm"
                    >
                      ← 이전
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      const showPage = page === 1 || page === totalPages || 
                                      Math.abs(page - currentPage) <= 1;
                      
                      if (!showPage) {
                        if (page === 2 && currentPage > 4) return <span key={page} className="px-2 text-gray-400">...</span>;
                        if (page === totalPages - 1 && currentPage < totalPages - 3) return <span key={page} className="px-2 text-gray-400">...</span>;
                        return null;
                      }
                      
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded text-sm ${
                            currentPage === page
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-3 py-2 rounded text-sm"
                    >
                      다음 →
                    </button>
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
