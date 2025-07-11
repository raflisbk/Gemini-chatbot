'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Clock, 
  X,
  MoreVertical,
  Archive,
  Edit2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '@/lib/utils';

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

interface FixedChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onNewSession: () => void;
  isLoading: boolean;
}

export function FixedChatSidebar({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionDelete,
  onNewSession,
  isLoading
}: FixedChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Filter sessions based on search
  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.context_summary && session.context_summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSessionClick = useCallback((sessionId: string) => {
    onSessionSelect(sessionId);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      onClose();
    }
  }, [onSessionSelect, onClose]);

  const handleNewSession = useCallback(() => {
    onNewSession();
    // Close sidebar on mobile after creating new session
    if (window.innerWidth < 768) {
      onClose();
    }
  }, [onNewSession, onClose]);

  const handleEditStart = useCallback((session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  }, []);

  const handleEditSave = useCallback((sessionId: string) => {
    // Here you would typically call an API to update the session title
    console.log('Saving session title:', sessionId, editTitle);
    setEditingSessionId(null);
    setEditTitle('');
  }, [editTitle]);

  const handleEditCancel = useCallback(() => {
    setEditingSessionId(null);
    setEditTitle('');
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* FIXED: Sidebar - Mobile overlay, Desktop fixed position */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-0 left-0 h-full w-80 bg-background border-r z-50",
              "md:z-30", // Lower z-index on desktop
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Chat History</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewSession}
                  className="h-8 w-8"
                  title="New conversation"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 md:hidden" // Only show close button on mobile
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
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
                  // Loading skeleton
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="p-3 rounded-lg">
                        <div className="h-4 bg-muted animate-pulse rounded mb-2" />
                        <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : filteredSessions.length === 0 ? (
                  // Empty state
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'No conversations found' : 'No conversations yet'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery ? 'Try different keywords' : 'Start a new conversation to begin'}
                    </p>
                  </div>
                ) : (
                  // Sessions list
                  filteredSessions.map((session) => (
                    <div key={session.id} className="group relative">
                      <div
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                          "hover:bg-muted/50",
                          currentSessionId === session.id && "bg-muted border-l-2 border-primary"
                        )}
                        onClick={() => handleSessionClick(session.id)}
                      >
                        <div className="flex-1 min-w-0">
                          {editingSessionId === session.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleEditSave(session.id);
                                  } else if (e.key === 'Escape') {
                                    handleEditCancel();
                                  }
                                }}
                                onBlur={() => handleEditSave(session.id)}
                                className="h-6 text-sm"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <>
                              <h3 className="text-sm font-medium truncate">
                                {session.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground truncate">
                                  {session.context_summary || 'No preview available'}
                                </p>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(session.last_message_at)}
                                  </span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {session.message_count}
                                </Badge>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Session Actions */}
                        {editingSessionId !== session.id && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditStart(session);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Add archive functionality
                                  }}
                                >
                                  <Archive className="h-3 w-3 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSessionDelete(session.id);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{filteredSessions.length} conversations</span>
                <span>
                  {searchQuery && `Filtered from ${sessions.length}`}
                </span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

export default FixedChatSidebar;