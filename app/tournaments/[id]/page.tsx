"use client";
import { useParams } from "next/navigation";

export default function TournamentViewPage() {
  const params = useParams();
  const id = params?.id as string;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Tournament {id}</h2>
      <p>Results and details will appear here.</p>
    </div>
  );
}
