import { QuoteClient } from "./QuoteClient";

export default function QuotePage({ params }: { params: { code: string } }) {
  return <QuoteClient code={params.code} />;
}
