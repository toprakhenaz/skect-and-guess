export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: number
          room_code: string
          host_id: string
          status: "waiting" | "playing" | "finished"
          current_word?: string
          current_round: number
          total_rounds: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          room_code: string
          host_id: string
          status: "waiting" | "playing" | "finished"
          current_word?: string
          current_round?: number
          total_rounds?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          room_code?: string
          host_id?: string
          status?: "waiting" | "playing" | "finished"
          current_word?: string
          current_round?: number
          total_rounds?: number
          created_at?: string
          updated_at?: string
        }
      }
      players: {
        Row: {
          id: number
          room_code: string
          player_id: string
          player_name: string
          is_host: boolean
          is_drawing: boolean
          score: number
          connected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          room_code: string
          player_id: string
          player_name: string
          is_host?: boolean
          is_drawing?: boolean
          score?: number
          connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          room_code?: string
          player_id?: string
          player_name?: string
          is_host?: boolean
          is_drawing?: boolean
          score?: number
          connected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: number
          room_code: string
          player_id: string
          player_name: string
          message: string
          is_correct_guess: boolean
          created_at: string
        }
        Insert: {
          id?: number
          room_code: string
          player_id: string
          player_name: string
          message: string
          is_correct_guess?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          room_code?: string
          player_id?: string
          player_name?: string
          message?: string
          is_correct_guess?: boolean
          created_at?: string
        }
      }
      drawings: {
        Row: {
          id: number
          room_code: string
          player_id: string
          drawing_data: string
          word: string
          created_at: string
        }
        Insert: {
          id?: number
          room_code: string
          player_id: string
          drawing_data: string
          word: string
          created_at?: string
        }
        Update: {
          id?: number
          room_code?: string
          player_id?: string
          drawing_data?: string
          word?: string
          created_at?: string
        }
      }
    }
  }
}
