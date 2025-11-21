import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UseCollectifPlayersResult {
  playerCount: number;
  loading: boolean;
}

export function useCollectifPlayers(teamId: string): UseCollectifPlayersResult {
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPlayerCount = async () => {
      if (!teamId) {
        setPlayerCount(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { count, error } = await supabase
          .from('VEEC_Collectifs')
          .select('*', { count: 'exact', head: true })
          .eq('equipe_id', teamId);

        if (error) throw error;

        setPlayerCount(count || 0);
      } catch (err) {
        console.error('Error fetching player count:', err);
        setPlayerCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerCount();
  }, [teamId]);

  return { playerCount, loading };
}
