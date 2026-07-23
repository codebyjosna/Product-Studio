export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise';

export interface ProfileRow {
  id: string;
  email: string;
  name: string;
  plan_id: PlanId;
  tokens: number | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  txn_code: string;
  plan_id: PlanId;
  billing: string;
  amount_label: string | null;
  status: 'success' | 'failed' | 'pending';
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  message: string | null;
  created_at: string;
}

export interface MediaAssetRow {
  id: string;
  user_id: string;
  bucket: string;
  path: string;
  mime_type: string | null;
  kind: 'product' | 'atmosphere' | 'video' | 'other';
  public_url: string | null;
  created_at: string;
}

type PublicTables = {
  profiles: {
    Row: ProfileRow;
    Insert: {
      id: string;
      email: string;
      name?: string;
      plan_id?: PlanId;
      tokens?: number | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      email?: string;
      name?: string;
      plan_id?: PlanId;
      tokens?: number | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  transactions: {
    Row: TransactionRow;
    Insert: {
      id?: string;
      user_id: string;
      txn_code: string;
      plan_id: PlanId;
      billing?: string;
      amount_label?: string | null;
      status: 'success' | 'failed' | 'pending';
      razorpay_order_id?: string | null;
      razorpay_payment_id?: string | null;
      message?: string | null;
      created_at?: string;
    };
    Update: Partial<TransactionRow>;
    Relationships: [];
  };
  media_assets: {
    Row: MediaAssetRow;
    Insert: {
      id?: string;
      user_id: string;
      bucket: string;
      path: string;
      mime_type?: string | null;
      kind: MediaAssetRow['kind'];
      public_url?: string | null;
      created_at?: string;
    };
    Update: Partial<MediaAssetRow>;
    Relationships: [];
  };
};

export type Database = {
  public: {
    Tables: PublicTables;
    Views: Record<string, never>;
    Functions: {
      consume_tokens: {
        Args: { p_cost?: number };
        Returns: ProfileRow;
      };
      apply_plan: {
        Args: { p_user_id: string; p_plan_id: string };
        Returns: ProfileRow;
      };
      plan_token_allotment: {
        Args: { p_plan: string };
        Returns: number | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
