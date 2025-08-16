import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cache } from '../../../../lib/supabase-cache';

export const dynamic = 'force-dynamic'; // POST routes need dynamic handling

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getRelevanceIcons(score: number): string {
  if (score >= 9) return '🔥🔥🔥'; // 9-10: Critical relevance
  if (score >= 7) return '🔥🔥';   // 7-8: High relevance  
  if (score >= 6) return '🔥';     // 6: Medium relevance
  return '';                       // <6: Not shown (filtered out)
}


export async function POST(request: NextRequest) {
  try {
    const { articles } = await request.json();
    
    const analyzedArticles = await Promise.all(
      articles.map(async (article: any) => {
        try {
          // Check cache first
          const cachedAnalysis = await cache.getAnalysis(article.title);
          if (cachedAnalysis) {
            console.log('Using cached analysis for:', article.title);
            return {
              ...article,
              relevanceScore: cachedAnalysis.score,
              relevanceIcons: getRelevanceIcons(cachedAnalysis.score),
              analysisReason: cachedAnalysis.reason,
              category: cachedAnalysis.category
            };
          }

          console.log('Calling OpenAI for:', article.title);
          const prompt = `
다음 뉴스 제목을 분석해서 특검 수사와의 관련성을 0-10점으로 점수를 매겨주세요.

제목: "${article.title}"
키워드: ${article.keyword}

점수 기준:
- 0-3점: 특검과 무관한 일반 정치 뉴스
- 4-6점: 특검 관련 인물이나 배경 언급
- 7-8점: 특검 수사 진행 상황 관련
- 9-10점: 특검 핵심 수사 내용 (기소, 영장, 압수수색 등)

응답 형식 (JSON):
{
  "score": 숫자,
  "reason": "점수 이유 한 줄",
  "category": "핵심수사|진행상황|관련인물|일반정치"
}`;

          const completion = await openai.chat.completions.create({
            model: "gpt-5-nano",
            messages: [{ role: "user", content: prompt }],
          });

          const responseContent = completion.choices[0].message.content || '{"score": 5, "reason": "분석 실패", "category": "일반정치"}';
          console.log('OpenAI Response:', responseContent);
          
          const analysis = JSON.parse(responseContent);
          
          // Cache the analysis (permanent)
          await cache.setAnalysis(article.title, analysis);
          
          return {
            ...article,
            relevanceScore: analysis.score,
            relevanceIcons: getRelevanceIcons(analysis.score),
            analysisReason: analysis.reason,
            category: analysis.category
          };
        } catch (error) {
          console.error('Error analyzing article:', error);
          return {
            ...article,
            relevanceScore: 5,
            relevanceIcons: '',
            analysisReason: "분석 실패",
            category: "일반정치"
          };
        }
      })
    );

    const filteredArticles = analyzedArticles
      .filter(article => article.relevanceScore >= 6)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return NextResponse.json({
      analyzed: analyzedArticles.length,
      filtered: filteredArticles.length,
      articles: filteredArticles
    });

  } catch (error) {
    console.error('Error in analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze articles' },
      { status: 500 }
    );
  }
}