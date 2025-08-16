import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cache } from '../../../../lib/supabase-cache';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SummaryResponse {
  overall: string;
  by_investigation: {
    "내란특검": string;
    "김건희특검": string;
    "채상병특검": string;
  };
  key_developments: string[];
  top_keywords: string[];
  tone: "urgent" | "normal" | "quiet";
  article_count: number;
  generated_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const { articles } = await request.json();
    
    if (!articles || articles.length === 0) {
      return NextResponse.json({ error: 'No articles provided' }, { status: 400 });
    }

    // Check cache first
    const cachedSummary = await cache.getSummary();
    if (cachedSummary) {
      console.log('Using cached summary');
      return NextResponse.json({ summary: cachedSummary });
    }

    console.log(`Generating summary for ${articles.length} articles`);

    // Prepare articles data for OpenAI
    const articlesForSummary = articles.map((article: any) => ({
      title: article.title,
      keyword: article.keyword,
      keywords: article.keywords,
      relevanceScore: article.relevanceScore,
      category: article.category,
      analysisReason: article.analysisReason
    }));

    const prompt = `오늘의 3대 특검 수사 브리핑을 정중하고 친근한 어조로 작성해주세요.

분석된 기사 데이터:
${JSON.stringify(articlesForSummary, null, 2)}

다음 형식으로 한국어 요약을 작성해주세요. 모든 문장은 ~습니다 체를 사용하여 정중하게 작성해주세요:

{
  "overall": "오늘의 전체적인 특검 수사 동향을 자연스럽고 읽기 쉽게 작성합니다. 여러 문장으로 구성하되 각 항목을 자연스럽게 나열해주세요.",
  "by_investigation": {
    "내란특검": "내란 특검 관련 주요 진행사항을 ~습니다 체로 정중하고 자연스럽게 작성 (해당 기사가 없으면 '특별한 동향이 없었습니다')",
    "김건희특검": "김건희 특검 관련 주요 진행사항을 ~습니다 체로 정중하고 자연스럽게 작성 (해당 기사가 없으면 '특별한 동향이 없었습니다')",
    "채상병특검": "채상병 특검 관련 주요 진행사항을 ~습니다 체로 정중하고 자연스럽게 작성 (해당 기사가 없으면 '특별한 동향이 없었습니다')"
  },
  "key_developments": ["오늘의 가장 중요한 발전사항 3개를 ~습니다 체로 정중하고 자연스럽게 배열로 작성"],
  "top_keywords": ["오늘 가장 중요하고 자주 언급된 키워드 3개를 중요도 순으로 배열 (단, '내란특검', '김건희특검', '채상병특검'은 제외하고 실제 수사 내용과 관련된 구체적인 키워드만 포함)"],
  "tone": "urgent|normal|quiet 중 하나 (수사 강도와 중요도에 따라)"
}

모든 내용은 정중하고 친근한 ~습니다 체로 자연스럽게 작성해주세요. JSON 형식으로만 응답해주세요.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const responseContent = completion.choices[0].message.content || '{}';
    console.log('OpenAI Summary Response:', responseContent);
    
    let summaryData: SummaryResponse;
    try {
      const parsedSummary = JSON.parse(responseContent);
      summaryData = {
        ...parsedSummary,
        article_count: articles.length,
        generated_at: new Date().toISOString()
      };
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      // Fallback summary
      summaryData = {
        overall: "오늘의 특검 수사 동향 분석 중 오류가 발생했습니다.",
        by_investigation: {
          "내란특검": "분석 중 오류 발생",
          "김건희특검": "분석 중 오류 발생", 
          "채상병특검": "분석 중 오류 발생"
        },
        key_developments: ["요약 생성 실패"],
        top_keywords: ["분석 실패"],
        tone: "normal",
        article_count: articles.length,
        generated_at: new Date().toISOString()
      };
    }

    // Cache the summary (6 hours)
    await cache.setSummary(summaryData);
    console.log('Summary cached successfully');

    return NextResponse.json({ summary: summaryData });

  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}