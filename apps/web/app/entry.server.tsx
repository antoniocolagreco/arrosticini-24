import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { renderToPipeableStream } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import {
  type EntryContext,
  type HandleErrorFunction,
  type RouterContextProvider,
  ServerRouter,
} from "react-router";
import { logger } from "../server/logger.js";
import { getInstance } from "./middleware/i18next.js";

export const handleError: HandleErrorFunction = (error, { request }) => {
  if (!request.signal.aborted)
    logger.error(
      { err: error, requestId: request.headers.get("x-request-id") },
      "rendering failed",
    );
};

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: RouterContextProvider,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    let status: number = responseStatusCode;
    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={getInstance(loadContext)}>
        <ServerRouter context={routerContext} url={request.url} />
      </I18nextProvider>,
      {
        onAllReady() {
          clearTimeout(timeout);
          const body: PassThrough = new PassThrough();
          responseHeaders.set("Content-Type", "text/html; charset=utf-8");
          resolve(
            new Response(createReadableStreamFromReadable(body), {
              status,
              headers: responseHeaders,
            }),
          );
          pipe(body);
        },
        onShellError(error: unknown) {
          clearTimeout(timeout);
          reject(error);
        },
        onError(error: unknown) {
          status = 500;
          handleError(error, { request, context: loadContext, params: {} });
        },
      },
    );
    const timeout: ReturnType<typeof setTimeout> = setTimeout(abort, 10000);
  });
}
