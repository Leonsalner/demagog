import HomePageClient, { type HomeTab } from "@/components/home/HomePageClient";

interface HomePageProps {
  searchParams: Promise<{
    mode?: string | string[];
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const activeTab: HomeTab = rawMode === "detect" ? "detect" : "search";

  return <HomePageClient activeTab={activeTab} />;
}
