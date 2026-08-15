"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Comment, MediaItem, PaginatedResponse, Post, Review } from "@/types";

export const feedKeys = {
  all: ["posts", "all"] as const,
  comments: (postId: string) => ["posts", postId, "comments"] as const,
};

export function useAllReviews(page = 1) {
  return useQuery({
    queryKey: ["reviews", "all", page],
    queryFn: () => api.get<PaginatedResponse<Review>>(`/reviews/all`, { params: { page } }),
    staleTime: 60_000,
  });
}

import { useInfiniteQuery } from "@tanstack/react-query";

export function useInfinitePosts() {
  return useInfiniteQuery({
    queryKey: feedKeys.all,
    queryFn: ({ pageParam = 1 }) => api.get<PaginatedResponse<Post>>(`/posts`, { params: { page: pageParam } }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined;
    },
    staleTime: 30_000,
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
    mutationFn: (postId: string) => api.post<{ liked: boolean; like_count: number }>(`/posts/${postId}/like`),
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

export function usePost(postId: string) {
  return useQuery({
    queryKey: ["posts", postId],
    queryFn: () => api.get<Post>(`/posts/${postId}`),
    enabled: !!postId,
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

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => api.delete(`/posts/${postId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
