// Server-side entry for the build-time pre-render (scripts/prerender.mjs):
// the Overview drawn to HTML from the data the deploy just fetched, at a fixed
// clock (`renderAt`) that the client reuses so its hydrating render matches.
import { renderToString } from "react-dom/server";
import App from "./App.jsx";

export const render = (raw, renderAt) => renderToString(<App initialRaw={raw} renderAt={renderAt} />);
