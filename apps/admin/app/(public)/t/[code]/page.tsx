import { TrackClient } from "./TrackClient";

export default function TrackPage({ params }: { params: { code: string } }) {
  return <TrackClient code={params.code} />;
}
