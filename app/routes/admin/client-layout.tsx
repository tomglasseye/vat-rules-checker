import { NavLink, Outlet, useRouteLoaderData } from "react-router";
import { Breadcrumbs, cx } from "~/components/ui";
import { getClientBySlug } from "~/models/clients.server";
import { getPublished } from "~/models/rules.server";
import type { Route } from "./+types/client-layout";

export async function loader({ params }: Route.LoaderArgs) {
  const org = await getClientBySlug(params.slug);
  if (!org) throw new Response("Client not found", { status: 404 });
  const published = await getPublished(org.id);
  return { client: { id: org.id, name: org.name, slug: org.slug }, liveVersion: published?.version ?? null };
}

export function useClient() {
  return useRouteLoaderData<typeof loader>("routes/admin/client-layout")!;
}

const tab = ({ isActive }: { isActive: boolean }) =>
  cx("-mb-px inline-flex items-center border-b-2 px-4 py-3 text-[14px] font-medium whitespace-nowrap", isActive ? "border-primary text-accent" : "border-transparent text-nav hover:text-accent");

export default function ClientLayout({ loaderData }: Route.ComponentProps) {
  const { client, liveVersion } = loaderData;
  const base = `/admin/clients/${client.slug}`;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-[18px] font-medium leading-tight">{client.name}</h1>
          <span className="text-[13.5px] text-muted">{liveVersion ? `Live rules: version ${liveVersion}` : "No rules published yet"}</span>
        </div>
        <Breadcrumbs items={[{ label: "Clients", to: "/admin" }, { label: client.name }]} />
      </div>
      <nav aria-label={`${client.name} admin`} className="mb-5 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        <NavLink to={base} end className={tab}>Draft rules</NavLink>
        <NavLink to={`${base}/try`} className={tab}>Try the draft</NavLink>
        <NavLink to={`${base}/versions`} className={tab}>Published versions</NavLink>
        <NavLink to={`${base}/users`} className={tab}>Staff accounts</NavLink>
      </nav>
      <Outlet />
    </>
  );
}
