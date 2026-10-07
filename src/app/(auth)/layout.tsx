import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 sm:py-16">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-card border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        {children}
      </div>
      <p className="mt-8 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-800">
          ← Back to the home page
        </Link>
      </p>
    </div>
  );
}
