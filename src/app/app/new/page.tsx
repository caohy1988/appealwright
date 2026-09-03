"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { locateAddress } from "@/lib/agent";
import { useStore } from "@/lib/store";
import type { Subject } from "@/lib/types";

const CITIES = ["Kirkland", "Bellevue", "Redmond", "Bothell", "Woodinville"];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}
function parcelFor(s: string) {
  let h = 5381;
  for (const ch of s) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  const a = String(h % 1000000).padStart(6, "0");
  const b = String((h >>> 8) % 10000).padStart(4, "0");
  return `${a}-${b}`;
}

const field = "block min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base text-ink-950 tnum focus:border-ink-950 focus:outline-none md:text-sm";
const label = "block text-xs font-medium text-ink-700";

export default function NewCase() {
  const store = useStore();
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Kirkland");
  const [assessed, setAssessed] = useState("");
  const [sqft, setSqft] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [lot, setLot] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const av = Number(assessed.replace(/[^0-9.]/g, ""));
    if (address.trim().length < 5) return setErr("Enter a street address.");
    if (!av || av < 50000) return setErr("Enter the assessed value from the valuation notice.");
    const factsAssumed = !sqft || !beds || !baths || !yearBuilt;
    const { lat, lng } = locateAddress(`${address} ${city}`);
    const id = `${slug(address)}-${parcelFor(address + city).slice(-4)}`;
    const s: Subject = {
      id,
      address: address.trim(),
      city,
      zip: city === "Kirkland" ? "98034" : city === "Redmond" ? "98052" : city === "Bellevue" ? "98004" : city === "Bothell" ? "98011" : "98072",
      parcel: parcelFor(address + city),
      assessedValue: Math.round(av),
      beds: Number(beds) || 3,
      baths: Number(baths) || 2,
      sqft: Number(sqft) || 2000,
      lotSqft: Number(lot) || 7500,
      yearBuilt: Number(yearBuilt) || 1985,
      lat,
      lng,
      status: "new",
      createdAt: new Date().toISOString(),
      seeded: false,
      factsAssumed,
      owner: "Owner of record",
    };
    store.addCase(s);
    router.push(`/app/cases/${s.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">New case</h1>
      <p className="mt-1 text-sm text-ink-700">Address and assessed value are enough. Facts you leave blank are assumed and flagged on the workstation.</p>
      <Card className="mt-6 p-4 md:p-6">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div>
              <label htmlFor="address" className={label}>
                Street address
              </label>
              <input id="address" className={`${field} mt-1`} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12345 NE 128th St" autoComplete="street-address" />
            </div>
            <div>
              <label htmlFor="city" className={label}>
                City
              </label>
              <select id="city" className={`${field} mt-1`} value={city} onChange={(e) => setCity(e.target.value)}>
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="assessed" className={label}>
              Assessed value (2026 notice)
            </label>
            <input id="assessed" className={`${field} mt-1`} inputMode="numeric" value={assessed} onChange={(e) => setAssessed(e.target.value)} placeholder="1,250,000" />
          </div>
          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <legend className="mb-1 text-xs font-medium text-ink-700">Optional facts</legend>
            {[
              ["sqft", "Living SF", sqft, setSqft, "2,100"],
              ["beds", "Beds", beds, setBeds, "3"],
              ["baths", "Baths", baths, setBaths, "2.5"],
              ["year", "Built", yearBuilt, setYearBuilt, "1988"],
              ["lot", "Lot SF", lot, setLot, "7,500"],
            ].map(([id, l, v, set, ph]) => (
              <div key={id as string}>
                <label htmlFor={id as string} className={label}>
                  {l as string}
                </label>
                <input id={id as string} className={`${field} mt-1`} inputMode="decimal" value={v as string} onChange={(e) => (set as (s: string) => void)(e.target.value)} placeholder={ph as string} />
              </div>
            ))}
          </fieldset>
          {err ? <p className="text-sm text-rust-700">{err}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ink-500">Demo: pasted addresses are located inside the Kirkland demo area and matched against synthetic sales.</p>
            <Button type="submit" size="lg">
              Draft appeal
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
