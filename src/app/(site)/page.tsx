import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, ClipboardCheck, Layers } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { LevelCard } from "@/components/level-card";
import { ButtonLink, Container } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getLevelsWithCounts, getUpcomingEvents } from "@/lib/queries";
import { site } from "@/lib/site";

const STEPS = [
  {
    icon: Layers,
    title: "Pick your level",
    text: "Levels 3 to 6 mirror your WIUT year, so you only see the modules you are studying now.",
  },
  {
    icon: BookOpenCheck,
    title: "Study the topic",
    text: "Each topic has a plain-English summary, the key formulas, a worked example and the club's materials.",
  },
  {
    icon: ClipboardCheck,
    title: "Take the quiz",
    text: "Short quizzes with instant marking and a worked solution for every question. Retake as often as you like.",
  },
];

export default async function HomePage() {
  const [user, levels, events] = await Promise.all([getCurrentUser(), getLevelsWithCounts(), getUpcomingEvents(3)]);

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-900 text-white">
        <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-400">{site.name}</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Learn finance by level.
              <br />
              Test yourself. Join the club.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-brand-100">
              Structured study materials for every WIUT finance module, quizzes that explain the right answer, and
              events where you meet people who work in finance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <ButtonLink href="/my" variant="accent" size="lg">
                  Continue learning <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </ButtonLink>
              ) : (
                <ButtonLink href="/signup" variant="accent" size="lg">
                  Join the society <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </ButtonLink>
              )}
              <ButtonLink href="/learn" variant="outline-light" size="lg">
                Browse the Learning Hub
              </ButtonLink>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-4 rounded-card border border-brand-700 bg-brand-800/60 p-5 text-center sm:p-6">
            <div>
              <dt className="text-sm text-brand-200">Levels</dt>
              <dd className="mt-1 text-3xl font-bold text-white">{levels.length || 4}</dd>
            </div>
            <div>
              <dt className="text-sm text-brand-200">Subjects</dt>
              <dd className="mt-1 text-3xl font-bold text-white">
                {levels.reduce((sum, l) => sum + l.subjectCount, 0) || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-brand-200">Cost</dt>
              <dd className="mt-1 text-3xl font-bold text-accent-400">Free</dd>
            </div>
          </dl>
        </Container>
      </section>

      {/* Levels */}
      <section className="py-14 sm:py-16">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">Learning Hub by level</h2>
              <p className="mt-2 text-slate-600">Choose your year to see its subjects, topics and quizzes.</p>
            </div>
            <Link href="/learn" className="hidden shrink-0 text-sm font-medium text-brand-700 hover:underline sm:block">
              All levels →
            </Link>
          </div>
          {levels.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {levels.map((level) => (
                <LevelCard key={level.id} level={level} isMine={user?.profile.level_id === level.id} />
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-card border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Levels will appear here once the database is set up.
            </p>
          )}
        </Container>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-white py-14 sm:py-16">
        <Container>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">How it works</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <step.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-accent-600">Step {i + 1}</p>
                  <h3 className="mt-0.5 text-lg font-bold text-brand-900">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Events */}
      <section className="py-14 sm:py-16">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">Upcoming events</h2>
              <p className="mt-2 text-slate-600">Talks, workshops and company visits. Register in one click.</p>
            </div>
            <Link href="/events" className="hidden shrink-0 text-sm font-medium text-brand-700 hover:underline sm:block">
              All events →
            </Link>
          </div>
          {events.length > 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center rounded-card border border-dashed border-slate-300 p-10 text-center">
              <CalendarDays className="h-8 w-8 text-slate-400" aria-hidden="true" />
              <p className="mt-3 font-medium text-slate-700">No upcoming events yet</p>
              <p className="mt-1 text-sm text-slate-500">Follow the club on Telegram to hear about the next one first.</p>
            </div>
          )}
        </Container>
      </section>

      {/* CTA */}
      {!user && (
        <section className="pb-16">
          <Container>
            <div className="rounded-card bg-gradient-to-br from-brand-800 to-brand-950 px-6 py-10 text-center text-white sm:px-12">
              <h2 className="text-2xl font-bold sm:text-3xl">Ready to study smarter?</h2>
              <p className="mx-auto mt-3 max-w-xl text-brand-100">
                Create a free account in under two minutes and get materials for your level, quizzes and event
                invitations.
              </p>
              <ButtonLink href="/signup" variant="accent" size="lg" className="mt-6">
                Create your account
              </ButtonLink>
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
