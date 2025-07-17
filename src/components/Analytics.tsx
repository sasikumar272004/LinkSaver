import React, { useEffect, useRef } from 'react';
import { BarChart3, Tag, Globe, Calendar, TrendingUp } from 'lucide-react';
import { gsap } from 'gsap';

interface AnalyticsProps {
  analytics: {
    totalBookmarks: number;
    bookmarksThisWeek: number;
    bookmarksThisMonth: number;
    topTags: { tag: string; count: number }[];
    topDomains: { domain: string; count: number }[];
    activityChart: { date: string; count: number }[];
  } | null;
}

export const Analytics: React.FC<AnalyticsProps> = ({ analytics }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && chartsRef.current && analytics) {
      const tl = gsap.timeline();
      
      tl.fromTo(containerRef.current.children,
        { y: 30, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.6, 
          stagger: 0.1, 
          ease: "power2.out" 
        }
      );
    }
  }, [analytics]);

  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  const maxActivity = Math.max(...analytics.activityChart.map(d => d.count));

  return (
    <div ref={containerRef} className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Total Bookmarks
              </h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {analytics.totalBookmarks}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                This Week
              </h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {analytics.bookmarksThisWeek}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                This Month
              </h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {analytics.bookmarksThisMonth}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Chart */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Activity (Last 30 Days)
            </h3>
          </div>
          
          <div className="space-y-2">
            {analytics.activityChart.slice(-7).map((day, index) => (
              <div key={day.date} className="flex items-center space-x-3">
                <div className="w-16 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: maxActivity > 0 ? `${(day.count / maxActivity) * 100}%` : '0%' 
                    }}
                  ></div>
                </div>
                <div className="w-8 text-sm font-medium text-gray-900 dark:text-white">
                  {day.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Tags */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Tag className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Popular Tags
            </h3>
          </div>
          
          <div className="space-y-3">
            {analytics.topTags.slice(0, 8).map((tag, index) => (
              <div key={tag.tag} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-xs font-medium text-green-600 dark:text-green-400">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {tag.tag}
                  </span>
                </div>
                <span className="badge-secondary">
                  {tag.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Domains */}
        <div className="card lg:col-span-2">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Top Domains
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.topDomains.slice(0, 10).map((domain, index) => (
              <div key={domain.domain} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${domain.domain}&sz=16`}
                      alt={domain.domain}
                      className="w-4 h-4"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMUwxMCA0SDEzTDEwLjUgNkwxMiAxMEw4IDhMNCA1TDYgNkwzIDRINkw4IDFaIiBmaWxsPSIjOWNhM2FmIi8+Cjwvc3ZnPgo=';
                      }}
                    />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {domain.domain}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {domain.count} bookmark{domain.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {domain.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};