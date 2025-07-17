import { supabase } from './supabase';
import { Bookmark, BookmarkInput } from '../types';

export class BookmarkAPI {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static cache = new Map<string, { data: any; timestamp: number }>();

  static async createBookmark(input: BookmarkInput, userId: string): Promise<Bookmark> {
    const startTime = Date.now();
    
    try {
      // Validate input
      this.validateBookmarkInput(input);
      
      // Parallel processing for better performance
      const [metadata, summary, maxPosition] = await Promise.allSettled([
        this.extractMetadataWithRetry(input.url),
        this.generateSummaryWithRetry(input.url),
        this.getMaxPosition(userId)
      ]);

      const metadataResult = metadata.status === 'fulfilled' ? metadata.value : this.getFallbackMetadata(input.url);
      const summaryResult = summary.status === 'fulfilled' ? summary.value : this.getFallbackSummary(input.url);
      const positionResult = maxPosition.status === 'fulfilled' ? maxPosition.value : 0;

      // Enhanced tag processing
      const processedTags = this.processAndValidateTags(input.tags || []);
      
      // Create bookmark with enhanced data
      const bookmarkData = {
        user_id: userId,
        url: this.normalizeUrl(input.url),
        title: this.sanitizeTitle(metadataResult.title),
        favicon: metadataResult.favicon,
        summary: this.enhanceSummary(summaryResult),
        tags: processedTags,
        position: positionResult + 1,
        created_at: new Date().toISOString(),
        metadata: {
          domain: this.extractDomain(input.url),
          processingTime: Date.now() - startTime,
          extractionMethod: metadataResult.method || 'fallback',
          wordCount: summaryResult.split(' ').length
        }
      };

      const { data, error } = await supabase
        .from('bookmarks')
        .insert([bookmarkData])
        .select()
        .single();

      if (error) throw this.createEnhancedError(error, 'CREATE_BOOKMARK_FAILED');
      
      // Update tag popularity cache
      this.updateTagPopularityCache(userId, processedTags);
      
      return data;
    } catch (error) {
      console.error('Bookmark creation failed:', error);
      throw this.createEnhancedError(error, 'CREATE_BOOKMARK_FAILED');
    }
  }

