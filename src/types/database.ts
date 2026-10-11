export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          currency: string
          currency_symbol: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          currency?: string
          currency_symbol?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          currency?: string
          currency_symbol?: string
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'savings' | 'current' | 'salary' | 'cash' | 'credit_card' | 'investment'
          account_number: string | null
          balance: number
          opening_balance: number
          color: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          type: 'savings' | 'current' | 'salary' | 'cash' | 'credit_card' | 'investment'
          account_number?: string | null
          balance?: number
          opening_balance?: number
          color?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: 'savings' | 'current' | 'salary' | 'cash' | 'credit_card' | 'investment'
          account_number?: string | null
          balance?: number
          opening_balance?: number
          color?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'income' | 'expense' | 'transfer'
          amount: number
          title: string
          category: string
          account_id: string
          to_account_id: string | null
          date: string
          time: string | null
          payment_method: string
          notes: string | null
          is_recurring: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          type: 'income' | 'expense' | 'transfer'
          amount: number
          title: string
          category: string
          account_id: string
          to_account_id?: string | null
          date?: string
          time?: string | null
          payment_method?: string
          notes?: string | null
          is_recurring?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          type?: 'income' | 'expense' | 'transfer'
          amount?: number
          title?: string
          category?: string
          account_id?: string
          to_account_id?: string | null
          date?: string
          time?: string | null
          payment_method?: string
          notes?: string | null
          is_recurring?: boolean
          updated_at?: string
        }
      }
      emis: {
        Row: {
          id: string
          user_id: string
          name: string
          lender: string
          principal: number
          interest_rate: number
          tenure_months: number
          emi_amount: number
          start_date: string
          due_day: number
          account_id: string | null
          status: 'active' | 'completed' | 'foreclosed' | 'paused'
          category: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          lender: string
          principal: number
          interest_rate: number
          tenure_months: number
          emi_amount: number
          start_date?: string
          due_day: number
          account_id?: string | null
          status?: 'active' | 'completed' | 'foreclosed' | 'paused'
          category?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          lender?: string
          principal?: number
          interest_rate?: number
          tenure_months?: number
          emi_amount?: number
          start_date?: string
          due_day?: number
          account_id?: string | null
          status?: 'active' | 'completed' | 'foreclosed' | 'paused'
          category?: string
          notes?: string | null
          updated_at?: string
        }
      }
      emi_payments: {
        Row: {
          id: string
          user_id: string
          emi_id: string
          transaction_id: string | null
          instalment_number: number
          amount: number
          principal_component: number
          interest_component: number
          payment_date: string
          status: 'paid' | 'pending' | 'overdue' | 'skipped'
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          emi_id: string
          transaction_id?: string | null
          instalment_number: number
          amount: number
          principal_component?: number
          interest_component?: number
          payment_date?: string
          status?: 'paid' | 'pending' | 'overdue' | 'skipped'
          created_at?: string
        }
        Update: {
          status?: 'paid' | 'pending' | 'overdue' | 'skipped'
          payment_date?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category: string
          monthly_limit: number
          month: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          category: string
          monthly_limit: number
          month: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          category?: string
          monthly_limit?: number
          month?: string
          updated_at?: string
        }
      }
      presets: {
        Row: {
          id: string
          user_id: string
          type: 'expense' | 'income' | 'transfer'
          title: string
          category: string
          default_amount: number | null
          account_id: string | null
          payment_method: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          type: 'expense' | 'income' | 'transfer'
          title: string
          category: string
          default_amount?: number | null
          account_id?: string | null
          payment_method?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          title?: string
          category?: string
          default_amount?: number | null
          account_id?: string | null
          payment_method?: string | null
          notes?: string | null
        }
      }
    }
  }
}
