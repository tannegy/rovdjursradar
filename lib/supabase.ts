import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Sighting = {
  id: string;
  predator_type: 'wolf' | 'lynx' | 'bear' | 'eagle' | 'wolverine';
  observation_type: 'visual' | 'tracks' | 'camera' | 'damage' | 'dead' | 'dna';
  source: 'crowd' | 'official' | 'club' | 'skandobs';
  latitude: number;
  longitude: number;
  county: string | null;
  sighted_at: string;
  count: number;
  notes: string | null;
  image_url: string | null;
  verified: boolean;
  trust_score: number;
  created_at: string;
};

export async function getSightings(params?: {
  species?: string[];
  obsType?: string;
  source?: string[];
  county?: string;
  hoursAgo?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) {
  let query = supabase
    .from('sightings')
    .select('*')
    .order('sighted_at', { ascending: false });

  if (params?.species?.length) {
    query = query.in('predator_type', params.species);
  }
  if (params?.obsType && params.obsType !== 'all') {
    query = query.eq('observation_type', params.obsType);
  }
  if (params?.source?.length) {
    query = query.in('source', params.source);
  }
  if (params?.county && params.county !== 'all') {
    query = query.eq('county', params.county);
  }
  if (params?.hoursAgo) {
    const cutoff = new Date(Date.now() - params.hoursAgo * 3600000).toISOString();
    query = query.gte('sighted_at', cutoff);
  }
  if (params?.dateFrom) {
    query = query.gte('sighted_at', params.dateFrom);
  }
  if (params?.dateTo) {
    query = query.lte('sighted_at', params.dateTo + 'T23:59:59Z');
  }
  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Sighting[];
}

export async function createSighting(sighting: {
  predator_type: string;
  observation_type: string;
  source: string;
  latitude: number;
  longitude: number;
  sighted_at: string;
  count: number;
  notes?: string;
  ip_hash?: string;
}) {
  const { data, error } = await supabase
    .from('sightings')
    .insert([{
      ...sighting,
      latitude: Math.round(sighting.latitude * 100) / 100,
      longitude: Math.round(sighting.longitude * 100) / 100,
    }])
    .select()
    .single();

  if (error) throw error;
  return data as Sighting;
}

export async function flagSighting(id: string) {
  const { error } = await supabase.rpc('flag_sighting', { sighting_id: id });
  if (error) throw error;
}
