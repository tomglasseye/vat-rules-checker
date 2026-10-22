import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { startPrefetching } from "./lib/prefetch.client";

// Pages start loading when the pointer rests on a link to them (see prefetch.client.ts)
startPrefetching();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
