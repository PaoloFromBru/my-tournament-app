"use client";
import React from "react";

interface BaseItem {
  id: number | string;
  [key: string]: any;
}

interface SelectableTagGroupProps<T extends BaseItem> {
  items: T[];
  selectedIds: Array<T["id"]>;
  onToggle: (id: T["id"]) => void;
  label?: string;
  getLabel?: (item: T) => string;
  maxHeight?: string;
}

export default function SelectableTagGroup<T extends BaseItem>({
  items,
  selectedIds,
  onToggle,
  label = "Select items",
  getLabel = (item) => (item as any).name,
  maxHeight = "max-h-40",
}: SelectableTagGroupProps<T>) {
  return (
    <div className="space-y-2">
      <label className="font-medium text-sm">{label}</label>
      <div
        className={`flex flex-wrap gap-2 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white ${maxHeight}`}
      >
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <label
              key={item.id}
              className={`px-3 py-1 rounded-full border text-sm cursor-pointer transition ${isSelected ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
              onClick={() => onToggle(item.id)}
            >
              {getLabel(item)}
            </label>
          );
        })}
      </div>
    </div>
  );
}
