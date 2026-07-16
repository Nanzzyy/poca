"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  Destination, Category, Review, ReviewSummary, Trip, BudgetEstimate,
  Conversation, Message, User, UserStats, Achievement, PaginatedResponse, LocalGuide, TripPlan,
} from "@/types";

// Query key factory — keeps keys consistent across hooks
export const keys = {
  destinations: {
    all: ["destinations"] as const,
    search: (q: string, filters?: Record<string, string>) => ["destinations", "search", q, filters] as const,
    detail: (id: string) => ["destinations", id] as const,
    nearby: (id: string, radius: number) => ["destinations", id, "nearby", radius] as const,
    localGuide: (id: string) => ["destinations", id, "local-guide"] as const,
    categories: ["categories"] as const,
  },
  reviews: {
    list: (destId: string) => ["reviews", destId] as const,
    summary: (destId: string) => ["reviews", destId, "summary"] as const,
  },
  trips: {
    list: ["trips"] as const,
    detail: (id: string) => ["trips", id] as const,
    budget: (id: string) => ["trips", id, "budget"] as const,
  },
  chat: {
    conversations: ["chat", "conversations"] as const,
    messages: (convId: string) => ["chat", "messages", convId] as const,
  },
  user: {
    me: ["user", "me"] as const,
    stats: ["user", "stats"] as const,
    achievements: ["user", "achievements"] as const,
  },
  leaderboard: ["leaderboard"] as const,
  map: (sw: string, ne: string) => ["map", sw, ne] as const,
};

// Destinations
export function useSearchDestinations(q: string, filters?: Record<string, string>) {
  return useQuery({
    queryKey: keys.destinations.search(q || "__empty__", filters),
    queryFn: () => api.get<PaginatedResponse<Destination>>("/destinations", { params: { q, ...filters } }),
    enabled: true, // Always enable so it fetches all by default
    staleTime: 120_000,
    gcTime: 300_000,
  });
}

export function useDestination(id: string) {
  return useQuery({
    queryKey: keys.destinations.detail(id),
    queryFn: () => api.get<Destination>(`/destinations/${id}`),
    enabled: !!id,
    staleTime: 300_000,
    gcTime: 600_000,
  });
}

export function useNearbyDestinations(id: string, radius = 10) {
  return useQuery({
    queryKey: keys.destinations.nearby(id, radius),
    queryFn: () => api.get<Destination[]>(`/destinations/${id}/nearby`, { params: { radius } }),
    enabled: !!id,
    staleTime: 300_000,
    gcTime: 600_000,
  });
}

export function useLocalGuide(id: string) {
  return useQuery({
    queryKey: keys.destinations.localGuide(id),
    queryFn: () => api.get<LocalGuide>(`/destinations/${id}/local-guide`),
    enabled: !!id,
    staleTime: 600_000,
    gcTime: 900_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: keys.destinations.categories,
    queryFn: () => api.get<Category[]>("/destinations/categories/all"),
    staleTime: 600_000,
    gcTime: 1_200_000,
  });
}

export function useMapMarkers(sw: [number, number], ne: [number, number], categories?: string) {
  return useQuery({
    queryKey: keys.map(`${sw[0].toFixed(2)},${sw[1].toFixed(2)}`, `${ne[0].toFixed(2)},${ne[1].toFixed(2)}`),
    queryFn: () => api.get<{ features: any[] }>("/map/markers", {
      params: { sw_lat: sw[0], sw_lng: sw[1], ne_lat: ne[0], ne_lng: ne[1], categories },
    }),
    enabled: !!sw && !!ne,
    staleTime: 120_000,
    gcTime: 300_000,
  });
}

// Reviews
export function useReviews(destId: string) {
  return useQuery({
    queryKey: keys.reviews.list(destId),
    queryFn: () => api.get<PaginatedResponse<Review>>(`/destinations/${destId}/reviews`),
    enabled: !!destId,
    staleTime: 60_000,
  });
}

export function useReviewSummary(destId: string) {
  return useQuery({
    queryKey: keys.reviews.summary(destId),
    queryFn: () => api.get<ReviewSummary>(`/destinations/${destId}/review-summary`),
    enabled: !!destId,
    staleTime: 600_000,
    gcTime: 1_200_000,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ destId, data }: { destId: string; data: { rating: number; title?: string; content?: string; travel_tips?: string } }) =>
      api.post(`/destinations/${destId}/reviews`, data),
    onSuccess: (_, { destId }) => {
      qc.invalidateQueries({ queryKey: keys.reviews.list(destId) });
      qc.invalidateQueries({ queryKey: keys.reviews.summary(destId) });
      qc.invalidateQueries({ queryKey: keys.destinations.detail(destId) });
    },
  });
}

