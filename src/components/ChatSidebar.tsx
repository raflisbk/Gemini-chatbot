import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit2,
  Clock,
  Calendar,
  X,
  Filter,
  SortDesc,
  Archive
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
  DropdownMenuSeparator
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

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
  isLoading?: boolean;
}

export function FixedChatSidebar({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionDelete,
  onNewSession,
  isLoading = false
}: FixedChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'messages'>('date');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Filter and sort sessions
  const filteredAndSortedSessions = useMemo(() => {
    let filtered = sessions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = sessions.filter(session => 
        session.title.toLowerCase().includes(query) ||
        session.context_summary?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'messages':
          return (b.message_count || 0) - (a.message_count || 0);
        case 'date':
        default:
          return new Date(b.last_message_at || b.updated_at).getTime() - 
                 new Date(a.last_message_at || a.updated_at).getTime();
      }
    });

    return filtered;
  }, [sessions, searchQuery, sortBy]);

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: ChatSession[] } = {};
    
    filteredAndSortedSessions.forEach(session => {
      const date = new Date(session.last_message_at || session.updated_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Hari Ini';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Kemarin';
      } else if (date.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000) {
        groupKey = 'Minggu Ini';
      } else if (date.getTime() > today.getTime() - 30 * 24 * 60 * 60 * 1000) {
        groupKey = 'Bulan Ini';
      } else {
        groupKey = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(session);
    });
    
    return groups;
  }, [filteredAndSortedSessions]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Baru saja';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} jam lalu`;
    } else {
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (sessionToDelete) {
      onSessionDelete(sessionToDelete);
      setSessionToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleEditStart = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleEditSave = () => {
    if (editingSessionId && editTitle.trim()) {
      // Call update function if available
      setEditingSessionId(null);
      setEditTitle('');
    }
  };

  const handleEditCancel = () => {
    setEditingSessionId(null);
    setEditTitle('');
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-full w-80 bg-card/95 backdrop-blur-lg border-r border-border z-50 lg:relative lg:translate-x-0 lg:z-auto"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Riwayat Chat</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onNewSession}
                className="h-8 w-8"
                title="Chat baru"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="p-4 space-y-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari percakapan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <SortDesc className="h-3 w-3" />
                    <span className="text-xs">
                      {sortBy === 'date' ? 'Tanggal' : sortBy === 'title' ? 'Judul' : 'Pesan'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setSortBy('date')}>
                    <Clock className="h-4 w-4 mr-2" />
                    Terbaru
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('title')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Judul
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('messages')}>
                    <Archive className="h-4 w-4 mr-2" />
                    Jumlah Pesan
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {filteredAndSortedSessions.length !== sessions.length && (
                <Badge variant="secondary" className="text-xs">
                  {filteredAndSortedSessions.length} dari {sessions.length}
                </Badge>
              )}
            </div>
          </div>

          {/* Sessions List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : Object.keys(groupedSessions).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'Tidak ada hasil pencarian' : 'Belum ada percakapan'}
                </div>
              ) : (
                Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
                  <div key={groupName} className="mb-6">
                    <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
                      {groupName}
                    </h3>
                    <div className="space-y-1">
                      {groupSessions.map((session) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group relative"
                        >
                          <div
                            onClick={() => onSessionSelect(session.id)}
                            className={`
                              flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200
                              ${currentSessionId === session.id 
                                ? 'bg-primary/10 border border-primary/20' 
                                : 'hover:bg-muted/50'
                              }
                            `}
                          >
                            <div className="flex-1 min-w-0">
                              {editingSessionId === session.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleEditSave();
                                      if (e.key === 'Escape') handleEditCancel();
                                    }}
                                    className="h-7 text-sm"
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <Button size="sm" onClick={handleEditSave} className="h-6 text-xs">
                                      Simpan
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleEditCancel} className="h-6 text-xs">
                                      Batal
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <h4 className="font-medium text-sm truncate">
                                    {session.title || 'Chat Baru'}
                                  </h4>
                                  {session.context_summary && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                      {session.context_summary}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-muted-foreground">
                                      {formatTime(session.last_message_at || session.updated_at)}
                                    </span>
                                    {session.message_count > 0 && (
                                      <Badge variant="outline" className="text-xs h-4">
                                        {session.message_count} pesan
                                      </Badge>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {editingSessionId !== session.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditStart(session)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit Judul
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteClick(session.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Hapus
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer Stats */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              Total: {sessions.length} percakapan
            </div>
          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Percakapan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus percakapan ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}