import { Cormorant_Garamond } from "next/font/google";
import { TrackClient } from "./TrackClient";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-track-display",
});

export default function TrackPage({ params }: { params: { code: string } }) {
  return (
    <div className={display.variable}>
      <TrackClient code={params.code} />
    </div>
  );
}
