import { Download, ExternalLink, FileText, Image as ImageIcon, Link as LinkIcon, Presentation, StickyNote, Video } from "lucide-react";
import { Prose } from "@/components/prose";
import { buttonClasses } from "@/components/ui";
import { formatFileSize } from "@/lib/format";
import type { MaterialView } from "@/lib/learning";
import type { MaterialType } from "@/lib/types";

const ICONS: Record<MaterialType, typeof FileText> = {
  pdf: FileText,
  slides: Presentation,
  image: ImageIcon,
  video: Video,
  link: LinkIcon,
  notes: StickyNote,
};

const LABELS: Record<MaterialType, string> = {
  pdf: "PDF",
  slides: "Slides",
  image: "Image",
  video: "Video",
  link: "Link",
  notes: "Notes",
};

/** Extracts a YouTube video id from the usual URL shapes, or null. */
export function youtubeId(url: string | null) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1]! : null;
}

export function MaterialItem({ material }: { material: MaterialView }) {
  const Icon = ICONS[material.type];
  const yt = material.type === "video" ? youtubeId(material.external_url) : null;

  return (
    <li className="rounded-card border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-brand-900">{material.title}</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {LABELS[material.type]}
            {material.file_size ? ` · ${formatFileSize(material.file_size)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {material.openUrl && material.type !== "notes" && !yt && (
            <a
              href={material.openUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses("secondary", "sm")}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Open
            </a>
          )}
          {material.downloadUrl && (
            <a href={material.downloadUrl} className={buttonClasses("ghost", "sm")} download>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </a>
          )}
        </div>
      </div>

      {material.type === "notes" && material.body && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <Prose text={material.body} />
        </div>
      )}

      {yt && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${yt}`}
            title={material.title}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}
    </li>
  );
}
