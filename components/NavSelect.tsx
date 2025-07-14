"use client";
import { useRouter } from "next/navigation";

export default function NavSelect() {
  const router = useRouter();
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) router.push(val);
  };

  return (
    <select onChange={handleChange} defaultValue="" className="border p-1">
      <option value="" disabled>
        Select page
      </option>
      <option value="/players">Players</option>
      <option value="/setup">Tournament Setup</option>
      <option value="/run">Tournament Run</option>
    </select>
  );
}
