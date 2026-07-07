import { getStaffMembers } from "@/lib/cms";
import AboutContent from "./AboutContent";

// ISR: leadership edits in the portal go live within ~1 minute.
export const revalidate = 60;

export default async function WhatWeDoPage() {
  const leaders = await getStaffMembers();
  return <AboutContent leaders={leaders} />;
}
