'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  MessageSquare, 
  Trash2,
  Search,
  Archive,
  Clock,
  User,
  Crown,
  Shield,
  Loader2,
  History,
  Settings,
  Bot
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

// FIXED: Complete interface matching the expected props
export interface FixedChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onNewSession: () => void;
  onClose: () => void;
  isOpen: boolean;
  isLoading?: boolean;
  user?: any;
  profile?: any;
  isGuest?: boolean;
}

interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_message_at: string;
  context_summary?: string;
  settings?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  messages?: any[];
}

const FixedChatSidebar: React.FC<FixedChatSidebarProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionDelete,
  onNewSession,
  onClose,
  isOpen,
  isLoading = false,
  user,
  profile,
  isGuest = false
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filteredSessions, setFilteredSessions] = React.useState(sessions);

  // Filter sessions based on search query
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = sessions.filter(session => 
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.context_summary?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSessions(filtered);
    } else {
      setFilteredSessions(sessions);
    }
  }, [sessions, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getUserStatusBadge = () => {
    if (!user) return null;

    if (user.role === 'admin') {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Crown className="h-3 w-3" />
          Admin
        </Badge>
      );
    } else if (isGuest) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <User className="h-3 w-3" />
          Guest
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          User
        </Badge>
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* FIXED: Header tanpa duplikasi logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          {/* FIXED: Simple title tanpa logo untuk menghindari duplikasi */}
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Chat History</h2>
          </div>
          
          {/* Close button untuk mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 lg:hidden"
            title="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* FIXED: User Info - Enhanced */}
        {user && (
          <div className="flex items-center justify-between mb-4 p-3 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                {user.role === 'admin' ? (
                  <Crown className="h-5 w-5 text-primary" />
                ) : isGuest ? (
                  <User className="h-5 w-5 text-primary" />
                ) : (
                  <Shield className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.email || user.name || 'Anonymous User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profile?.quota_used || 0} / {profile?.quota_limit || 25} messages
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {getUserStatusBadge()}
            </div>
          </div>
        )}

        {/* New Chat Button */}
        <Button
          onClick={onNewSession}
          className="w-full flex items-center gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Chat Sessions */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? 'Try different keywords' : 'Start a new chat to begin'}
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <Card
                key={session.id}
                className={`cursor-pointer transition-all duration-200 group hover:shadow-md ${
                  currentSessionId === session.id 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <h3 className="text-sm font-medium truncate">
                          {session.title || 'Untitled Chat'}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(session.last_message_at)}</span>
                        <span>•</span>
                        <span>{session.message_count} messages</span>
                      </div>
                      
                      {session.context_summary && (
                        <p className="text-xs text-muted-foreground truncate">
                          {session.context_summary}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      {session.is_active && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSessionDelete(session.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredSessions.length} conversations</span>
          {user && (
            <span className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              {isGuest ? 'Guest Mode' : 'Signed In'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FixedChatSidebar;