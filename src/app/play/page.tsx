import type { Metadata } from "next";
import { PlayClient } from "@/game/PlayClient";

export const metadata: Metadata = {
  title: "Pip | Sarthak Kamble",
  description: "A five-level pixel platformer. Run, jump, stomp, reach the flag.",
};

export default function PlayPage() {
  return <PlayClient />;
}
