export interface DestinationSection {
  id: string;
  section_type: string;
  title?: string | null;
  order: number;
  visible: boolean;
  data: Record<string, unknown>;
}

export interface Destination {
  id: string;
  name: string;
  slug: string;
  category?: Category;
  latitude: number;
  longitude: number;
  country: string;
  city?: string;
  images: string[];
  tags: string[];
  price_level: string;
  rating_avg: number;
  review_count: number;
  description?: string;
  address?: string;
  opening_hours?: Record<string, unknown>;
  best_visiting_hours?: Record<string, unknown>;
  local_tips?: Record<string, unknown>;
  seasonal_info?: Record<string, unknown>;
  sections?: DestinationSection[];
  distance?: string;
}

export interface Category {
  id: number;
  name: string;
  icon?: string;
  slug: string;
  parent_id?: number;
}

export interface Review {
  id: string;
  user_id: string;
  destination_id: string;
  rating: number;
  title?: string;
  content?: string;
  photos: string[];
  visit_date?: string;
  is_verified: boolean;
  moderation_status: string;
  helpful_count: number;
  travel_tips?: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
  destination_name?: string;
}

export interface ReviewSummary {
  destination_id: string;
  summary_text?: string;
  positive_topics: string[];
  negative_topics: string[];
  sentiment_score?: number;
  generated_at?: string;
  review_count: number;
  avg_rating: number;
}

export interface Trip {
  id: string;
  user_id: string;
  destination_id?: string;
  name: string;
  start_date?: string;
  end_date?: string;
  status: string;
  total_budget?: number;
  currency: string;
  is_public: boolean;
  created_at: string;
  days: TripDay[];
}

export interface TripDay {
  id: string;
  trip_id: string;
  day_number: number;
  date?: string;
  notes?: string;
  activities: TripActivity[];
}

export interface TripActivity {
  id: string;
  trip_day_id: string;
  name: string;
  description?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  start_time?: string;
  end_time?: string;
  estimated_cost?: number;
  currency: string;
  category?: string;
  order_index: number;
}

export interface BudgetEstimate {
  accommodation?: number;
  food?: number;
  transportation?: number;
  tickets?: number;
  parking?: number;
  emergency_reserve?: number;
  total: number;
  currency: string;
  breakdown?: Record<string, number>;
}

export interface Conversation {
  id: string;
  user_id: string;
  trip_id?: string;
  context_data?: Record<string, unknown>;
  summary?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  msg_metadata?: {
    recommendations?: RecommendationCard[];
    plan?: TripPlan;
    attachment?: string;
    [k: string]: unknown;
  };
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  preferences?: Record<string, unknown>;
  level: number;
  xp_total: number;
  role: "user" | "admin";
  is_active: boolean;
  is_verified?: boolean;
  created_at: string;
}

export interface PublicProfile {
  id: string;
  username: string;
  avatar_url?: string;
  level: number;
  xp_total: number;
  created_at: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  trips_count: number;
  reviews_count: number;
  is_following: boolean;
  is_self: boolean;
}

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id?: string;
  type: string;
  title: string;
  subtitle?: string;
  meta: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  actor_username?: string;
  actor_avatar_url?: string;
}

export interface UserStats {
  level: number;
  xp_total: number;
  achievements_count: number;
  reviews_count: number;
  trips_count: number;
}

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  xp_reward: number;
}

export interface UserAchievement {
  achievement: Achievement;
  unlocked_at: string;
}

export interface LeaderboardEntry {
  username: string;
  avatar_url?: string;
  level: number;
  xp_total: number;
  achievements_count: number;
}

export interface LeaderboardFallbackRow {
  rank: number;
  name: string;
  badges: number;
  points: number;
  isYou: boolean;
}

export type LeaderboardRow = (LeaderboardEntry | LeaderboardFallbackRow) & {
  username?: string;
  name?: string;
  rank?: number;
  level?: number;
  badges?: number;
  points?: number;
  achievements_count?: number;
  xp_total?: number;
  isYou?: boolean;
};

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface LocalGuideFoodItem {
  name?: string;
  desc?: string;
  title?: string;
}

export interface LocalGuide {
  food: LocalGuideFoodItem[];
  customs: LocalGuideFoodItem[];
  hidden_gems: LocalGuideFoodItem[];
  seasonal?: Record<string, unknown>;
}

export interface MediaItem {
  type: "image" | "video";
  url: string;
}

export interface Post {
  id: string;
  user_id: string;
  destination_id?: string;
  content: string;
  media: MediaItem[];
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  created_at: string;
  username?: string;
  avatar_url?: string;
  is_verified?: boolean;
  location?: string;
}

// Shape returned by GET /users/{user_id}/posts (subset of Post).
export interface UserPost {
  id: string;
  content: string;
  media: MediaItem[];
  like_count: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
  is_verified?: boolean;
}

export interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: Record<string, unknown>;
}

export interface RecommendationCard {
  id: string;
  name: string;
  city?: string;
  country?: string;
  rating_avg: number;
  review_count?: number;
  price_level?: string;
  image?: string | null;
  category_name?: string;
}

export interface PlanActivity {
  name: string;
  category: string;
  time: string;
  location_name?: string | null;
  lat?: number | null;
  lng?: number | null;
  cost: number;
  destination_id?: string | null;
  price_level?: string;
  travel_next?: { minutes: number; mode: string; distance_km: number };
}

export interface PlanDay {
  day: number;
  title: string;
  notes?: string;
  activities: PlanActivity[];
}

export interface TripPlan {
  title: string;
  num_days: number;
  location?: string | null;
  cover_image?: string | null;
  people: number;
  budget_requested?: number | null;
  budget_estimate: {
    total: number;
    per_day: number;
    breakdown: Record<string, number>;
    currency: string;
  };
  budget_fit: string;
  budget_delta?: number | null;
  price_level?: string;
  days: PlanDay[];
}

// ── Admin panel types ──

export interface AdminDestination {
  id: string;
  name: string;
  slug: string;
  category?: { name: string } | null;
  city?: string;
  country?: string;
  price_level: string;
  rating_avg: number;
  is_active: boolean;
  latitude: number;
  longitude: number;
  address?: string;
  tags: string[];
  description?: string;
  images: string[];
}

export interface AdminDestinationForm {
  name?: string;
  slug?: string;
  category_id?: string | number;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  price_level?: string;
  rating_avg?: number;
  description?: string;
  tags?: string[];
  is_active?: boolean;
  template_id?: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface AdminTemplate {
  id: string;
  name: string;
  description?: string;
  sections: unknown[];
  is_default: boolean;
}

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  parent_id?: number;
}

export interface AdminDashboardData {
  total_users: number;
  total_destinations: number;
  total_posts: number;
  total_views_today: number;
  weekly_views: { date: string; count: number }[];
  new_users_week: number;
  top_pages: { path: string; count: number }[];
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AdminKnowledgeDoc {
  id: string;
  title: string;
  status: string;
  topic?: string;
  language?: string;
  source_name?: string;
  source_url?: string;
  version?: number;
  created_at: string;
  updated_at: string;
}

export interface AdminTrafficRow {
  id: string;
  path: string;
  user_id?: string;
  ip?: string;
  created_at: string;
}

export interface AdminPoiItem {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  image_url?: string;
  source?: string;
  category?: string;
  tags?: string[];
}

export interface AdminEnrichResult {
  image_added?: boolean;
  source?: string;
  images?: string[];
  coords_resolved?: boolean;
}

export interface AdminEnrichJob {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  total?: number;
  processed?: number;
  updated?: number;
  failed?: number;
  error?: string;
}
