import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export type WebhookMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type WebhookAuthType = 'none' | 'bearer' | 'basic' | 'header';

export interface Webhook {
  id: string;
  name: string;
  endpoint: string;
  method: WebhookMethod;
  auth_type: WebhookAuthType;
  auth_value: string | null;   // bearer: token | basic: "user:pass" | header: "HeaderName:value"
  created_at?: string;
}

export type WebhookFormData = Omit<Webhook, 'id' | 'created_at'>;

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: true });
      if (err) throw err;
      setWebhooks(data ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors du chargement des webhooks.');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = async (data: WebhookFormData): Promise<Webhook | null> => {
    try {
      const { data: created, error: err } = await supabase
        .from('webhooks')
        .insert([data])
        .select()
        .single();
      if (err) throw err;
      await fetch();
      return created;
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la création.');
      return null;
    }
  };

  const update = async (id: string, data: Partial<WebhookFormData>): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('webhooks')
        .update(data)
        .eq('id', id);
      if (err) throw err;
      await fetch();
      return true;
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la mise à jour.');
      return false;
    }
  };

  const remove = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id);
      if (err) throw err;
      await fetch();
      return true;
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la suppression.');
      return false;
    }
  };

  useEffect(() => { fetch(); }, [fetch]);

  return { webhooks, loading, error, refetch: fetch, create, update, remove };
}
