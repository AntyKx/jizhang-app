import { RecordKeypadPreviewFrame } from "@/components/dev/record-keypad-preview";

export default async function KeypadPreviewFrame({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const variant = v === "A" || v === "B" || v === "C" ? v : "current";
  return <RecordKeypadPreviewFrame variant={variant} />;
}
