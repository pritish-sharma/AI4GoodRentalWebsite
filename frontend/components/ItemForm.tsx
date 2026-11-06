"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { CATEGORIES } from "@/lib/categories";
import { PHOTO_BUCKET, supabase } from "@/lib/supabase";

const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket limit in supabase/accounts-and-photos.sql
const CONDITIONS = [
  { value: "like new", label: "Like new", hint: "No visible wear" },
  { value: "good", label: "Good", hint: "Normal signs of use" },
  { value: "worn", label: "Worn", hint: "Works fine, looks used" },
] as const;

export type ItemFormValues = {
  title: string;
  description: string;
  category: string;
  price_per_day: string;
  condition_stated: "like new" | "good" | "worn";
  photos: string[];
};

const EMPTY: ItemFormValues = {
  title: "",
  description: "",
  category: "",
  price_per_day: "",
  condition_stated: "good",
  photos: [],
};

type Upload = { id: string; preview: string; url?: string; error?: string };

export default function ItemForm({
  token,
  userId,
  itemId,
  initial = EMPTY,
}: {
  token: string;
  userId: string;
  /** Set when editing an existing listing. */
  itemId?: string;
  initial?: ItemFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [uploads, setUploads] = useState<Upload[]>(
    initial.photos.map((url) => ({ id: url, preview: url, url })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function addPhotos(files: FileList | null) {
    if (!files || !supabase) return;
    const room = MAX_PHOTOS - uploads.length;
    for (const file of Array.from(files).slice(0, room)) {
      const id = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      if (!file.type.startsWith("image/")) {
        setUploads((u) => [...u, { id, preview, error: "Not an image" }]);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setUploads((u) => [...u, { id, preview, error: "Over 5 MB" }]);
        continue;
      }
      setUploads((u) => [...u, { id, preview }]);

      // Each user uploads into a folder named after their id (required by the storage policy).
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { contentType: file.type });
      const url = uploadError ? undefined : supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
      setUploads((u) =>
        u.map((p) => (p.id === id ? { ...p, url, error: uploadError ? "Upload failed" : undefined } : p)),
      );
    }
  }

  const uploading = uploads.some((u) => !u.url && !u.error);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (values.title.trim().length < 3) return setError("Give it a title (at least 3 characters).");
    if (!values.category) return setError("Pick a category.");
    const price = Number(values.price_per_day);
    if (!(price > 0 && price <= 500)) return setError("Price per day should be between $0.01 and $500.");
    if (uploading) return setError("Wait for photos to finish uploading.");

    const body = {
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      price_per_day: price.toFixed(2),
      photos: uploads.filter((u) => u.url).map((u) => u.url!),
    };
    setSaving(true);
    try {
      const saved = itemId
        ? await apiRequest<{ id: string }>(`/items/${itemId}`, token, { method: "PATCH", body })
        : await apiRequest<{ id: string }>("/items", token, { method: "POST", body });
      router.push(`/items/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <Field group label="Photos" hint={`Up to ${MAX_PHOTOS}. The first one is the cover. JPG, PNG or WebP, under 5 MB.`}>
        <div className="flex flex-wrap gap-3">
          {uploads.map((u, i) => (
            <div key={u.id} className="relative h-24 w-28 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.preview} alt="" className={`h-full w-full object-cover ${u.url ? "" : "opacity-50"}`} />
              {i === 0 && u.url && (
                <span className="absolute left-1 top-1 rounded bg-zinc-900/80 px-1.5 text-[10px] text-white">Cover</span>
              )}
              {!u.url && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-zinc-800">
                  {u.error ?? "Uploading…"}
                </span>
              )}
              <button
                type="button"
                onClick={() => setUploads((all) => all.filter((p) => p.id !== u.id))}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-sm text-zinc-800 shadow hover:bg-white"
              >
                ×
              </button>
            </div>
          ))}
          {uploads.length < MAX_PHOTOS && (
            <label className="flex h-24 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-white text-sm text-zinc-600 hover:border-zinc-500">
              <span className="text-2xl leading-none">+</span>
              Add photos
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                multiple
                className="sr-only"
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        {!supabase && <p className="text-xs text-amber-700">Photo uploads need the Supabase keys in .env.local.</p>}
      </Field>

      <Field label="Title">
        <input
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={100}
          placeholder="e.g. Canon DSLR with 18–55mm lens"
          className="input"
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Category">
          <select value={values.category} onChange={(e) => set("category", e.target.value)} className="input">
            <option value="">Choose…</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Price per day" hint="Most items rent for $3–$20 a day.">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              max="500"
              step="0.5"
              value={values.price_per_day}
              onChange={(e) => set("price_per_day", e.target.value)}
              className="input pl-7"
            />
          </div>
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-zinc-800">Condition</legend>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          {CONDITIONS.map((c) => (
            <label
              key={c.value}
              className={`cursor-pointer rounded-lg border p-3 text-sm ${
                values.condition_stated === c.value ? "border-zinc-900 bg-zinc-50" : "border-zinc-300 bg-white"
              }`}
            >
              <input
                type="radio"
                name="condition"
                value={c.value}
                checked={values.condition_stated === c.value}
                onChange={() => set("condition_stated", c.value)}
                className="sr-only"
              />
              <span className="font-medium text-zinc-900">{c.label}</span>
              <span className="block text-xs text-zinc-500">{c.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Description" hint="What's included, any quirks, where on campus to pick it up.">
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          maxLength={2000}
          className="input"
        />
      </Field>

      <p className="text-xs text-zinc-500">
        No weapons, alcohol, medication, or anything that needs a license.
      </p>

      {error && (
        <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : itemId ? "Save changes" : "Publish listing"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// A <label> wraps the input so clicking the text focuses it and screen readers
// announce it. `group` is for sections holding several controls (the photos).
function Field({
  label,
  hint,
  group = false,
  children,
}: {
  label: string;
  hint?: string;
  group?: boolean;
  children: React.ReactNode;
}) {
  const Wrapper = group ? "div" : "label";
  return (
    <Wrapper className="flex flex-col gap-1.5" {...(group && { role: "group", "aria-label": label })}>
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-zinc-500">{hint}</span>}
    </Wrapper>
  );
}
