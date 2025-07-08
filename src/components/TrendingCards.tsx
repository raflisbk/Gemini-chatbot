'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Clock, 
  ExternalLink, 
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import TrendingAPI from '@/lib/trendingAPI';

interface TrendingTopic {
  title: string;
  category: string;
  source: string;
  prompt: string;
  popularity?: number;
  timestamp?: Date;
}

interface TrendingCardsProps {
  onTopicSelect?: (prompt: string) => void;
  maxCards?: number;
  className?: string;
}

export function TrendingCards({ 
  onTopicSelect, 
  maxCards = 6,
  className 
}: TrendingCardsProps) {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch trending topics
  const fetchTopics = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      setError(null);
      const fetchedTopics = await TrendingAPI.getTrendingTopics(forceRefresh);
      setTopics(fetchedTopics.slice(0, maxCards));
    } catch (err) {
      console.error('Error fetching trending topics:', err);
      setError('Failed to load trending topics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTopics();
  }, [maxCards]);

  // Handle topic click
  const handleTopicClick = (topic: TrendingTopic) => {
    if (onTopicSelect) {
      onTopicSelect(topic.prompt);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchTopics(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("trending-cards-container", className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Trending Topics</h3>
          </div>
        </div>
        
        <div className="trending-cards-grid">
          {Array.from({ length: maxCards }).map((_, index) => (
            <div 
              key={index}
              className="trending-card opacity-50"
            >
              <div className="animate-pulse">
                <div className="h-3 bg-muted rounded w-16 mb-2"></div>
                <div className="h-4 bg-muted rounded mb-1"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && topics.length === 0) {
    return (
      <div className={cn("trending-cards-container", className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Trending Topics</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("trending-cards-container", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Trending Topics</h3>
          <Badge variant="secondary" className="text-xs">
            {topics.length} topics
          </Badge>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-muted-foreground hover:text-foreground"
          title="Refresh trending topics"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Cards Grid */}
      <div className="trending-cards-grid">
        <AnimatePresence mode="popLayout">
          {topics.map((topic, index) => (
            <motion.div
              key={`${topic.title}-${index}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.1,
                ease: "easeOut"
              }}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.98 }}
              className="trending-card group"
              onClick={() => handleTopicClick(topic)}
            >
              {/* Category Badge */}
              <div className="trending-card-category">
                {topic.category}
              </div>
              
              {/* Title */}
              <h4 className="trending-card-title">
                {topic.title}
              </h4>
              
              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{topic.source}</span>
                </div>
                
                {topic.popularity && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <TrendingUp className="h-3 w-3" />
                    <span>{topic.popularity}</span>
                  </div>
                )}
              </div>
              
              {/* Hover indicator */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-3 w-3 text-primary" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Click on any topic to start a conversation • Updated every 30 minutes
        </p>
      </div>
    </div>
  );
}

export default TrendingCards;