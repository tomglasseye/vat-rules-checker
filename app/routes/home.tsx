import { redirect } from "react-router";
import { getAuth } from "~/lib/auth.server";
import type { Route } from "./+types/home";

export async function loader({ request }: Route.LoaderArgs) {
  const auth = await getAuth(request);
  if (!auth) throw redirect("/login");
  throw redirect(auth.isAdmin && !auth.activeClient ? "/admin" : "/check");
}
