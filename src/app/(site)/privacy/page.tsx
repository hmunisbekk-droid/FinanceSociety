import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <PageHeader eyebrow="Privacy notice" title="How we handle your data" description="Last updated 7 October 2026" />

      <div className="prose-custom mt-8 space-y-6 text-slate-700">
        <section>
          <h2 className="text-lg font-bold text-brand-900">What we collect</h2>
          <p className="mt-2">
            When you create an account we store your name, email address, programme and current level. As you use the
            site we also record which topics you open and complete, your quiz attempts and scores, and the events you
            register for. We do not collect anything else.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-brand-900">Why we collect it</h2>
          <p className="mt-2">
            To log you in, show you the materials for your level, track your own progress, manage event places, and
            understand which topics students find useful. Aggregate statistics (for example the most viewed topics)
            are seen by the club board; they never identify individual students.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-brand-900">Where it is stored</h2>
          <p className="mt-2">
            Your data is stored in a Supabase database with daily backups and is only accessible to the site and to
            the club&apos;s administrators. Passwords are stored as one-way hashes and cannot be read by anyone.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-brand-900">Who can see it</h2>
          <p className="mt-2">
            Only you can see your progress and scores. Club administrators can see names, emails and event
            registrations so they can run the club. We never sell or share your data with third parties.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-brand-900">Your choices</h2>
          <p className="mt-2">
            You can edit your details at any time on your account page. To delete your account and all data linked
            to it, email us at{" "}
            <a href={`mailto:${site.contactEmail}`} className="text-brand-700 underline">
              {site.contactEmail}
            </a>{" "}
            and we will remove it within 14 days.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-brand-900">Who we are</h2>
          <p className="mt-2">
            {site.name} is a student society at {site.university}. This website is run by the society&apos;s board and
            is not an official service of the university.
          </p>
        </section>
      </div>
    </Container>
  );
}
