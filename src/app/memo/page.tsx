'use client';

import { useState, useEffect } from 'react';
import {
  Container, Stack, Typography, Paper, Box,
  TextField, Button, IconButton, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Collapse,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PageHeader from '@/components/PageHeader';
import { useUser } from '@/hooks/useUser';
import dayjs from 'dayjs';

interface Memo {
  id: string;
  content: string;
  created_at: string;
}

export default function MemoPage() {
  const { user } = useUser();
  const [content, setContent] = useState('');
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newMemoId, setNewMemoId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/memos?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => setMemos(Array.isArray(data) ? data : []))
      .catch(() => setMemos([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleSubmit = async () => {
    if (!content.trim() || submitting || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, content }),
      });
      const newMemo = await res.json();
      if (res.ok && newMemo?.id) {
        setMemos((prev) => [newMemo as Memo, ...prev]);
        setContent('');
        setNewMemoId(newMemo.id);
        setTimeout(() => setNewMemoId(null), 600);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    if (!user || !editingId || !editContent.trim() || editSaving) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/memos/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, content: editContent }),
      });
      if (res.ok) {
        setMemos((prev) => prev.map((m) => m.id === editingId ? { ...m, content: editContent.trim() } : m));
        setEditingId(null);
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user || !deleteTargetId || deleting) return;
    setDeleting(true);
    try {
      await fetch(`/api/memos/${deleteTargetId}?userId=${user.id}`, { method: 'DELETE' });
      setMemos((prev) => prev.filter((m) => m.id !== deleteTargetId));
      setDeleteTargetId(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart ?? content.length;
        const end = target.selectionEnd ?? content.length;
        const next = content.substring(0, start) + '\n' + content.substring(end);
        setContent(next);
        setTimeout(() => {
          target.selectionStart = start + 1;
          target.selectionEnd = start + 1;
        }, 0);
      } else {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 10, position: 'relative' }}>
      <PageHeader />
      <Stack spacing={2}>
        <Paper sx={{ p: 2, borderRadius: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <TextField
              multiline
              fullWidth
              minRows={2}
              placeholder="메모 입력 후 Enter로 저장 (줄바꿈: Ctrl+Enter)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              variant="outlined"
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              sx={{ flexShrink: 0, alignSelf: 'flex-start', width: 80, height: 80, minWidth: 'unset', p: 0 }}
            >
              {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : '저장'}
            </Button>
          </Stack>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : memos.length === 0 ? (
          <Typography variant="body2" color="gray5" textAlign="center" sx={{ py: 4 }}>
            저장된 메모가 없습니다
          </Typography>
        ) : (
          <Box>
            {memos.map((memo) => {
              const isEditing = editingId === memo.id;
              const isNew = newMemoId === memo.id;
              return (
                <Collapse key={memo.id} in appear={isNew} timeout={isNew ? 580 : 0} easing="cubic-bezier(0.22, 1, 0.36, 1)">
                <Box sx={{ pb: 1 }}>
                <Paper
                  sx={{
                    p: 2, borderRadius: 1, border: '1px solid',
                    borderColor: isEditing ? 'primary.main' : 'gray2',
                    boxShadow: 'none',
                    ...(isNew && {
                      animation: 'memoSlideIn 0.58s cubic-bezier(0.22, 1, 0.36, 1)',
                      '@keyframes memoSlideIn': {
                        from: { opacity: 0, transform: 'translateY(-60px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                      },
                    }),
                  }}
                >
                  <Typography variant="caption" color="gray5" display="block" sx={{ mb: 0.75 }}>
                    {dayjs(memo.created_at).format('YYYY.MM.DD HH:mm')}
                  </Typography>
                  {isEditing ? (
                    <Stack spacing={1}>
                      <TextField
                        multiline
                        fullWidth
                        autoFocus
                        minRows={2}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                      <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                        <IconButton size="small" onClick={() => setEditingId(null)} disabled={editSaving} sx={{ color: 'gray5' }}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={handleEditSave} disabled={editSaving} sx={{ color: 'primary.main' }}>
                          {editSaving ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
                        </IconButton>
                      </Stack>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Typography
                        variant="body2"
                        sx={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.8 }}
                      >
                        {memo.content}
                      </Typography>
                      <Stack direction="row" sx={{ flexShrink: 0, mt: -0.5 }}>
                        <IconButton size="small" onClick={() => { setEditingId(memo.id); setEditContent(memo.content); }} sx={{ color: 'gray5' }}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setDeleteTargetId(memo.id)} sx={{ color: 'gray5' }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  )}
                </Paper>
                </Box>
                </Collapse>
              );
            })}
          </Box>
        )}
      </Stack>

      <Dialog open={!!deleteTargetId} onClose={() => setDeleteTargetId(null)}>
        <DialogTitle>메모 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>이 메모를 삭제하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTargetId(null)} disabled={deleting}>취소</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
