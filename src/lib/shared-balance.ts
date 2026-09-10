import type { SplitParticipant } from "@/db/schema";

/**
 * Net balance across a set of unsettled split participants, from "my" point
 * of view. Positive = others owe me net; negative = I owe others net.
 */
export function computeNetBalance(participants: Pick<SplitParticipant, "iOwe" | "amount">[]): number {
  let net = 0;
  for (const p of participants) {
    net += p.iOwe ? -Number(p.amount) : Number(p.amount);
  }
  return net;
}
