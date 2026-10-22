import { Link, Outlet, useLocation, useNavigation, useRouteLoaderData } from "react-router";
import { CLIENT_TABS, ClientTabSkeleton, useAfter } from "~/components/Skeletons";
import { Breadcrumbs, cx } from "~/components/ui";
import { authContext, clientFromSlug } from "~/lib/auth.server";
import { getLiveVersion } from "~/models/rules.server";
import type { Route } from "./+types/client-layout";

export async function loader({ params, context }: Route.LoaderArgs) {
  const org = clientFromSlug(context.get(authContext), params.slug);
  return { client: { id: org.id, name: org.name, slug: org.slug }, liveVersion: await getLiveVersion(org.id) };
}

export function useClient() {
  return useRouteLoaderData<typeof loader>("routes/admin/client-layout")!;
}

export default function ClientLayout({ loaderData }: Route.ComponentProps) {
  const { client, liveVersion } = loaderData;
  const base = `/admin/clients/${client.slug}`;
  const location = useLocation();
  const navigation = useNavigation();
  // Moving to another of this client's tabs: highlight it and show its outline straight away
  const going = navigation.state === "loading" && !navigation.formMethod && navigation.location.pathname.startsWith(base) ? navigation.location : null;
  const current = (going ?? location).pathname.replace(/\/+$/, "");
  const switching = useAfter(!!going && going.pathname.replace(/\/+$/, "") !== location.pathname.replace(/\/+$/, ""), 120);
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
        {CLIENT_TABS.map((t) => {
          const active = current === base + t.path;
          return (
            <Link
              key={t.path}
              to={base + t.path}
             
              aria-current={active ? "page" : undefined}
              className={cx(
                "-mb-px inline-flex items-center border-b-2 px-4 py-3 text-[14px] font-medium whitespace-nowrap",
                active ? "border-primary text-accent" : "border-transparent text-nav hover:text-accent",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {switching && going ? <ClientTabSkeleton tab={going.pathname.slice(base.length).replace(/\/+$/, "")} /> : null}
      <div hidden={switching}>
        <Outlet />
      </div>
    </>
  );
}
