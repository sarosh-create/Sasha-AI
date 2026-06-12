export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      channel_message_ratings: {
        Row: {
          created_at: string
          message_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          message_id: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          message_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_message_ratings_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_messages: {
        Row: {
          body: string
          channel_id: string
          created_at: string
          id: string
          parent_id: string | null
          pinned: boolean
          user_id: string
        }
        Insert: {
          body: string
          channel_id: string
          created_at?: string
          id?: string
          parent_id?: string | null
          pinned?: boolean
          user_id: string
        }
        Update: {
          body?: string
          channel_id?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          pinned?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          exam_board: string | null
          id: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          exam_board?: string | null
          id?: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          exam_board?: string | null
          id?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      class_signups: {
        Row: {
          class_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_signups_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          code: string
          completed: boolean
          created_at: string
          for_date: string
          id: string
          label: string
          progress: number
          target: number
          user_id: string
        }
        Insert: {
          code: string
          completed?: boolean
          created_at?: string
          for_date?: string
          id?: string
          label: string
          progress?: number
          target: number
          user_id: string
        }
        Update: {
          code?: string
          completed?: boolean
          created_at?: string
          for_date?: string
          id?: string
          label?: string
          progress?: number
          target?: number
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          location: string | null
          starts_at: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          starts_at: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      exam_predictions: {
        Row: {
          generated_at: string
          id: string
          priority: string
          probability: number
          reasoning: string | null
          subject_id: string | null
          topic: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          priority?: string
          probability?: number
          reasoning?: string | null
          subject_id?: string | null
          topic: string
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          priority?: string
          probability?: number
          reasoning?: string | null
          subject_id?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_predictions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      explainer_reels: {
        Row: {
          created_at: string
          id: string
          scenes: Json
          thumbnail_url: string | null
          title: string | null
          topic: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          scenes: Json
          thumbnail_url?: string | null
          title?: string | null
          topic: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          scenes?: Json
          thumbnail_url?: string | null
          title?: string | null
          topic?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          category: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          message: string
          rating: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          message: string
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          message?: string
          rating?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      generated_artifacts: {
        Row: {
          artifact_kind: string
          created_at: string
          id: string
          payload: Json
          source_kind: string
          source_title: string | null
          title: string
          user_id: string
        }
        Insert: {
          artifact_kind: string
          created_at?: string
          id?: string
          payload: Json
          source_kind?: string
          source_title?: string | null
          title: string
          user_id: string
        }
        Update: {
          artifact_kind?: string
          created_at?: string
          id?: string
          payload?: Json
          source_kind?: string
          source_title?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_dna: {
        Row: {
          attention_minutes: number
          created_at: string
          learning_style: string | null
          retention_score: number
          signals: Json
          strengths: Json
          summary: string | null
          updated_at: string
          user_id: string
          weaknesses: Json
        }
        Insert: {
          attention_minutes?: number
          created_at?: string
          learning_style?: string | null
          retention_score?: number
          signals?: Json
          strengths?: Json
          summary?: string | null
          updated_at?: string
          user_id: string
          weaknesses?: Json
        }
        Update: {
          attention_minutes?: number
          created_at?: string
          learning_style?: string | null
          retention_score?: number
          signals?: Json
          strengths?: Json
          summary?: string | null
          updated_at?: string
          user_id?: string
          weaknesses?: Json
        }
        Relationships: []
      }
      lesson_content: {
        Row: {
          created_at: string
          created_by: string | null
          exam_board: string | null
          grade_level: string | null
          id: string
          quiz: Json
          slides: Json
          status: string
          subject_name: string
          topic: string
          updated_at: string
          worked_example: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exam_board?: string | null
          grade_level?: string | null
          id?: string
          quiz?: Json
          slides?: Json
          status?: string
          subject_name: string
          topic: string
          updated_at?: string
          worked_example?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exam_board?: string | null
          grade_level?: string | null
          id?: string
          quiz?: Json
          slides?: Json
          status?: string
          subject_name?: string
          topic?: string
          updated_at?: string
          worked_example?: string | null
        }
        Relationships: []
      }
      lesson_path: {
        Row: {
          activity: string
          completed_at: string | null
          content: string | null
          created_at: string
          est_minutes: number
          id: string
          lesson_content_id: string | null
          lesson_steps: Json
          position: number
          practice_prompt: string | null
          status: string
          subject_id: string | null
          title: string
          topic: string | null
          user_id: string
        }
        Insert: {
          activity: string
          completed_at?: string | null
          content?: string | null
          created_at?: string
          est_minutes?: number
          id?: string
          lesson_content_id?: string | null
          lesson_steps?: Json
          position: number
          practice_prompt?: string | null
          status?: string
          subject_id?: string | null
          title: string
          topic?: string | null
          user_id: string
        }
        Update: {
          activity?: string
          completed_at?: string | null
          content?: string | null
          created_at?: string
          est_minutes?: number
          id?: string
          lesson_content_id?: string | null
          lesson_steps?: Json
          position?: number
          practice_prompt?: string | null
          status?: string
          subject_id?: string | null
          title?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_path_lesson_content_id_fkey"
            columns: ["lesson_content_id"]
            isOneToOne: false
            referencedRelation: "lesson_content"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          capacity: number | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          meeting_url: string | null
          room_id: string | null
          scheduled_at: string
          subject: string | null
          teacher_id: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_url?: string | null
          room_id?: string | null
          scheduled_at: string
          subject?: string | null
          teacher_id?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_url?: string | null
          room_id?: string | null
          scheduled_at?: string
          subject?: string | null
          teacher_id?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      mistake_journal: {
        Row: {
          correct_answer: string | null
          created_at: string
          id: string
          marks_lost: number
          question: string
          student_answer: string | null
          subject_id: string | null
          tags: Json
          topic: string
          user_id: string
          why_wrong: string | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          id?: string
          marks_lost?: number
          question: string
          student_answer?: string | null
          subject_id?: string | null
          tags?: Json
          topic: string
          user_id: string
          why_wrong?: string | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          id?: string
          marks_lost?: number
          question?: string
          student_answer?: string | null
          subject_id?: string | null
          tags?: Json
          topic?: string
          user_id?: string
          why_wrong?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mistake_journal_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          color: string
          created_at: string
          id: string
          subject_id: string | null
          tag: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          color?: string
          created_at?: string
          id?: string
          subject_id?: string | null
          tag?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          color?: string
          created_at?: string
          id?: string
          subject_id?: string | null
          tag?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      past_papers: {
        Row: {
          created_at: string
          exam_board: string | null
          id: string
          level: string | null
          marking_scheme_url: string | null
          paper_type: string | null
          pdf_url: string
          subject: string | null
          title: string
          uploaded_by: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          exam_board?: string | null
          id?: string
          level?: string | null
          marking_scheme_url?: string | null
          paper_type?: string | null
          pdf_url: string
          subject?: string | null
          title: string
          uploaded_by?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          exam_board?: string | null
          id?: string
          level?: string | null
          marking_scheme_url?: string | null
          paper_type?: string | null
          pdf_url?: string
          subject?: string | null
          title?: string
          uploaded_by?: string | null
          year?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          a11y_mode: string
          account_type: string
          avatar_config: Json | null
          created_at: string
          daily_minutes_goal: number
          display_name: string | null
          exam_board: string | null
          exam_date: string | null
          grade_level: string | null
          hearts: number
          hearts_refill_at: string | null
          id: string
          lab_xp: number
          last_active_date: string | null
          leaderboard_opt_in: boolean
          level: number
          onboarded: boolean
          streak_count: number
          streak_freezes: number
          updated_at: string
          user_id: string
          xp: number
          xp_week: number
          xp_week_start: string | null
        }
        Insert: {
          a11y_mode?: string
          account_type?: string
          avatar_config?: Json | null
          created_at?: string
          daily_minutes_goal?: number
          display_name?: string | null
          exam_board?: string | null
          exam_date?: string | null
          grade_level?: string | null
          hearts?: number
          hearts_refill_at?: string | null
          id?: string
          lab_xp?: number
          last_active_date?: string | null
          leaderboard_opt_in?: boolean
          level?: number
          onboarded?: boolean
          streak_count?: number
          streak_freezes?: number
          updated_at?: string
          user_id: string
          xp?: number
          xp_week?: number
          xp_week_start?: string | null
        }
        Update: {
          a11y_mode?: string
          account_type?: string
          avatar_config?: Json | null
          created_at?: string
          daily_minutes_goal?: number
          display_name?: string | null
          exam_board?: string | null
          exam_date?: string | null
          grade_level?: string | null
          hearts?: number
          hearts_refill_at?: string | null
          id?: string
          lab_xp?: number
          last_active_date?: string | null
          leaderboard_opt_in?: boolean
          level?: number
          onboarded?: boolean
          streak_count?: number
          streak_freezes?: number
          updated_at?: string
          user_id?: string
          xp?: number
          xp_week?: number
          xp_week_start?: string | null
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          answers: Json | null
          completed: boolean
          created_at: string
          feedback: Json | null
          id: string
          questions: Json
          score: number | null
          subject_id: string | null
          topic: string
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed?: boolean
          created_at?: string
          feedback?: Json | null
          id?: string
          questions: Json
          score?: number | null
          subject_id?: string | null
          topic: string
          total: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed?: boolean
          created_at?: string
          feedback?: Json | null
          id?: string
          questions?: Json
          score?: number | null
          subject_id?: string | null
          topic?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      rival_state: {
        Row: {
          last_score: number
          last_taunt: string | null
          level: number
          name: string
          streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          last_score?: number
          last_taunt?: string | null
          level?: number
          name?: string
          streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          last_score?: number
          last_taunt?: string | null
          level?: number
          name?: string
          streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_messages: {
        Row: {
          content: string
          created_at: string
          display_name: string | null
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display_name?: string | null
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_name?: string | null
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_participants: {
        Row: {
          display_name: string | null
          id: string
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          id?: string
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          display_name?: string | null
          id?: string
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      schemes: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          subject?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      study_logs: {
        Row: {
          activity: string
          created_at: string
          id: string
          minutes: number
          subject_id: string | null
          user_id: string
        }
        Insert: {
          activity: string
          created_at?: string
          id?: string
          minutes?: number
          subject_id?: string | null
          user_id: string
        }
        Update: {
          activity?: string
          created_at?: string
          id?: string
          minutes?: number
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_rooms: {
        Row: {
          created_at: string
          host_user_id: string
          id: string
          is_public: boolean
          max_participants: number
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          host_user_id: string
          id?: string
          is_public?: boolean
          max_participants?: number
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          host_user_id?: string
          id?: string
          is_public?: boolean
          max_participants?: number
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          priority: number
          strength_score: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          priority?: number
          strength_score?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          priority?: number
          strength_score?: number
          user_id?: string
        }
        Relationships: []
      }
      teacher_applications: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          qualifications: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subjects: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          qualifications?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subjects: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          qualifications?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subjects?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json
          persona: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          persona: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          persona?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_students: {
        Row: {
          created_at: string
          id: string
          student_user_id: string
          teacher_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_user_id: string
          teacher_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_user_id?: string
          teacher_user_id?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_my_student: { Args: { _student: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_staff_or_teacher: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "teacher" | "user" | "co_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "user", "co_admin"],
    },
  },
} as const
