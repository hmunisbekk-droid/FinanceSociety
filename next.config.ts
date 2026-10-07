import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Posters and material previews are served from Supabase Storage.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
