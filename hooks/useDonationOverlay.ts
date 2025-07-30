import { useEffect, useState } from "react";

const DONATION_THRESHOLD = 50;
const LATER_DELAY_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export function useDonationOverlay(userProfile: any, playersCount: number) {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (!userProfile) return;

    const isFree = userProfile.paying_status === "free";
    const donationDate = userProfile.donation_date
      ? new Date(userProfile.donation_date)
      : null;

    // If donated less than a year ago, suppress
    if (userProfile.paying_status === "donated" && donationDate) {
      const oneYearLater = new Date(donationDate);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      if (new Date() < oneYearLater) return;
    }

    // Check if "Later" was clicked recently
    const hideUntil = localStorage.getItem("hideDonateOverlayUntil");
    if (hideUntil && Date.now() < parseInt(hideUntil)) return;

    if (isFree && playersCount >= DONATION_THRESHOLD) {
      setShowOverlay(true);
    }
  }, [userProfile, playersCount]);

  const dismissTemporarily = () => {
    localStorage.setItem(
      "hideDonateOverlayUntil",
      (Date.now() + LATER_DELAY_MS).toString()
    );
    setShowOverlay(false);
  };

  return { showOverlay, dismissTemporarily };
}
