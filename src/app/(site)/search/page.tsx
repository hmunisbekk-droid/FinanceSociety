import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, FileText, Layers, Lock, Search } from "lucide-react";
import { Button, Container, Input, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { searchContent, type SearchHit } from "@/lib/search";

export const metadata: Metadata = { title: "Search" };

function ResultList({ title, icon: Icon, hits, empty }: { title: string; icon: typeof Search; hits: SearchHit[]; empty: string }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-bold text-brand-900">
        <Icon className="h-5 w-5 text-accent-600" aria-hidden="true" />
        {title} <span className="font-normal text-slate-500">({hits.length})</span>
      </h2>
      {hits.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 rounded-card border border-slate-200 bg-white shadow-card">
          {hits.map((hit) => (
            <li key={hit.id}>
              <Link href={hit.href} className="block p-4 hover:bg-slate-50">
                <span className="block font-semibold text-brand-900">{hit.title}</span>
                <span className="mt-0.5 block text-sm text-slate-500">{hit.subtitle}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = "" }, user] = await Promise.all([searchParams, getCurrentUser()]);
  const query = q.trim();
  const results = query ? await searchContent(query) : null;
  const total = results ? results.subjects.length + results.topics.length + results.materials.length : 0;

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <PageHeader eyebrow="Search" title="Find a subject, topic or material" />

      <form method="get" action="/search" className="mt-6 flex gap-2" role="search">
        <Input name="q" type="search" defaultValue={query} placeholder="e.g. NPV, WACC, bonds…" aria-label="Search" autoFocus={!query} className="flex-1" />
        <Button type="submit">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </Button>
      </form>

      {!user && (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          Topics and materials appear in results once you{" "}
          <Link href={`/login?next=${encodeURIComponent(`/search?q=${query}`)}`} className="font-medium text-brand-700 hover:underline">
            log in
          </Link>
          .
        </p>
      )}

      {results && (
        <div className="mt-8 space-y-8">
          <p className="text-sm text-slate-600">
            {total === 0 ? "Nothing found for" : `${total} ${total === 1 ? "result" : "results"} for`} <strong>“{query}”</strong>
          </p>
          <ResultList title="Topics" icon={BookOpen} hits={results.topics} empty="No topics match." />
          <ResultList title="Subjects" icon={Layers} hits={results.subjects} empty="No subjects match." />
          <ResultList title="Materials" icon={FileText} hits={results.materials} empty="No materials match." />
        </div>
      )}
    </Container>
  );
}
