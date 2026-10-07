import type { Metadata } from "next";
import { Camera, Mail, Send, UserRound } from "lucide-react";
import { ButtonLink, Container, PageHeader } from "@/components/ui";
import { board, site } from "@/lib/site";

export const metadata: Metadata = { title: "About the club" };

export default function AboutPage() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="About" title="WIUT Finance Society" description={site.mission} />

      <section className="mt-12" aria-labelledby="what-we-do">
        <h2 id="what-we-do" className="text-2xl font-bold text-brand-900">
          What we do
        </h2>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {[
            { title: "Study materials", text: "Notes, slides and worked examples for every finance module, organised by level and checked by a second member before publishing." },
            { title: "Practice quizzes", text: "Short quizzes with a worked solution for every question, so you learn from mistakes instead of just counting them." },
            { title: "Events", text: "Guest talks from people working in banks and companies, hands-on workshops, and visits to firms in Tashkent." },
          ].map((item) => (
            <div key={item.title} className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
              <h3 className="font-bold text-brand-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="board">
        <h2 id="board" className="text-2xl font-bold text-brand-900">
          The board
        </h2>
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {board.map((member, i) => (
            <li key={i} className="flex flex-col items-center rounded-card border border-slate-200 bg-white p-5 text-center shadow-card">
              {member.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.photo} alt="" className="h-24 w-24 rounded-full object-cover" />
              ) : (
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-50 text-brand-300">
                  <UserRound className="h-10 w-10" aria-hidden="true" />
                </span>
              )}
              <p className="mt-4 font-semibold text-brand-900">{member.name}</p>
              <p className="text-sm text-slate-500">{member.role}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="contacts">
        <h2 id="contacts" className="text-2xl font-bold text-brand-900">
          Contact us
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink href={`mailto:${site.contactEmail}`} variant="secondary">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {site.contactEmail}
          </ButtonLink>
          <ButtonLink href={site.links.telegram} variant="secondary" target="_blank" rel="noreferrer">
            <Send className="h-4 w-4" aria-hidden="true" />
            Telegram
          </ButtonLink>
          <ButtonLink href={site.links.instagram} variant="secondary" target="_blank" rel="noreferrer">
            <Camera className="h-4 w-4" aria-hidden="true" />
            Instagram
          </ButtonLink>
        </div>
      </section>
    </Container>
  );
}
