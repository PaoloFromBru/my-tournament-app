-- Enable Row Level Security on public tables and define basic policies

-- Tournament teams table
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage tournament teams for their own tournaments
CREATE POLICY "tournament_teams_owner_all"
  ON public.tournament_teams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.user_id = auth.uid()
    )
  );

-- Players table
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to access only their own players
CREATE POLICY "players_owner_all"
  ON public.players
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
