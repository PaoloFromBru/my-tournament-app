export function generateRoundRobinMatches(teamIds: string[]): { team_a: string, team_b: string, phase: string }[] {
  const matches = [] as { team_a: string; team_b: string; phase: string }[];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({
        team_a: teamIds[i],
        team_b: teamIds[j],
        phase: `Matchday ${matches.length + 1}`,
      });
    }
  }
  return matches;
}

export function generateKnockoutMatches(teamIds: string[]): { team_a: string, team_b: string, phase: string }[] {
  const matches = [] as { team_a: string; team_b: string; phase: string }[];
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);

  while (shuffled.length > 1) {
    const team_a = shuffled.shift()!;
    const team_b = shuffled.shift()!;
    matches.push({ team_a, team_b, phase: 'Round 1' });
  }

  if (shuffled.length === 1) {
    matches.push({ team_a: shuffled[0], team_b: '', phase: 'BYE' });
  }

  return matches;
}
