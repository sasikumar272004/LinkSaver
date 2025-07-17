import { supabase } from './supabase';
import { Bookmark, BookmarkInput } from '../types';

export class BookmarkAPI {
  static async createBookmark(input: BookmarkInput, userId: string): Promise<Bookmark> {
    try {
      // Extract metadata and generate summary in parallel
      const [metadata, summary] = await Promise.all([
        this.extractMetadata(input.url),
        this.generateSummary(input.url)
      ]);
      
      // Get current max position for user
      const { data: maxPosData } = await supabase
        .from('bookmarks')
        .select('position')
        .eq('user_id', userId)
        .order('position', { ascending: false })
        .limit(1);
      
      const newPosition = maxPosData?.[0]?.position ? maxPosData[0].position + 1 : 1;
      
      // Clean and validate tags
      const cleanTags = this.cleanTags(input.tags || []);
      
      const bookmarkData = {
        user_id: userId,
        url: input.url,
        title: metadata.title,
        favicon: metadata.favicon,
        summary: summary,
        tags: cleanTags,
        position: newPosition,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('bookmarks')
        .insert([bookmarkData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating bookmark:', error);
      throw new Error(this.getErrorMessage(error, 'creating bookmark'));
    }
  }

  static async getBookmarks(userId: string): Promise<Bookmark[]> {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      throw new Error(this.getErrorMessage(error, 'fetching bookmarks'));
    }
  }

  static async deleteBookmark(id: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      throw new Error(this.getErrorMessage(error, 'deleting bookmark'));
    }
  }

  static async updateBookmarkPositions(bookmarks: Bookmark[]): Promise<void> {
    try {
      const updates = bookmarks.map((bookmark, index) => ({
        id: bookmark.id,
        position: index + 1
      }));

      const { error } = await supabase
        .from('bookmarks')
        .upsert(updates);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating bookmark positions:', error);
      throw new Error(this.getErrorMessage(error, 'updating bookmark positions'));
    }
  }

  static async updateBookmarkTags(id: string, tags: string[], userId: string): Promise<void> {
    try {
      const cleanTags = this.cleanTags(tags);
      
      const { error } = await supabase
        .from('bookmarks')
        .update({ tags: cleanTags })
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating bookmark tags:', error);
      throw new Error(this.getErrorMessage(error, 'updating bookmark tags'));
    }
  }

  static async searchBookmarks(userId: string, query: string, tags: string[] = []): Promise<Bookmark[]> {
    try {
      let queryBuilder = supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId);

      // Add text search
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,summary.ilike.%${query}%,url.ilike.%${query}%`);
      }

      // Add tag filtering
      if (tags.length > 0) {
        queryBuilder = queryBuilder.overlaps('tags', tags);
      }

      const { data, error } = await queryBuilder.order('position', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching bookmarks:', error);
      throw new Error(this.getErrorMessage(error, 'searching bookmarks'));
    }
  }

  static async getPopularTags(userId: string, limit: number = 20): Promise<{ tag: string; count: number }[]> {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('tags')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      const tagCounts = new Map<string, number>();
      
      data?.forEach(bookmark => {
        bookmark.tags?.forEach((tag: string) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });
      
      return Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting popular tags:', error);
      throw new Error(this.getErrorMessage(error, 'getting popular tags'));
    }
  }

  private static cleanTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length <= 50)
      .filter((tag, index, arr) => arr.indexOf(tag) === index)
      .slice(0, 10); // Limit to 10 tags
  }

  private static getErrorMessage(error: any, action: string): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'object' && error !== null) {
      return JSON.stringify(error);
    }
    return `Unknown error occurred while ${action}`;
  }

  private static async extractMetadata(url: string): Promise<{ title: string; favicon: string }> {
    const services = [
      () => this.extractWithLinkPreview(url),
      () => this.extractWithTextract(url),
      () => this.extractWithCORSProxy(url)
    ];

    for (const service of services) {
      try {
        const result = await service();
        if (result.title && result.title.length > 3) {
          return result;
        }
      } catch (error) {
        console.log('Metadata service failed, trying next:', error);
        continue;
      }
    }

    return this.getFallbackMetadata(url);
  }

  private static async extractWithLinkPreview(url: string): Promise<{ title: string; favicon: string }> {
    const response = await fetch(`https://api.linkpreview.net/?key=demo&q=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`LinkPreview returned status ${response.status}`);

    const data = await response.json();
    const domain = new URL(url).hostname;
    
    return {
      title: data.title || this.getFallbackMetadata(url).title,
      favicon: data.image || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    };
  }

  private static async extractWithTextract(url: string): Promise<{ title: string; favicon: string }> {
    const response = await fetch(`https://textract.pages.dev/api/extract?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`Textract returned status ${response.status}`);

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

    if (!response.ok) throw new Error(`CORS proxy returned status ${response.status}`);

    const data = await response.json();
    const html = data.contents;
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : this.getFallbackMetadata(url).title;
    
    const domain = new URL(url).hostname;
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    
    return { title, favicon };
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
    } catch (error) {
      return {
        title: 'Saved Link',
        favicon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTQgN0gyMUwxNSAxMUwxNyAyMEwxMiAxNkw3IDIwTDkgMTFMMyA3SDEwTDEyIDJaIiBmaWxsPSIjNjM2NjcwIi8+Cjwvc3ZnPgo='
      };
    }
  }

  private static async generateSummary(url: string): Promise<string> {
    const services = [
      () => this.generateSummaryWithTextract(url),
      () => this.generateSummaryWithCORSProxy(url)
    ];

    for (const service of services) {
      try {
        const summary = await service();
        if (summary && summary.length > 50) {
          return this.improveSummary(summary);
        }
      } catch (error) {
        console.log('Summary service failed, trying next:', error);
        continue;
      }
    }

    return this.getFallbackSummary(url);
  }

  private static async generateSummaryWithTextract(url: string): Promise<string> {
    const response = await fetch(`https://textract.pages.dev/api/extract?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`Textract returned status ${response.status}`);

    const data = await response.json();
    
    if (data.content && data.content.length > 50) {
      return this.cleanAndTruncateContent(data.content);
    }

    throw new Error('No meaningful content extracted');
  }

  private static async generateSummaryWithCORSProxy(url: string): Promise<string> {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) throw new Error(`CORS proxy returned status ${response.status}`);

    const data = await response.json();
    const textContent = this.extractTextFromHTML(data.contents);
    
    if (textContent.length > 50) {
      return this.cleanAndTruncateContent(textContent);
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

  private static cleanAndTruncateContent(content: string): string {
    const cleanContent = content
      .replace(/\s+/g, ' ')
      .trim();
    
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summary = sentences.slice(0, 3).join('. ').trim();
    
    return summary.length > 300 
      ? summary.substring(0, 300) + '...'
      : summary + (summary.endsWith('.') ? '' : '.');
  }

  private static improveSummary(summary: string): string {
    // Remove common noise words and improve readability
    return summary
      .replace(/^(this|the|a|an)\s+/i, '')
      .replace(/\b(click here|read more|continue reading)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static getFallbackSummary(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname;
      
      let summary = `Content from ${domain}. `;
      
      if (path && path !== '/') {
        const pathParts = path.split('/').filter(part => part);
        if (pathParts.length > 0) {
          const topic = pathParts[pathParts.length - 1]
            .replace(/[-_]/g, ' ')
            .replace(/\.[^.]*$/, '')
            .toLowerCase();
          
          if (topic.length > 0 && topic.length < 50) {
            summary += `This page covers topics related to ${topic}. `;
          }
        }
      }
      
      const domainContext = this.getDomainContext(domain);
      if (domainContext) {
        summary += `${domainContext}. `;
      }
      
      summary += 'This bookmark contains valuable information that you saved for future reference.';
      
      return summary;
    } catch (error) {
      return 'This bookmark contains valuable content that you saved for future reference. Click to explore the full page and discover the information within.';
    }
  }

  private static getDomainContext(domain: string): string {
    const contexts: { [key: string]: string } = {
      'github.com': 'This appears to be a code repository or development resource',
      'stackoverflow.com': 'This is a programming question with community answers',
      'medium.com': 'This is an article or blog post with insights',
      'dev.to': 'This is a developer community article with technical content',
      'youtube.com': 'This is video content with visual learning material',
      'twitter.com': 'This is social media content with quick insights',
      'linkedin.com': 'This is professional networking content',
      'reddit.com': 'This is community discussion with diverse perspectives',
      'wikipedia.org': 'This is an encyclopedia article with comprehensive information',
      'docs.google.com': 'This is a collaborative document',
      'notion.so': 'This is organized content in a structured format'
    };
    
    for (const [key, context] of Object.entries(contexts)) {
      if (domain.includes(key)) {
        return context;
      }
    }
    
    return '';
  }
}