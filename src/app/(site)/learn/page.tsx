import type { Metadata } from "next";
import { LevelCard } from "@/components/level-card";
import { Container, PageHeader } from "@/components/ui";
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
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {levels.map((level) => (
          <LevelCard key={level.id} level={level} isMine={user?.profile.level_id === level.id} />
        ))}
      </div>
    </Container>
  );
}
