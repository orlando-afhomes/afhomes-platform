import { redirect } from "next/navigation";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/sales/contracts/${encodeURIComponent(id)}`);
}
