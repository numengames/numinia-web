import { redirect } from 'next/navigation';

export default async function AdminRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/LAP/assets`);
}
