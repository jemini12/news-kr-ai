import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseCache {
  private static instance: SupabaseCache;
  
  static getInstance(): SupabaseCache {
    if (!SupabaseCache.instance) {
      SupabaseCache.instance = new SupabaseCache();
    }
    return SupabaseCache.instance;
  }

  private getAnalysisHash(title: string): string {
    return crypto.createHash('md5').update(title).digest('hex');
  }

  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  async setNewsBriefing(data: any): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour from now

      const { error } = await supabase
        .from('cache_entries')
        .upsert({
          cache_key: 'news_briefing',
          cache_type: 'news_briefing',
          data,
          expires_at: expiresAt.toISOString()
        });

      if (error) {
        console.error('Error caching news briefing:', error);
      }
    } catch (error) {
      console.error('Error in setNewsBriefing:', error);
    }
  }

  async getNewsBriefing(): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('cache_entries')
        .select('data, expires_at')
        .eq('cache_key', 'news_briefing')
        .eq('cache_type', 'news_briefing')
        .single();

      if (error || !data) {
        return null;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        // Clean up expired entry
        await this.deleteEntry('news_briefing');
        return null;
      }

      return data.data;
    } catch (error) {
      console.error('Error in getNewsBriefing:', error);
      return null;
    }
  }

  async setAnalysis(title: string, analysis: any): Promise<void> {
    try {
      const cacheKey = this.getAnalysisHash(title);

      const { error } = await supabase
        .from('cache_entries')
        .upsert({
          cache_key: cacheKey,
          cache_type: 'analysis',
          data: analysis,
          expires_at: null // Never expires
        });

      if (error) {
        console.error('Error caching analysis:', error);
      }
    } catch (error) {
      console.error('Error in setAnalysis:', error);
    }
  }

  async getAnalysis(title: string): Promise<any | null> {
    try {
      const cacheKey = this.getAnalysisHash(title);

      const { data, error } = await supabase
        .from('cache_entries')
        .select('data')
        .eq('cache_key', cacheKey)
        .eq('cache_type', 'analysis')
        .single();

      if (error || !data) {
        return null;
      }

      return data.data;
    } catch (error) {
      console.error('Error in getAnalysis:', error);
      return null;
    }
  }

  private async deleteEntry(cacheKey: string): Promise<void> {
    try {
      await supabase
        .from('cache_entries')
        .delete()
        .eq('cache_key', cacheKey);
    } catch (error) {
      console.error('Error deleting cache entry:', error);
    }
  }

  async setSummary(summary: any): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6); // 6 hour cache

      const cacheKey = `summary_${this.getTodayKey()}`;

      const { error } = await supabase
        .from('cache_entries')
        .upsert({
          cache_key: cacheKey,
          cache_type: 'summary',
          data: summary,
          expires_at: expiresAt.toISOString()
        });

      if (error) {
        console.error('Error caching summary:', error);
      }
    } catch (error) {
      console.error('Error in setSummary:', error);
    }
  }

  async getSummary(): Promise<any | null> {
    try {
      const cacheKey = `summary_${this.getTodayKey()}`;

      const { data, error } = await supabase
        .from('cache_entries')
        .select('data, expires_at')
        .eq('cache_key', cacheKey)
        .eq('cache_type', 'summary')
        .single();

      if (error || !data) {
        return null;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        await this.deleteEntry(cacheKey);
        return null;
      }

      return data.data;
    } catch (error) {
      console.error('Error in getSummary:', error);
      return null;
    }
  }

  async cleanup(): Promise<number> {
    try {
      const { error } = await supabase.rpc('clean_expired_cache');
      
      if (error) {
        console.error('Error cleaning expired cache:', error);
        return 0;
      }

      return 0; // Function doesn't return count in this implementation
    } catch (error) {
      console.error('Error in cleanup:', error);
      return 0;
    }
  }
}

export const cache = SupabaseCache.getInstance();