  static async getBookmarks(userId: string, options: {
    limit?: number;
    offset?: number;
    sortBy?: 'created_at' | 'title' | 'position';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ bookmarks: Bookmark[]; total: number; hasMore: boolean }> {
    try {
      const { limit = 50, offset = 0, sortBy = 'position', sortOrder = 'asc' } = options;
      
      // Get total count
      const { count } = await supabase
        .from('bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get bookmarks with pagination
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      if (error) throw this.createEnhancedError(error, 'FETCH_BOOKMARKS_FAILED');

      return {
        bookmarks: data || [],
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      };
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
      throw this.createEnhancedError(error, 'FETCH_BOOKMARKS_FAILED');
    }
  }

  static async searchBookmarks(
    userId: string, 
    query: string, 
    options: {
      tags?: string[];
      limit?: number;
      fuzzy?: boolean;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<Bookmark[]> {
    try {
      const { tags = [], limit = 100, fuzzy = true, dateRange } = options;
      
      let queryBuilder = supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId);

      // Enhanced text search
      if (query.trim()) {
        if (fuzzy) {
          // Fuzzy search implementation
          const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
          const searchConditions = searchTerms.map(term => 
            `title.ilike.%${term}%,summary.ilike.%${term}%,url.ilike.%${term}%`
          ).join(',');
          queryBuilder = queryBuilder.or(searchConditions);
        } else {
          queryBuilder = queryBuilder.or(
            `title.ilike.%${query}%,summary.ilike.%${query}%,url.ilike.%${query}%`
          );
        }
      }

      // Tag filtering with AND logic
      if (tags.length > 0) {
        queryBuilder = queryBuilder.contains('tags', tags);
      }

      // Date range filtering
      if (dateRange) {
        queryBuilder = queryBuilder
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await queryBuilder
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw this.createEnhancedError(error, 'SEARCH_BOOKMARKS_FAILED');

      // Client-side ranking for better relevance
      if (query.trim() && data) {
        return this.rankSearchResults(data, query);
      }

      return data || [];
    } catch (error) {
      console.error('Search failed:', error);
      throw this.createEnhancedError(error, 'SEARCH_BOOKMARKS_FAILED');
    }
  }

  static async updateBookmark(
    id: string, 
    updates: Partial<Bookmark>, 
    userId: string
  ): Promise<Bookmark> {
    try {
      // Validate updates
      if (updates.tags) {
        updates.tags = this.processAndValidateTags(updates.tags);
      }
      
      if (updates.title) {
        updates.title = this.sanitizeTitle(updates.title);
      }

      const { data, error } = await supabase
        .from('bookmarks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw this.createEnhancedError(error, 'UPDATE_BOOKMARK_FAILED');
      return data;
    } catch (error) {
      console.error('Update failed:', error);
      throw this.createEnhancedError(error, 'UPDATE_BOOKMARK_FAILED');
    }
  }

  static async deleteBookmark(id: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw this.createEnhancedError(error, 'DELETE_BOOKMARK_FAILED');
    } catch (error) {
      console.error('Delete failed:', error);
      throw this.createEnhancedError(error, 'DELETE_BOOKMARK_FAILED');
    }
  }

  static async bulkUpdatePositions(bookmarks: { id: string; position: number }[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .upsert(bookmarks.map(b => ({ id: b.id, position: b.position })));

      if (error) throw this.createEnhancedError(error, 'BULK_UPDATE_FAILED');
    } catch (error) {
      console.error('Bulk update failed:', error);
      throw this.createEnhancedError(error, 'BULK_UPDATE_FAILED');
    }
  }

  static async getAnalytics(userId: string): Promise<{
    totalBookmarks: number;
    bookmarksThisWeek: number;
    bookmarksThisMonth: number;
    topTags: { tag: string; count: number }[];
    topDomains: { domain: string; count: number }[];
    activityChart: { date: string; count: number }[];
  }> {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('created_at, tags, url')
        .eq('user_id', userId);

      if (error) throw error;

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const analytics = {
        totalBookmarks: data.length,
        bookmarksThisWeek: data.filter(b => new Date(b.created_at) > weekAgo).length,
        bookmarksThisMonth: data.filter(b => new Date(b.created_at) > monthAgo).length,
        topTags: this.calculateTopTags(data),
        topDomains: this.calculateTopDomains(data),
        activityChart: this.generateActivityChart(data)
      };

      return analytics;
    } catch (error) {
      console.error('Analytics failed:', error);
      throw this.createEnhancedError(error, 'ANALYTICS_FAILED');
    }
  }

  // Enhanced metadata extraction with multiple fallbacks
  private static async extractMetadataWithRetry(url: string): Promise<{
    title: string;
    favicon: string;
    method: string;
  }> {
    const cacheKey = `metadata_${url}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const extractors = [
      () => this.extractWithOpenGraph(url),
      () => this.extractWithLinkPreview(url),
      () => this.extractWithMercury(url),
      () => this.extractWithTextract(url),
      () => this.extractWithCORSProxy(url)
    ];

    for (const [index, extractor] of extractors.entries()) {
      try {
        const result = await this.withRetry(extractor, this.MAX_RETRIES);
        if (result.title && result.title.length > 3) {
          const enhancedResult = { ...result, method: `extractor_${index + 1}` };
          this.setCache(cacheKey, enhancedResult);
          return enhancedResult;
        }
      } catch (error) {
        console.log(`Extractor ${index + 1} failed:`, error.message);
      }
    }

    const fallback = { ...this.getFallbackMetadata(url), method: 'fallback' };
    this.setCache(cacheKey, fallback);
    return fallback;
  }

  private static async extractWithOpenGraph(url: string): Promise<{ title: string; favicon: string }> {
    const response = await fetch(`https://opengraph.io/api/1.1/site/${encodeURIComponent(url)}?app_id=demo`);
    if (!response.ok) throw new Error(`OpenGraph API failed: ${response.status}`);
    
    const data = await response.json();
    const domain = new URL(url).hostname;
    
    return {
      title: data.hybridGraph?.title || data.openGraph?.title || this.getFallbackMetadata(url).title,
      favicon: data.hybridGraph?.image || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    };
  }

  private static async extractWithMercury(url: string): Promise<{ title: string; favicon: string }> {
    const response = await fetch(`https://mercury.postlight.com/parser?url=${encodeURIComponent(url)}`, {
      headers: { 'x-api-key': 'demo' }
    });
    
    if (!response.ok) throw new Error(`Mercury API failed: ${response.status}`);
    
    const data = await response.json();
    const domain = new URL(url).hostname;
    
    return {
      title: data.title || this.getFallbackMetadata(url).title,
      favicon: data.lead_image_url || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    };
  }

  // Enhanced summary generation
  private static async generateSummaryWithRetry(url: string): Promise<string> {
    const cacheKey = `summary_${url}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const generators = [
      () => this.generateWithAIService(url),
      () => this.generateWithTextract(url),
      () => this.generateWithReadability(url),
      () => this.generateWithCORSProxy(url)
    ];

    for (const generator of generators) {
      try {
        const summary = await this.withRetry(generator, this.MAX_RETRIES);
        if (summary && summary.length > 50) {
          const enhanced = this.enhanceSummary(summary);
          this.setCache(cacheKey, enhanced);
          return enhanced;
        }
      } catch (error) {
        console.log('Summary generator failed:', error.message);
      }
    }

    const fallback = this.getFallbackSummary(url);
    this.setCache(cacheKey, fallback);
    return fallback;
  }

  private static async generateWithAIService(url: string): Promise<string> {
    // Simulated AI service - replace with actual AI API
    const response = await fetch(`https://api.meaningcloud.com/summarization-1.0`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `key=demo&url=${encodeURIComponent(url)}&sentences=3`
    });

    if (!response.ok) throw new Error('AI service failed');
    
    const data = await response.json();
    return data.summary || '';
  }

  private static async generateWithReadability(url: string): Promise<string> {
    const response = await fetch(`https://readability-api.herokuapp.com/api/content/?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error('Readability API failed');
    
    const data = await response.json();
    return this.extractSummaryFromContent(data.content || '');
  }

  // Utility methods
  private static processAndValidateTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length <= 30)
      .filter(tag => /^[a-zA-Z0-9\s-_]+$/.test(tag))
      .filter((tag, index, arr) => arr.indexOf(tag) === index)
      .slice(0, 15);
  }

  private static sanitizeTitle(title: string): string {
    return title
      .replace(/<[^>]*>/g, '')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  private static normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private static enhanceSummary(summary: string): string {
    return summary
      .replace(/\s+/g, ' ')
      .replace(/^(this|the|a|an)\s+/i, '')
      .replace(/\b(click here|read more|continue reading|learn more)\b/gi, '')
      .trim()
      .substring(0, 500);
  }

  private static rankSearchResults(bookmarks: Bookmark[], query: string): Bookmark[] {
    const queryLower = query.toLowerCase();
    
    return bookmarks
      .map(bookmark => ({
        ...bookmark,
        relevanceScore: this.calculateRelevanceScore(bookmark, queryLower)
      }))
      .sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore)
      .map(({ relevanceScore, ...bookmark }) => bookmark);
  }

  private static calculateRelevanceScore(bookmark: Bookmark, query: string): number {
    let score = 0;
    
    // Title match (highest weight)
    if (bookmark.title.toLowerCase().includes(query)) score += 10;
    
    // URL match
    if (bookmark.url.toLowerCase().includes(query)) score += 5;
    
    // Summary match
    if (bookmark.summary.toLowerCase().includes(query)) score += 3;
    
    // Tag match
    bookmark.tags.forEach(tag => {
      if (tag.toLowerCase().includes(query)) score += 7;
    });
    
    // Recency bonus
    const daysSinceCreated = (Date.now() - new Date(bookmark.created_at).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 5 - daysSinceCreated * 0.1);
    
    return score;
  }

  private static calculateTopTags(bookmarks: any[]): { tag: string; count: number }[] {
    const tagCounts = new Map<string, number>();
    
    bookmarks.forEach(bookmark => {
      bookmark.tags?.forEach((tag: string) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private static calculateTopDomains(bookmarks: any[]): { domain: string; count: number }[] {
    const domainCounts = new Map<string, number>();
    
    bookmarks.forEach(bookmark => {
      const domain = this.extractDomain(bookmark.url);
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    });
    
    return Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private static generateActivityChart(bookmarks: any[]): { date: string; count: number }[] {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const activityMap = new Map<string, number>();
    
    bookmarks.forEach(bookmark => {
      const date = new Date(bookmark.created_at).toISOString().split('T')[0];
      activityMap.set(date, (activityMap.get(date) || 0) + 1);
    });

    return last30Days.map(date => ({
      date,
      count: activityMap.get(date) || 0
    }));
  }

  // Cache management
  private static getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private static async withRetry<T>(
    fn: () => Promise<T>, 
    retries: number, 
    delay: number = this.RETRY_DELAY
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(fn, retries - 1, delay * 1.5);
      }
      throw error;
    }
  }

  private static createEnhancedError(error: any, code: string): Error {
    const enhancedError = new Error(error.message || 'Unknown error occurred');
    (enhancedError as any).code = code;
    (enhancedError as any).timestamp = new Date().toISOString();
    return enhancedError;
  }

  private static validateBookmarkInput(input: BookmarkInput): void {
    if (!input.url || typeof input.url !== 'string') {
      throw new Error('Valid URL is required');
    }
    
    try {
      new URL(input.url);
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  private static extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  private static async getMaxPosition(userId: string): Promise<number> {
    const { data } = await supabase
      .from('bookmarks')
      .select('position')
      .eq('user_id', userId)
      .order('position', { ascending: false })
      .limit(1);
    
    return data?.[0]?.position || 0;
  }

  private static updateTagPopularityCache(userId: string, tags: string[]): void {
    // Implementation for tag popularity tracking
    const cacheKey = `tag_popularity_${userId}`;
    const cached = this.getFromCache(cacheKey) || {};
    
    tags.forEach(tag => {
      cached[tag] = (cached[tag] || 0) + 1;
    });
    
    this.setCache(cacheKey, cached);
  }

  private static extractSummaryFromContent(content: string): string {
    const sentences = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 20)
      .slice(0, 3);
    
    return sentences.join('. ').trim() + '.';
  }

  private static getFallbackMetadata(url: string): { title: string; favicon: string } {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname;
      
      let title = domain.charAt(0).toUpperCase() + domain.slice(1);
      
      if (path && path !== '/' && path.length > 1) {
        const pathParts = path.split('/').filter(part => part);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1]
            .replace(/[-_]/g, ' ')
            .replace(/\.[^.]*$/, '')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          if (lastPart.length > 0 && lastPart.length < 50) {
            title += ` - ${lastPart}`;
          }
        }
      }
      
      return {
        title,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
      };
    } catch {
      return {
        title: 'Saved Link',
        favicon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTQgN0gyMUwxNSAxMUwxNyAyMEwxMiAxNkw3IDIwTDkgMTFMMyA3SDEwTDEyIDJaIiBmaWxsPSIjNjM2NjcwIi8+Cjwvc3ZnPgo='
      };
    }
  }

  private static getFallbackSummary(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      
      const domainContexts: { [key: string]: string } = {
        'github.com': 'This is a code repository containing development resources and documentation.',
        'stackoverflow.com': 'This is a programming question with community-driven answers and solutions.',
        'medium.com': 'This is an article or blog post with insights and detailed information.',
        'dev.to': 'This is a developer community article with technical content and tutorials.',
        'youtube.com': 'This is video content with visual learning material and demonstrations.',
        'twitter.com': 'This is social media content with quick insights and discussions.',
        'linkedin.com': 'This is professional networking content with industry insights.',
        'reddit.com': 'This is community discussion with diverse perspectives and opinions.',
        'wikipedia.org': 'This is an encyclopedia article with comprehensive and factual information.',
        'docs.google.com': 'This is a collaborative document with shared information.',
        'notion.so': 'This is organized content in a structured and accessible format.'
      };
      
      for (const [key, context] of Object.entries(domainContexts)) {
        if (domain.includes(key)) {
          return `${context} This bookmark contains valuable information from ${domain} that you saved for future reference.`;
        }
      }
      
      return `This bookmark contains valuable content from ${domain}. The page includes important information that you saved for future reference and easy access.`;
    } catch {
      return 'This bookmark contains valuable content that you saved for future reference. Click to explore the full page and discover the information within.';
    }
  }

  // Legacy methods for backward compatibility
  static async extractMetadata(url: string): Promise<{ title: string; favicon: string }> {
    const result = await this.extractMetadataWithRetry(url);
    return { title: result.title, favicon: result.favicon };
  }

  static async generateSummary(url: string): Promise<string> {
    return this.generateSummaryWithRetry(url);
  }

  static async updateBookmarkPositions(bookmarks: Bookmark[]): Promise<void> {
    const updates = bookmarks.map((bookmark, index) => ({
      id: bookmark.id,
      position: index + 1
    }));
    return this.bulkUpdatePositions(updates);
  }

  static async updateBookmarkTags(id: string, tags: string[], userId: string): Promise<void> {
    await this.updateBookmark(id, { tags }, userId);
  }

  static async getPopularTags(userId: string, limit: number = 20): Promise<{ tag: string; count: number }[]> {
    const analytics = await this.getAnalytics(userId);
    return analytics.topTags.slice(0, limit);
  }

  // Additional utility methods
  private static async extractWithLinkPreview(url: string): Promise<{ title: string; favicon: string }> {
    const response = await fetch(`https://api.linkpreview.net/?key=demo&q=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error(`LinkPreview failed: ${response.status}`);
    
    const data = await response.json();
    const domain = new URL(url).hostname;
    
    return {
      title: data.title || this.getFallbackMetadata(url).title,
      favicon: data.image || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    };
  }

  private static async extractWithTextract(url: string): Promise<{ title: string; favicon: string }> {
    const response = await fetch(`https://textract.pages.dev/api/extract?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error(`Textract failed: ${response.status}`);
    
    const data = await response.json();
    const domain = new URL(url).hostname;
    
    return {
      title: data.title || this.getFallbackMetadata(url).title,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    };
  }

  private static async extractWithCORSProxy(url: string): Promise<{ title: string; favicon: string }> {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`CORS proxy failed: ${response.status}`);
    
    const data = await response.json();
    const html = data.contents;
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : this.getFallbackMetadata(url).title;
    
    const domain = new URL(url).hostname;
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    
    return { title, favicon };
  }

  private static async generateWithTextract(url: string): Promise<string> {
    const response = await fetch(`https://textract.pages.dev/api/extract?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error(`Textract failed: ${response.status}`);
    
    const data = await response.json();
    
    if (data.content && data.content.length > 50) {
      return this.extractSummaryFromContent(data.content);
    }
    
    throw new Error('No meaningful content extracted');
  }

  private static async generateWithCORSProxy(url: string): Promise<string> {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`CORS proxy failed: ${response.status}`);
    
    const data = await response.json();
    const textContent = this.extractTextFromHTML(data.contents);
    
    if (textContent.length > 50) {
      return this.extractSummaryFromContent(textContent);
    }
    
    throw new Error('No meaningful content found');
  }

  private static extractTextFromHTML(html: string): string {
    let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    const contentSelectors = [
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<p[^>]*>([\s\S]*?)<\/p>/gi
    ];
    
    let extractedText = '';
    
    for (const selector of contentSelectors) {
      const matches = cleanHtml.match(selector);
      if (matches) {
        extractedText = matches.join(' ');
        break;
      }
    }
    
    if (!extractedText) {
      extractedText = cleanHtml;
    }
    
    return extractedText
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}