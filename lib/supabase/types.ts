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
      addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          customer_id: string
          id: string
          neighborhood: string
          number: string
          postal_code: string
          recipient_name: string
          reference: string | null
          state: string
          street: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          customer_id: string
          id?: string
          neighborhood: string
          number: string
          postal_code: string
          recipient_name: string
          reference?: string | null
          state: string
          street: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          neighborhood?: string
          number?: string
          postal_code?: string
          recipient_name?: string
          reference?: string | null
          state?: string
          street?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          cta_href: string | null
          cta_label: string | null
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cart_reservations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          product_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          product_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          product_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      hold_items: {
        Row: {
          created_at: string
          hold_session_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          hold_session_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          hold_session_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hold_items_hold_session_id_fkey"
            columns: ["hold_session_id"]
            isOneToOne: false
            referencedRelation: "hold_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hold_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      hold_sessions: {
        Row: {
          checkout_order_id: string | null
          created_at: string
          customer_id: string | null
          expires_at: string
          id: string
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          checkout_order_id?: string | null
          created_at?: string
          customer_id?: string | null
          expires_at?: string
          id?: string
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          checkout_order_id?: string | null
          created_at?: string
          customer_id?: string | null
          expires_at?: string
          id?: string
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hold_sessions_checkout_order_id_fkey"
            columns: ["checkout_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hold_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      imports_log: {
        Row: {
          created_at: string
          error_report_json: Json | null
          failed_rows: number | null
          file_name: string
          finished_at: string | null
          id: string
          import_type: string
          imported_rows: number | null
          started_at: string | null
          status: string
          total_rows: number | null
        }
        Insert: {
          created_at?: string
          error_report_json?: Json | null
          failed_rows?: number | null
          file_name: string
          finished_at?: string | null
          id?: string
          import_type?: string
          imported_rows?: number | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
        }
        Update: {
          created_at?: string
          error_report_json?: Json | null
          failed_rows?: number | null
          file_name?: string
          finished_at?: string | null
          id?: string
          import_type?: string
          imported_rows?: number | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
        }
        Relationships: []
      }
      intake_photos: {
        Row: {
          created_at: string
          id: string
          image_url: string
          intake_request_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          intake_request_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          intake_request_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "intake_photos_intake_request_id_fkey"
            columns: ["intake_request_id"]
            isOneToOne: false
            referencedRelation: "intake_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          email: string | null
          full_name: string
          id: string
          item_count: number | null
          phone: string
          preferred_method: string | null
          status: Database["public"]["Enums"]["intake_status"]
          updated_at: string
          whatsapp_sent: boolean
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          full_name: string
          id?: string
          item_count?: number | null
          phone: string
          preferred_method?: string | null
          status?: Database["public"]["Enums"]["intake_status"]
          updated_at?: string
          whatsapp_sent?: boolean
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          full_name?: string
          id?: string
          item_count?: number | null
          phone?: string
          preferred_method?: string | null
          status?: Database["public"]["Enums"]["intake_status"]
          updated_at?: string
          whatsapp_sent?: boolean
        }
        Relationships: []
      }
      leads: {
        Row: {
          converted: boolean
          created_at: string
          email: string
          id: string
          source: string
        }
        Insert: {
          converted?: boolean
          created_at?: string
          email: string
          id?: string
          source?: string
        }
        Update: {
          converted?: boolean
          created_at?: string
          email?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      label_print_jobs: {
        Row: {
          attempt_count: number
          batch_id: string
          created_at: string
          created_by: string | null
          id: string
          last_error: string | null
          max_attempts: number
          printed_at: string | null
          product_id: string
          sort_order: number
          staff_code: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          batch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          printed_at?: string | null
          product_id: string
          sort_order?: number
          staff_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          batch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          printed_at?: string | null
          product_id?: string
          sort_order?: number
          staff_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_print_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_print_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          created_at: string
          event_type: string
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          order_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          event_type: string
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          order_id: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          event_type?: string
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cover_image_snapshot: string | null
          created_at: string
          id: string
          line_total: number
          order_id: string
          packed_at: string | null
          product_id: string | null
          product_name_snapshot: string
          product_slug_snapshot: string | null
          quantity: number
          unit_price_snapshot: number
        }
        Insert: {
          cover_image_snapshot?: string | null
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          packed_at?: string | null
          product_id?: string | null
          product_name_snapshot: string
          product_slug_snapshot?: string | null
          quantity?: number
          unit_price_snapshot: number
        }
        Update: {
          cover_image_snapshot?: string | null
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          packed_at?: string | null
          product_id?: string | null
          product_name_snapshot?: string
          product_slug_snapshot?: string | null
          quantity?: number
          unit_price_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_snapshot_json: Json | null
          admin_note: string | null
          cancelled_at: string | null
          channel: string
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          customer_id: string | null
          customer_note: string | null
          discount_amount: number
          estimated_fulfillment: string | null
          expires_at: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_deadline: string | null
          pricing_snapshot_json: Json | null
          public_code: string
          ready_since: string | null
          shipping_amount: number
          shipping_rule_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          store_payment_method: string | null
          subtotal_amount: number
          total_amount: number
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          address_snapshot_json?: Json | null
          admin_note?: string | null
          cancelled_at?: string | null
          channel?: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_note?: string | null
          discount_amount?: number
          estimated_fulfillment?: string | null
          expires_at?: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_deadline?: string | null
          pricing_snapshot_json?: Json | null
          public_code: string
          ready_since?: string | null
          shipping_amount?: number
          shipping_rule_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_payment_method?: string | null
          subtotal_amount?: number
          total_amount?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          address_snapshot_json?: Json | null
          admin_note?: string | null
          cancelled_at?: string | null
          channel?: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_note?: string | null
          discount_amount?: number
          estimated_fulfillment?: string | null
          expires_at?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_deadline?: string | null
          pricing_snapshot_json?: Json | null
          public_code?: string
          ready_since?: string | null
          shipping_amount?: number
          shipping_rule_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_payment_method?: string | null
          subtotal_amount?: number
          total_amount?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_rule_id_fkey"
            columns: ["shipping_rule_id"]
            isOneToOne: false
            referencedRelation: "shipping_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      override_events: {
        Row: {
          context_json: Json | null
          created_at: string
          hold_session_id: string | null
          id: string
          order_id: string | null
          product_id: string
          reason: string
          staff_id: string
        }
        Insert: {
          context_json?: Json | null
          created_at?: string
          hold_session_id?: string | null
          id?: string
          order_id?: string | null
          product_id: string
          reason: string
          staff_id: string
        }
        Update: {
          context_json?: Json | null
          created_at?: string
          hold_session_id?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
          reason?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "override_events_hold_session_id_fkey"
            columns: ["hold_session_id"]
            isOneToOne: false
            referencedRelation: "hold_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_events_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          expires_at: string | null
          id: string
          order_id: string
          paid_at: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id: string | null
          provider_preference_id: string | null
          raw_payload_json: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id: string
          paid_at?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id?: string | null
          provider_preference_id?: string | null
          raw_payload_json?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string
          paid_at?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id?: string | null
          provider_preference_id?: string | null
          raw_payload_json?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_status_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          context: string | null
          created_at: string
          from_status: string | null
          id: string
          notes: string | null
          order_id: string | null
          product_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          context?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          context?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_status_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string | null
          compare_at_price: number | null
          condition: Database["public"]["Enums"]["product_condition"]
          cover_image_url: string | null
          created_at: string
          description: string | null
          gender: Database["public"]["Enums"]["product_gender"]
          id: string
          is_featured: boolean
          metadata_json: Json | null
          name: string
          price: number
          quantity: number
          size_group: Database["public"]["Enums"]["size_group"]
          size_label: string
          slug: string
          sold_channel: string | null
          staff_code: string | null
          status: Database["public"]["Enums"]["product_status"]
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          condition?: Database["public"]["Enums"]["product_condition"]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          gender?: Database["public"]["Enums"]["product_gender"]
          id?: string
          is_featured?: boolean
          metadata_json?: Json | null
          name: string
          price: number
          quantity?: number
          size_group: Database["public"]["Enums"]["size_group"]
          size_label: string
          slug: string
          sold_channel?: string | null
          staff_code?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          condition?: Database["public"]["Enums"]["product_condition"]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          gender?: Database["public"]["Enums"]["product_gender"]
          id?: string
          is_featured?: boolean
          metadata_json?: Json | null
          name?: string
          price?: number
          quantity?: number
          size_group?: Database["public"]["Enums"]["size_group"]
          size_label?: string
          slug?: string
          sold_channel?: string | null
          staff_code?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          correios_enabled: boolean
          created_at: string
          delivery_enabled: boolean
          delivery_max_radius_km: number
          delivery_min_amount: number
          delivery_multiplier: number
          delivery_rate_per_km: number
          id: string
          logo_url: string | null
          pickup_address: string | null
          pickup_enabled: boolean
          store_latitude: number | null
          store_longitude: number | null
          store_name: string
          store_postal_code: string | null
          support_email: string | null
          support_phone: string | null
          theme_json: Json | null
          updated_at: string
        }
        Insert: {
          correios_enabled?: boolean
          created_at?: string
          delivery_enabled?: boolean
          delivery_max_radius_km?: number
          delivery_min_amount?: number
          delivery_multiplier?: number
          delivery_rate_per_km?: number
          id?: string
          logo_url?: string | null
          pickup_address?: string | null
          pickup_enabled?: boolean
          store_latitude?: number | null
          store_longitude?: number | null
          store_name?: string
          store_postal_code?: string | null
          support_email?: string | null
          support_phone?: string | null
          theme_json?: Json | null
          updated_at?: string
        }
        Update: {
          correios_enabled?: boolean
          created_at?: string
          delivery_enabled?: boolean
          delivery_max_radius_km?: number
          delivery_min_amount?: number
          delivery_multiplier?: number
          delivery_rate_per_km?: number
          id?: string
          logo_url?: string | null
          pickup_address?: string | null
          pickup_enabled?: boolean
          store_latitude?: number | null
          store_longitude?: number | null
          store_name?: string
          store_postal_code?: string | null
          support_email?: string | null
          support_phone?: string | null
          theme_json?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      shipping_rules: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          metadata_json: Json | null
          name: string
          rule_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata_json?: Json | null
          name: string
          rule_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata_json?: Json | null
          name?: string
          rule_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _finalize_hold_session: {
        Args: {
          p_actor_id?: string
          p_actor_type?: string
          p_event_context?: string
          p_final_status: string
          p_hold_session_id: string
          p_notes?: string
        }
        Returns: undefined
      }
      apply_inventory_transition: {
        Args: {
          p_from: string
          p_hold_session_id?: string
          p_order_id?: string
          p_product_id: string
          p_sold_channel?: string
          p_to: string
        }
        Returns: Json
      }
      convert_hold_session: {
        Args: { p_order_id: string; p_session_id: string }
        Returns: Json
      }
      emit_product_status_event: {
        Args: {
          p_actor_id?: string
          p_actor_type: string
          p_context?: string
          p_from_status: string
          p_notes?: string
          p_order_id?: string
          p_product_id: string
          p_to_status: string
        }
        Returns: string
      }
      execute_override_action: {
        Args: {
          p_context?: string
          p_product_id: string
          p_reason: string
          p_staff_id: string
        }
        Returns: Json
      }
      expire_due_hold_sessions: { Args: never; Returns: Json }
      expire_due_pending_payment_orders: { Args: never; Returns: Json }
      is_active_admin: { Args: never; Returns: boolean }
      next_rp_staff_code: { Args: never; Returns: string }
      release_hold_item: {
        Args: { p_product_id: string; p_session_id: string }
        Returns: Json
      }
      release_hold_session: {
        Args: { p_final_status?: string; p_session_id: string }
        Returns: Json
      }
      reserve_cart_product: {
        Args: { p_product_id: string; p_session_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          product_id: string
          session_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "cart_reservations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reserve_hold_item: {
        Args: { p_product_id: string; p_session_id: string }
        Returns: Json
      }
    }
    Enums: {
      fulfillment_type: "pickup" | "delivery" | "correios" | "store_counter"
      intake_status: "new" | "reviewing" | "accepted" | "rejected" | "completed"
      order_status:
        | "pending_payment"
        | "paid"
        | "confirmed"
        | "ready_for_pickup"
        | "na_sacolinha"
        | "shipped"
        | "completed"
        | "cancelled"
        | "expired"
      order_type: "standard" | "sacolinha"
      payment_provider: "mercado_pago" | "cash" | "card_local" | "pix_local"
      payment_status:
        | "pending"
        | "authorized"
        | "paid"
        | "expired"
        | "cancelled"
        | "failed"
        | "refunded"
      product_condition: "novo" | "seminovo" | "bom_estado" | "com_detalhes"
      product_gender: "menino" | "menina" | "unissex"
      product_status: "available" | "reserved" | "sold" | "inactive" | "hold"
      size_group:
        | "rn_3m"
        | "3_6m"
        | "6_12m"
        | "12_18m"
        | "18_24m"
        | "2_3a"
        | "4_5a"
        | "6_8a"
        | "9_12a"
        | "13_mais"
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
      fulfillment_type: ["pickup", "delivery", "correios", "store_counter"],
      intake_status: ["new", "reviewing", "accepted", "rejected", "completed"],
      order_status: [
        "pending_payment",
        "paid",
        "confirmed",
        "ready_for_pickup",
        "na_sacolinha",
        "shipped",
        "completed",
        "cancelled",
        "expired",
      ],
      order_type: ["standard", "sacolinha"],
      payment_provider: ["mercado_pago", "cash", "card_local", "pix_local"],
      payment_status: [
        "pending",
        "authorized",
        "paid",
        "expired",
        "cancelled",
        "failed",
        "refunded",
      ],
      product_condition: ["novo", "seminovo", "bom_estado", "com_detalhes"],
      product_gender: ["menino", "menina", "unissex"],
      product_status: ["available", "reserved", "sold", "inactive", "hold"],
      size_group: [
        "rn_3m",
        "3_6m",
        "6_12m",
        "12_18m",
        "18_24m",
        "2_3a",
        "4_5a",
        "6_8a",
        "9_12a",
        "13_mais",
      ],
    },
  },
} as const
