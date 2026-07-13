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
  opening_hours?: Record<string, any>;
  best_visiting_hours?: Record<string, any>;
  local_tips?: Record<string, any>;
  seasonal_info?: Record<string, any>;
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
  accommodation: number;
  food: number;
  transportation: number;
  tickets: number;
  parking: number;
  emergency_reserve: number;
  total: number;
  currency: string;
  breakdown: Record<string, number>;
}

export interface Conversation {
  id: string;
  user_id: string;
  trip_id?: string;
  context_data?: Record<string, any>;
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
  metadata?: Record<string, any>;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  preferences?: Record<string, any>;
  level: number;
  xp_total: number;
  created_at: string;
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

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface LocalGuide {
  food: any[];
  customs: any[];
  hidden_gems: any[];
  seasonal?: Record<string, any>;
}
