import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      repositories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      files: {
        Row: {
          id: string;
          repository_id: string;
          path: string;
          filename: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          path: string;
          filename: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          path?: string;
          filename?: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      file_versions: {
        Row: {
          id: string;
          file_id: string;
          content: string | null;
          size_bytes: number;
          version_number: number;
          message: string | null;
          author_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          file_id: string;
          content?: string | null;
          size_bytes?: number;
          version_number?: number;
          message?: string | null;
          author_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          file_id?: string;
          content?: string | null;
          size_bytes?: number;
          version_number?: number;
          message?: string | null;
          author_id?: string;
          created_at?: string;
        };
      };
      collaborators: {
        Row: {
          id: string;
          repository_id: string;
          user_id: string;
          permission: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          user_id: string;
          permission?: string;
          added_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          user_id?: string;
          permission?: string;
          added_at?: string;
        };
      };
    };
  };
};

export type Repository = Database['public']['Tables']['repositories']['Row'];
export type File = Database['public']['Tables']['files']['Row'];
export type FileVersion = Database['public']['Tables']['file_versions']['Row'];
export type Collaborator = Database['public']['Tables']['collaborators']['Row'];
