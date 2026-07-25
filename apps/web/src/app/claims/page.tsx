import { redirect } from "next/navigation";

// Claims were merged into the Policies page as a tab.
export default function ClaimsPage() {
  redirect("/policies");
}
