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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ativos: {
        Row: {
          id: number
          nome: string
          tipo: string | null
          valor: number
        }
        Insert: {
          id?: number
          nome: string
          tipo?: string | null
          valor: number
        }
        Update: {
          id?: number
          nome?: string
          tipo?: string | null
          valor?: number
        }
        Relationships: []
      }
      crm_clientes: {
        Row: {
          created_at: string
          data_pagamento: string | null
          data_ritual: string | null
          id: string
          nome: string
          nota: string | null
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          data_ritual?: string | null
          id?: string
          nome: string
          nota?: string | null
          status?: string
          tipo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          data_ritual?: string | null
          id?: string
          nome?: string
          nota?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      crm_receitas: {
        Row: {
          data_pagamento_prevista: string | null
          data_ritual: string | null
          id: number
          meta_quantidade: number
          produto: string
          quantidade_realizada: number
          status_campanha: string | null
          ticket_medio: number
        }
        Insert: {
          data_pagamento_prevista?: string | null
          data_ritual?: string | null
          id?: number
          meta_quantidade: number
          produto: string
          quantidade_realizada?: number
          status_campanha?: string | null
          ticket_medio: number
        }
        Update: {
          data_pagamento_prevista?: string | null
          data_ritual?: string | null
          id?: number
          meta_quantidade?: number
          produto?: string
          quantidade_realizada?: number
          status_campanha?: string | null
          ticket_medio?: number
        }
        Relationships: []
      }
      passivos: {
        Row: {
          credor: string
          fase_quitacao: string | null
          id: number
          saldo_devedor: number
          status: string | null
        }
        Insert: {
          credor: string
          fase_quitacao?: string | null
          id?: number
          saldo_devedor: number
          status?: string | null
        }
        Update: {
          credor?: string
          fase_quitacao?: string | null
          id?: number
          saldo_devedor?: number
          status?: string | null
        }
        Relationships: []
      }
      roadmap_fases: {
        Row: {
          created_at: string
          id: string
          ordem: number
          subtitulo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number
          subtitulo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          subtitulo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      roadmap_tarefas: {
        Row: {
          concluida: boolean
          concluida_em: string | null
          created_at: string
          descricao: string
          fase_id: string
          id: string
          ordem: number
          updated_at: string
          valor_previsto: number
          valor_realizado: number
        }
        Insert: {
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          descricao: string
          fase_id: string
          id?: string
          ordem?: number
          updated_at?: string
          valor_previsto?: number
          valor_realizado?: number
        }
        Update: {
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          descricao?: string
          fase_id?: string
          id?: string
          ordem?: number
          updated_at?: string
          valor_previsto?: number
          valor_realizado?: number
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_tarefas_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "roadmap_fases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
