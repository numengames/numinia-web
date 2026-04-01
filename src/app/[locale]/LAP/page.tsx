import { redirect } from 'next/navigation';
export default async function LAPIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/LAP/character`);
}
