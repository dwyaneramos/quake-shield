import { redirect } from "next/navigation";

/** Markets now live inline on the dashboard. */
export default function MarketsPage() {
  redirect("/dashboard");
}
