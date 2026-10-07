"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { recordUploadedMaterial } from "../actions";

const MAX_BYTES = 20 * 1024 * 1024; // FR-18

function detectType(file: File): "pdf" | "slides" | "image" | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".pptx") || name.endsWith(".ppt") || name.endsWith(".key") || file.type.includes("presentation")) return "slides";
  if (file.type.startsWith("image/")) return "image";
  return null;
}

/** Uploads straight from the browser to Supabase Storage, then records the material. */
export function MaterialUpload({ topicId }: { topicId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [allowDownload, setAllowDownload] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Files must be 20 MB or smaller.");
      return;
    }
    const type = detectType(file);
    if (!type) {
      setError("Supported files: PDF, slides (PPTX) and images. For videos, add a link instead.");
      return;
    }

    setPending(true);
    const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80);
    const path = `${topicId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("materials").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (uploadError) {
      setPending(false);
      setError(`Upload failed: ${uploadError.message}`);
      return;
    }

    const result = await recordUploadedMaterial({
      topicId,
      title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
      type,
      storagePath: path,
      fileSize: file.size,
      allowDownload,
    });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(`"${title.trim() || file.name}" uploaded.`);
    setTitle("");
    setFile(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      {done && <Alert tone="success">{done}</Alert>}
      <Field label="Title" htmlFor="upload-title" hint="Leave empty to use the file name">
        <Input id="upload-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lecture 3 slides" />
      </Field>
      <Field label="File" htmlFor="upload-file" hint="PDF, PPTX or image · up to 20 MB">
        <input
          id="upload-file"
          type="file"
          accept=".pdf,.pptx,.ppt,image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-800 hover:file:bg-brand-100"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} className="h-4 w-4 accent-brand-700" />
        Students may download this file (otherwise view only)
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
        {pending ? "Uploading…" : "Upload file"}
      </Button>
    </form>
  );
}
