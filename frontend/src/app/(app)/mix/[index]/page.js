/**
 * Daily Mix page (/mix/[index], roadmap Day 9).
 */
import { notFound } from "next/navigation";
import MixView from "@/components/features/home/MixView";

export const metadata = { title: "Daily Mix" };

export default async function MixPage({ params }) {
  const { index } = await params;
  const mixIndex = Number(index);
  if (![1, 2, 3].includes(mixIndex)) notFound();
  return <MixView index={mixIndex} />;
}
