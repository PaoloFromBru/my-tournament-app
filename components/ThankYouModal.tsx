"use client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ThankYouModal({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>🎉 Thank you!</DialogTitle>
        <DialogDescription className="mt-2 space-y-2 text-sm">
          <p>You're amazing. Your donation helps keep this app alive and improving.</p>
          <p>Enjoy running your tournaments — we'll be here when you need us.</p>
        </DialogDescription>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 border border-gray-300 hover:bg-gray-100 text-sm"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
