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
  Loader2
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import Logo from './Logo';

// FIXED: Complete interface matching the expected props
export interface FixedChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onNewSession: () => void;
  onClose: () => void;
  isOpen: boolean;          // FIXED: Added missing property
  isLoading?: boolean;      // FIXED: Added missing property
  user?: any;               // Optional user data
  profile?: any;            // Optional profile data
  isGuest?: boolean;        // Optional guest status
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-card border-r border-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <Logo size="sm" variant="gradient" showText={true} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* User Info */}
              {user && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {user.email || user.name || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profile?.quota_used || 0} / {profile?.quota_limit || 25} messages
                      </p>
                    </div>
                  </div>
                  {getUserStatusBadge()}
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
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sessions List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  // Loading State
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading conversations...</span>
                    </div>
                  </div>
                ) : filteredSessions.length === 0 ? (
                  // Empty State
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">
                      {searchQuery ? 'No conversations found' : 'No conversations yet'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {searchQuery ? 'Try a different search term' : 'Start a new chat to begin'}
                    </p>
                  </div>
                ) : (
                  // Sessions List
                  filteredSessions.map((session) => (
                    <Card
                      key={session.id}
                      className={`cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
                        currentSessionId === session.id ? 'bg-primary/10 border-primary' : 'border-transparent'
                      }`}
                      onClick={() => onSessionSelect(session.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            {/* Session Title */}
                            <p className="text-sm font-medium truncate mb-1">
                              {session.title || `Chat ${session.id.slice(0, 8)}`}
                            </p>
                            
                            {/* Session Preview */}
                            {session.context_summary && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                {session.context_summary}
                              </p>
                            )}
                            
                            {/* Session Meta */}
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                <MessageSquare className="h-2 w-2 mr-1" />
                                {session.message_count}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-2 w-2" />
                                {formatDate(session.last_message_at)}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 ml-2">
                            {session.is_active && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
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
                  <span>
                    {isGuest ? 'Guest Mode' : 'Signed In'}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FixedChatSidebar;