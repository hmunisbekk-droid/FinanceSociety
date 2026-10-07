"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { Alert, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { setEventPoster } from "../actions";

const MAX_BYTES = 5 * 1024 * 1024;

export function PosterUpload({ eventId }: { eventId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose an image first.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Use a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Posters must be 5 MB or smaller.");
      return;
    }

    setPending(true);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${eventId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("posters").upload(path, file, { contentType: file.type });
    if (uploadError) {
      setPending(false);
      setError(`Upload failed: ${uploadError.message}`);
      return;
    }
    const result = await setEventPoster({ eventId, path });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setFile(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label="Poster image"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-800 hover:file:bg-brand-100"
      />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
        {pending ? "Uploading…" : "Upload poster"}
      </Button>
    </form>
  );
}