// Trips
export function useTrips() {
  return useQuery({
    queryKey: keys.trips.list,
    queryFn: () => api.get<PaginatedResponse<Trip>>("/trips"),
    staleTime: 60_000,
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: keys.trips.detail(id),
    queryFn: () => api.get<Trip>(`/trips/${id}`),
    enabled: !!id,
    staleTime: 120_000,
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; destination_id?: string; start_date?: string; end_date?: string }) =>
      api.post<Trip>("/trips", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.trips.list }),
  });
}

export function useTripBudget(tripId: string) {
  return useQuery({
    queryKey: keys.trips.budget(tripId),
    queryFn: () => api.get<BudgetEstimate>(`/trips/${tripId}/budget`),
    enabled: !!tripId,
    staleTime: 120_000,
    gcTime: 300_000,
  });
}

// Auth
export function useLogin() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<{ access_token: string; user: User }>("/auth/login", data),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: { email: string; username: string; password: string }) =>
      api.post<{ access_token: string; user: User }>("/auth/register", data),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: keys.user.me,
    queryFn: () => api.get<User>("/users/me"),
    staleTime: 300_000,
    gcTime: 600_000,
    retry: false,
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: keys.user.stats,
    queryFn: () => api.get<UserStats>("/gamification/users/me/stats"),
    staleTime: 120_000,
  });
}

// Chat
export function useConversations() {
  return useQuery({
    queryKey: keys.chat.conversations,
    queryFn: () => api.get<Conversation[]>("/ai/conversations"),
    staleTime: 30_000,
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: keys.chat.messages(id),
    queryFn: () => api.get<Conversation>(`/ai/conversations/${id}`),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Conversation>("/ai/conversations", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.chat.conversations }),
  });
}

export function useRenameConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ convId, summary }: { convId: string; summary: string }) =>
      api.patch<Conversation>(`/ai/conversations/${convId}`, { summary }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.chat.conversations }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (convId: string) => api.delete(`/ai/conversations/${convId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.chat.conversations }),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ convId, content }: { convId: string; content: string }) =>
      api.post<Message>(`/ai/conversations/${convId}/messages`, { content }),
    // Show the user's bubble instantly — don't wait for the AI reply (which is
    // what the POST resolves to). Server reconciles on success.
    onMutate: async ({ convId, content }) => {
      const key = keys.chat.messages(convId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Conversation>(key);
      if (prev) {
        const optimistic: Message = {
          id: `opt-${Date.now()}`,
          conversation_id: convId,
          role: "user",
          content,
          created_at: new Date().toISOString(),
        };
        qc.setQueryData<Conversation>(key, {
          ...prev,
          messages: [...(prev.messages ?? []), optimistic],
        });
      }
      return { prev };
    },
    onError: (_e, { convId }, ctx) => {
      // Roll back the optimistic user bubble on failure
      if (ctx?.prev) qc.setQueryData(keys.chat.messages(convId), ctx.prev);
    },
    onSuccess: (_data, { convId }) => {
      // Refetch messages (picks up the AI reply) + refresh sidebar (summary/order)
      qc.invalidateQueries({ queryKey: keys.chat.messages(convId) });
      qc.invalidateQueries({ queryKey: keys.chat.conversations });
    },
  });
}

// Persist an AI-generated plan as a real Trip (Trip -> Days -> Activities).
export function useSavePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: TripPlan) => {
      const trip = await api.post<{ id: string }>("/trips", { name: plan.title });
      const tripId = trip.id;
      for (const day of plan.days) {
        await api.post(`/trips/${tripId}/days`, { day_number: day.day, notes: day.notes });
        for (const [idx, a] of day.activities.entries()) {
          await api.post(`/trips/${tripId}/days/${day.day}/activities`, {
            name: a.name,
            description: a.category,
            location_name: a.location_name || undefined,
            latitude: a.lat ?? undefined,
            longitude: a.lng ?? undefined,
            estimated_cost: a.cost,
            category: a.category,
            order_index: idx,
          });
        }
      }
      return tripId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.trips.list }),
  });
}

// Gamification
export function useAchievements() {
  return useQuery({
    queryKey: keys.user.achievements,
    queryFn: () => api.get<Achievement[]>("/gamification/achievements"),
    staleTime: 300_000,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: keys.leaderboard,
    queryFn: () => api.get<any[]>("/gamification/leaderboard"),
    staleTime: 120_000,
  });
}

// Recommendations
export function useRecommendations(prefs: Record<string, any>) {
  return useQuery({
    queryKey: ["recommendations", prefs],
    queryFn: () => api.post<PaginatedResponse<Destination>>("/recommendations", prefs),
    enabled: Object.keys(prefs).length > 0,
    staleTime: 300_000,
    gcTime: 600_000,
  });
}
