import { useEffect, useState } from "react";

const donationThreshold = 50; // Customize this

export function useDonationPrompt(playersCount: number) {
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

  useEffect(() => {
    const alreadyPrompted = localStorage.getItem("donationPrompted");
    if (!alreadyPrompted && playersCount >= donationThreshold) {
      setShouldShowPrompt(true);
      localStorage.setItem("donationPrompted", "true");
    }
  }, [playersCount]);

  return shouldShowPrompt;
}
