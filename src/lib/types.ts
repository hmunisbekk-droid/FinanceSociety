// Row types mirroring supabase/migrations. Keep in sync when the schema changes.

export type Role = "student" | "editor" | "admin";
export type ContentStatus = "draft" | "review" | "published";
export type MaterialType = "pdf" | "slides" | "image" | "video" | "link" | "notes";
export type QuestionType = "single" | "multiple" | "true_false" | "numeric";
export type ToleranceType = "absolute" | "percent";

export interface Level {
  id: string;
  number: number;
  name: string;
  study_year: string;
  description: string;
  sort_order: number;
}

export interface Subject {
  id: string;
  level_id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  status: ContentStatus;
  updated_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  title: string;
  slug: string;
  summary: string;
  key_formulas: string;
  worked_example: string;
  sort_order: number;
  status: ContentStatus;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  topic_id: string;
  title: string;
  type: MaterialType;
  storage_path: string | null;
  external_url: string | null;
  body: string | null;
  file_size: number | null;
  allow_download: boolean;
  sort_order: number;
  status: ContentStatus;
  author_id: string | null;
  created_at: string;
}

export interface Quiz {
  id: string;
  topic_id: string;
  title: string;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  time_limit_seconds: number | null;
  status: ContentStatus;
}

export interface Question {
  id: string;
  quiz_id: string;
  type: QuestionType;
  prompt: string;
  explanation: string;
  points: number;
  numeric_answer: number | null;
  tolerance: number | null;
  tolerance_type: ToleranceType | null;
  sort_order: number;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  max_score: number;
  percent: number;
  answers: unknown;
  submitted_at: string;
}

export interface TopicProgress {
  user_id: string;
  topic_id: string;
  completed_at: string | null;
  last_opened_at: string;
}

export interface SiteEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  online_link: string | null;
  speaker: string | null;
  poster_path: string | null;
  capacity: number | null;
  status: ContentStatus;
  created_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
  cancelled_at: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  programme: string | null;
  level_id: string | null;
  role: Role;
  is_blocked: boolean;
  created_at: string;
}
