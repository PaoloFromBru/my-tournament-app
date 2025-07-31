import { useEffect, useState } from "react";

export function useDonationOverlay(userProfile: any, playersCount: number) {
  const [status, setStatus] =
    useState<"show" | "thankyou" | "hidden">("hidden");

  useEffect(() => {
    if (!userProfile) return;

    const donationDate = userProfile.donation_date
      ? new Date(userProfile.donation_date)
      : null;
    const isDonated = userProfile.paying_status === "donated";

    const hideUntil = localStorage.getItem("hideDonateOverlayUntil");
    const suppressed = hideUntil && Date.now() < parseInt(hideUntil);

    if (isDonated && donationDate) {
      const oneYearLater = new Date(donationDate);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

      if (new Date() < oneYearLater && !suppressed) {
        setStatus("thankyou");
        return;
      }
    }

    if (
      userProfile.paying_status === "free" &&
      playersCount >= 50 &&
      !suppressed
    ) {
      setStatus("show");
    } else {
      setStatus("hidden");
    }
  }, [userProfile, playersCount]);

  const dismissTemporarily = () => {
    localStorage.setItem(
      "hideDonateOverlayUntil",
      (Date.now() + 7 * 86400000).toString()
    );
    setStatus("hidden");
  };

  const dismissThankYou = () => {
    const donationDate = userProfile?.donation_date
      ? new Date(userProfile.donation_date)
      : null;

    let hideUntil = Date.now() + 365 * 86400000;
    if (donationDate) {
      const oneYearLater = new Date(donationDate);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      hideUntil = oneYearLater.getTime();
    }
    localStorage.setItem("hideDonateOverlayUntil", hideUntil.toString());
    setStatus("hidden");
  };

  return { status, dismissTemporarily, dismissThankYou };
}
