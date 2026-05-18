const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";
const ONLOAD_CALLBACK = "_crawlchatTurnstileOnLoad";

let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: string;
          callback?: (token: string) => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
    _crawlchatTurnstileOnLoad?: () => void;
  }
}

function waitForTurnstileApi() {
  if (window.turnstile?.render) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Turnstile failed to initialize")),
      15000
    );
    const tick = () => {
      if (window.turnstile?.render) {
        clearTimeout(timeout);
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function injectTurnstileScript() {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      fn();
    };

    window._crawlchatTurnstileOnLoad = () => {
      delete window._crawlchatTurnstileOnLoad;
      waitForTurnstileApi()
        .then(() => settle(resolve))
        .catch((error) => settle(() => reject(error)));
    };

    const script = document.createElement("script");
    script.src = `${TURNSTILE_SCRIPT_SRC}?onload=${ONLOAD_CALLBACK}`;
    script.async = true;
    script.defer = true;
    script.addEventListener(
      "load",
      () => {
        waitForTurnstileApi()
          .then(() => settle(resolve))
          .catch((error) => settle(() => reject(error)));
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => settle(() => reject(new Error("Turnstile script failed to load"))),
      { once: true }
    );
    document.head.appendChild(script);
  });
}

export function loadTurnstile() {
  if (window.turnstile?.render) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src^="${TURNSTILE_SCRIPT_SRC}"]`
  );

  loadPromise = (
    existing ? waitForTurnstileApi() : injectTurnstileScript()
  ).catch((error) => {
    loadPromise = null;
    throw error;
  });

  return loadPromise;
}

export function mountTurnstile(
  container: HTMLElement,
  siteKey: string,
  onToken: (token: string) => void
) {
  return loadTurnstile().then(() => {
    const widgetId = window.turnstile!.render(container, {
      sitekey: siteKey,
      theme: "light",
      callback: onToken,
    });
    return () => {
      window.turnstile?.remove(widgetId);
    };
  });
}
