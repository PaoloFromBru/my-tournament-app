"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function DonationModal({
  onClose,
  stripeLink,
}: {
  onClose: () => void;
  stripeLink: string;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-xl font-semibold">
          You're clearly enjoying the app 🎉
        </DialogTitle>
        <DialogDescription className="mt-2 space-y-3 text-sm text-muted-foreground">
          <p>You've added over 50 players — that’s amazing!</p>
          <p>
            This app is crafted with ❤️ by an indie developer and is completely free to use.
          </p>
          <p>
            If it’s helping you run great tournaments, would you consider a small donation to support
            future improvements?
          </p>
        </DialogDescription>
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 border border-gray-300 hover:bg-gray-100 text-sm"
          >
            Later
          </button>
          <a
            href={stripeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-yellow-500 text-white text-sm px-4 py-2 rounded hover:bg-yellow-600"
          >
            Donate
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
