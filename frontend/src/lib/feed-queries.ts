"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Comment, MediaItem, PaginatedResponse, Post } from "@/types";

export const feedKeys = {
  all: ["posts", "all"] as const,
  comments: (postId: string) => ["posts", postId, "comments"] as const,
};

export function useAllReviews(page = 1) {
  return useQuery({
    queryKey: ["reviews", "all", page],
    queryFn: () => api.get<PaginatedResponse<any>>(`/reviews/all`, { params: { page } }),
    staleTime: 60_000,
  });
}

export function usePosts(page = 1) {
  return useQuery({
    queryKey: [...feedKeys.all, page],
    queryFn: () => api.get<PaginatedResponse<Post>>(`/posts`, { params: { page } }),
    staleTime: 30_000,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; media: MediaItem[]; destination_id?: string }) =>
      api.post<Post>("/posts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: feedKeys.all }),
  });
}

export function useLikePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => api.post<{ like_count: number }>(`/posts/${postId}/like`),
    onSuccess: () => qc.invalidateQueries({ queryKey: feedKeys.all }),
  });
}

export function useComments(postId: string, enabled = true) {
  return useQuery({
    queryKey: feedKeys.comments(postId),
    queryFn: () => api.get<Comment[]>(`/posts/${postId}/comments`),
    enabled: !!postId && enabled,
    staleTime: 30_000,
  });
}

export function useCreateComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api.post<Comment>(`/posts/${postId}/comments`, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: feedKeys.comments(postId) }),
  });
}
