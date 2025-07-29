"use client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function DonationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Support the Developer</DialogTitle>
        <DialogDescription>
          You’ve created over 50 players — amazing! If you like the app, consider donating to support its development.
        </DialogDescription>
        <div className="mt-4 flex justify-end">
          <a
            href="https://buy.stripe.com/3cIfZie5z8KwcAq9xDak000"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Donate
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
