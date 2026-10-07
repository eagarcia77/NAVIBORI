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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: number
          metadata: Json
          revision_id: string | null
          venue_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          metadata?: Json
          revision_id?: string | null
          venue_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          metadata?: Json
          revision_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "published_spatial_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "spatial_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          created_at: string
          footprint: unknown
          id: string
          name: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          footprint?: unknown
          id?: string
          name: string
          venue_id: string
        }
        Update: {
          created_at?: string
          footprint?: unknown
          id?: string
          name?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          closed: boolean
          closes: string | null
          created_at: string
          day_of_week: number
          id: string
          opens: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          closed?: boolean
          closes?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          opens?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          closed?: boolean
          closes?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          opens?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_offers: {
        Row: {
          available: boolean
          business_id: string
          created_at: string
          currency: string
          description: string | null
          featured: boolean
          id: string
          price: number | null
          sku: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          business_id: string
          created_at?: string
          currency?: string
          description?: string | null
          featured?: boolean
          id?: string
          price?: number | null
          sku?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          business_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          featured?: boolean
          id?: string
          price?: number | null
          sku?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_promotions: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          description: string
          ends_at: string | null
          id: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json
          name: string
          phone: string | null
          slug: string
          space_id: string | null
          status: string
          updated_at: string
          venue_id: string
          verification_status: string
          website: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          phone?: string | null
          slug: string
          space_id?: string | null
          status?: string
          updated_at?: string
          venue_id: string
          verification_status?: string
          website?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          phone?: string | null
          slug?: string
          space_id?: string | null
          status?: string
          updated_at?: string
          venue_id?: string
          verification_status?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          ends_at: string | null
          id: string
          is_public: boolean
          metadata: Json
          poi_id: string | null
          starts_at: string
          title: string
          venue_id: string
        }
        Insert: {
          ends_at?: string | null
          id?: string
          is_public?: boolean
          metadata?: Json
          poi_id?: string | null
          starts_at: string
          title: string
          venue_id: string
        }
        Update: {
          ends_at?: string | null
          id?: string
          is_public?: boolean
          metadata?: Json
          poi_id?: string | null
          starts_at?: string
          title?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: false
            referencedRelation: "pois"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          building_id: string
          id: string
          level: number
          name: string
          sort_order: number
        }
        Insert: {
          building_id: string
          id?: string
          level: number
          name: string
          sort_order?: number
        }
        Update: {
          building_id?: string
          id?: string
          level?: number
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipalities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      pois: {
        Row: {
          category: string
          created_at: string
          floor_id: string | null
          id: string
          is_accessible: boolean | null
          is_public: boolean
          location: unknown
          metadata: Json
          name: string
          space_id: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          category: string
          created_at?: string
          floor_id?: string | null
          id?: string
          is_accessible?: boolean | null
          is_public?: boolean
          location?: unknown
          metadata?: Json
          name: string
          space_id?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          category?: string
          created_at?: string
          floor_id?: string | null
          id?: string
          is_accessible?: boolean | null
          is_public?: boolean
          location?: unknown
          metadata?: Json
          name?: string
          space_id?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pois_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pois_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pois_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      publication_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          note: string | null
          revision_id: string
          venue_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          id?: string
          note?: string | null
          revision_id: string
          venue_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          note?: string | null
          revision_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_events_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "published_spatial_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_events_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "spatial_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      route_edges: {
        Row: {
          distance_m: number
          from_node_id: string
          has_stairs: boolean
          id: string
          indoor: boolean
          is_accessible: boolean
          metadata: Json
          temporarily_closed: boolean
          to_node_id: string
          travel_time_s: number | null
          uses_elevator: boolean
          venue_id: string
        }
        Insert: {
          distance_m: number
          from_node_id: string
          has_stairs?: boolean
          id?: string
          indoor?: boolean
          is_accessible?: boolean
          metadata?: Json
          temporarily_closed?: boolean
          to_node_id: string
          travel_time_s?: number | null
          uses_elevator?: boolean
          venue_id: string
        }
        Update: {
          distance_m?: number
          from_node_id?: string
          has_stairs?: boolean
          id?: string
          indoor?: boolean
          is_accessible?: boolean
          metadata?: Json
          temporarily_closed?: boolean
          to_node_id?: string
          travel_time_s?: number | null
          uses_elevator?: boolean
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_edges_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "route_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_edges_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "route_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_edges_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      route_nodes: {
        Row: {
          floor_id: string | null
          id: string
          is_accessible: boolean
          location: unknown
          metadata: Json
          node_type: string
          venue_id: string
        }
        Insert: {
          floor_id?: string | null
          id?: string
          is_accessible?: boolean
          location: unknown
          metadata?: Json
          node_type?: string
          venue_id: string
        }
        Update: {
          floor_id?: string | null
          id?: string
          is_accessible?: boolean
          location?: unknown
          metadata?: Json
          node_type?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_nodes_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_nodes_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          floor_id: string
          geometry: unknown
          id: string
          is_public: boolean
          name: string
          space_type: string
        }
        Insert: {
          created_at?: string
          floor_id: string
          geometry?: unknown
          id?: string
          is_public?: boolean
          name: string
          space_type?: string
        }
        Update: {
          created_at?: string
          floor_id?: string
          geometry?: unknown
          id?: string
          is_public?: boolean
          name?: string
          space_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_revisions: {
        Row: {
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          payload: Json
          published_at: string | null
          published_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_number: number
          source_label: string
          status: string
          supersedes_revision_id: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          entity_id: string
          entity_type: string
          id?: string
          payload: Json
          published_at?: string | null
          published_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number: number
          source_label: string
          status?: string
          supersedes_revision_id?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          id?: string
          payload?: Json
          published_at?: string | null
          published_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number?: number
          source_label?: string
          status?: string
          supersedes_revision_id?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spatial_revisions_supersedes_revision_id_fkey"
            columns: ["supersedes_revision_id"]
            isOneToOne: false
            referencedRelation: "published_spatial_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spatial_revisions_supersedes_revision_id_fkey"
            columns: ["supersedes_revision_id"]
            isOneToOne: false
            referencedRelation: "spatial_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spatial_revisions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_memberships: {
        Row: {
          created_at: string
          role: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_memberships_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          center: unknown
          created_at: string
          id: string
          municipality_id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          center?: unknown
          created_at?: string
          id?: string
          municipality_id: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          center?: unknown
          created_at?: string
          id?: string
          municipality_id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      published_spatial_revisions: {
        Row: {
          entity_id: string | null
          entity_type: string | null
          id: string | null
          payload: Json | null
          published_at: string | null
          published_by: string | null
          revision_number: number | null
          source_label: string | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spatial_revisions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_spatial_revision: {
        Args: { p_note?: string; p_revision_id: string }
        Returns: {
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          payload: Json
          published_at: string | null
          published_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_number: number
          source_label: string
          status: string
          supersedes_revision_id: string | null
          venue_id: string
        }
        SetofOptions: {
          from: "*"
          to: "spatial_revisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_spatial_revision: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_payload: Json
          p_source_label: string
          p_venue_id: string
        }
        Returns: {
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          payload: Json
          published_at: string | null
          published_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_number: number
          source_label: string
          status: string
          supersedes_revision_id: string | null
          venue_id: string
        }
        SetofOptions: {
          from: "*"
          to: "spatial_revisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_published_spatial_dataset: {
        Args: { p_venue_id: string }
        Returns: {
          entity_id: string
          entity_type: string
          id: string
          payload: Json
          published_at: string
          revision_number: number
          source_label: string
        }[]
      }
      my_venue_memberships: {
        Args: never
        Returns: {
          role: string
          venue_id: string
          venue_name: string
          venue_slug: string
          venue_status: string
        }[]
      }
      publish_spatial_revision: {
        Args: { p_note?: string; p_revision_id: string }
        Returns: {
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          payload: Json
          published_at: string | null
          published_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_number: number
          source_label: string
          status: string
          supersedes_revision_id: string | null
          venue_id: string
        }
        SetofOptions: {
          from: "*"
          to: "spatial_revisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_merchant_business_for_review: {
        Args: { p_business_id: string }
        Returns: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json
          name: string
          phone: string | null
          slug: string
          space_id: string | null
          status: string
          updated_at: string
          venue_id: string
          verification_status: string
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_spatial_revision: {
        Args: { p_note?: string; p_revision_id: string }
        Returns: {
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          payload: Json
          published_at: string | null
          published_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_number: number
          source_label: string
          status: string
          supersedes_revision_id: string | null
          venue_id: string
        }
        SetofOptions: {
          from: "*"
          to: "spatial_revisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_merchant_business_content: {
        Args: {
          p_business_id: string
          p_hours?: Json
          p_offers?: Json
          p_promotions?: Json
        }
        Returns: boolean
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
