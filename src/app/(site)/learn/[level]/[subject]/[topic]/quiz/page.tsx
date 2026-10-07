import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getTopicPage } from "@/lib/learning";
import { loadFullQuestions, toPublicQuestions } from "@/lib/quiz";
import { QuizRunner } from "./quiz-runner";

type Params = Promise<{ level: string; subject: string; topic: string }>;

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage({ params }: { params: Params }) {
  const { level: levelParam, subject: subjectSlug, topic: topicSlug } = await params;
  const levelNumber = Number(levelParam);
  if (!Number.isInteger(levelNumber)) notFound();

  const topicPath = `/learn/${levelNumber}/${subjectSlug}/${topicSlug}`;
  const user = await requireUser(`${topicPath}/quiz`);
  const page = await getTopicPage(levelNumber, subjectSlug, topicSlug, user.id);
  if (!page) notFound();
  const { level, subject, topic, quiz, bestPercent } = page;

  // Row security already hid unpublished quizzes from students; editors see their drafts.
  if (!quiz) redirect(topicPath);

  const full = await loadFullQuestions(quiz.id);
  const questions = toPublicQuestions(full, {
    shuffleQuestions: quiz.shuffle_questions,
    shuffleOptions: quiz.shuffle_options,
  });

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { href: "/learn", label: "Learning Hub" },
          { href: `/learn/${level.number}`, label: level.name },
          { href: `/learn/${level.number}/${subject.slug}`, label: subject.name },
          { href: topicPath, label: topic.title },
          { label: "Quiz" },
        ]}
      />
      <div className="mx-auto mt-6 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">{topic.title}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-900">{quiz.title}</h1>
        {questions.length === 0 ? (
          <p className="mt-6 rounded-card border border-dashed border-slate-300 p-8 text-center text-slate-500">
            This quiz has no questions yet.
          </p>
        ) : (
          <QuizRunner quizId={quiz.id} questions={questions} topicHref={topicPath} previousBest={bestPercent} />
        )}
      </div>
    </Container>
  );
}
