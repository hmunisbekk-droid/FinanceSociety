import type { Metadata } from "next";
import { Search } from "lucide-react";
import { LevelCard } from "@/components/level-card";
import { Button, Container, Input, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getLevelsWithCounts } from "@/lib/queries";

export const metadata: Metadata = { title: "Learning Hub" };

export default async function LearnPage() {
  const [user, levels] = await Promise.all([getCurrentUser(), getLevelsWithCounts()]);

  return (
    <Container className="py-10 sm:py-14">
      <PageHeader
        eyebrow="Learning Hub"
        title="Choose your level"
        description="Levels follow your WIUT year. Each level has its subjects, every subject its topics, and every topic ends in a quiz."
      />
      <form method="get" action="/search" role="search" className="mt-6 flex max-w-xl gap-2">
        <Input name="q" type="search" placeholder="Search topics, e.g. NPV or WACC" aria-label="Search the Learning Hub" className="flex-1" />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </Button>
      </form>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {levels.map((level) => (
          <LevelCard key={level.id} level={level} isMine={user?.profile.level_id === level.id} />
        ))}
      </div>
    </Container>
  );
}
