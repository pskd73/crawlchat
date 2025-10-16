import React from "react";
import { createRoot } from "react-dom/client";
import Panel from "./panel";
import { Config } from "./config";

function injectShadowStyles(shadowRoot: ShadowRoot): void {
  chrome.runtime.sendMessage({ type: "GET_INJECT_CSS" }, (response) => {
    if (response && response.css) {
      const style = document.createElement("style");
      style.textContent = response.css;
      shadowRoot.appendChild(style);
    }
  });
}

function injectStickyButtonCSS(): void {
  chrome.runtime.sendMessage({ type: "GET_STICKY_BUTTON_CSS" }, (response) => {
    if (response && response.css) {
      const style = document.createElement("style");
      style.id = "crawlchat-sticky-button-styles";
      style.textContent = response.css;
      document.head.appendChild(style);
    }
  });
}

async function getConfig(): Promise<Config | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["crawlchatConfig"], (result) => {
      resolve(result ? JSON.parse(result.crawlchatConfig) : null);
    });
  });
}

let globalButton: HTMLElement | null = null;
let latestFocusedElement:
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLElement
  | null = null;
let blurTimeoutId: number | null = null;

function createGlobalButton(): void {
  if (globalButton) return;

  injectStickyButtonCSS();

  globalButton = document.createElement("button");
  globalButton.className = "crawlchat-sticky-btn";
  globalButton.innerHTML = `
    <img src="https://crawlchat.app/logo.png" alt="CrawlChat" />
  `;

  globalButton.addEventListener("click", async (e) => {
    console.log("Global button clicked!");
    e.preventDefault();
    e.stopPropagation();

    const targetElement =
      latestFocusedElement ||
      (document.activeElement as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLElement);

    const config = await getConfig();

    if (config && config.apiKey && config.scrapeId) {
      openPanel(config, targetElement);
    }
  });

  document.body.appendChild(globalButton);
}

function isPanelOpen(): boolean {
  return document.getElementById("crawlchat-panel") !== null;
}

function listenInput(
  inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement
): void {
  if (inputElement.dataset.crawlchatListener) {
    return;
  }

  inputElement.dataset.crawlchatListener = "true";

  inputElement.addEventListener("focus", () => {
    if (isPanelOpen()) return;
    latestFocusedElement = inputElement;
    if (blurTimeoutId !== null) {
      clearTimeout(blurTimeoutId);
      blurTimeoutId = null;
    }
  });

  inputElement.addEventListener("blur", () => {
    blurTimeoutId = setTimeout(() => {
      if (isPanelOpen()) return;
      latestFocusedElement = null;
      blurTimeoutId = null;
    }, 500);
  });
}

function watchForInputs(): void {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;

          if (
            element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            (element as HTMLElement).contentEditable === "true"
          ) {
            listenInput(
              element as HTMLInputElement | HTMLTextAreaElement | HTMLElement
            );
          }

          const inputs = element.querySelectorAll(
            'input, textarea, [contenteditable="true"]'
          );
          inputs.forEach((input) => {
            listenInput(
              input as HTMLInputElement | HTMLTextAreaElement | HTMLElement
            );
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function addButtonsToExistingInputs(): void {
  const inputs = document.querySelectorAll(
    'input, textarea, [contenteditable="true"]'
  );

  inputs.forEach((input) => {
    listenInput(input as HTMLInputElement | HTMLTextAreaElement | HTMLElement);
  });
}

async function openPanel(
  config: Config,
  inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement,
  options?: {
    submit?: boolean;
    autoUse?: boolean;
  }
) {
  const existingPanel = document.getElementById("crawlchat-panel");
  if (existingPanel) {
    existingPanel.remove();
  }

  const shadowHost = document.createElement("div");
  shadowHost.id = "crawlchat-panel";
  shadowHost.style.position = "fixed";
  shadowHost.style.left = "20px";
  shadowHost.style.bottom = "0";
  shadowHost.style.width = "384px";
  shadowHost.style.zIndex = "2147483647";

  const shadowRoot = shadowHost.attachShadow({ mode: "open" });

  const panelContainer = document.createElement("div");
  panelContainer.style.height = "100%";
  shadowRoot.appendChild(panelContainer);

  injectShadowStyles(shadowRoot);

  document.body.appendChild(shadowHost);

  const currentValue =
    (inputElement as HTMLInputElement | HTMLTextAreaElement).value ||
    (inputElement as HTMLElement).textContent ||
    (inputElement as HTMLElement).innerText ||
    "";

  const root = createRoot(panelContainer);

  const handleClose = () => {
    closePanel(shadowHost);
  };

  const handleUse = (content: string) => {
    if (
      latestFocusedElement instanceof HTMLInputElement ||
      latestFocusedElement instanceof HTMLTextAreaElement
    ) {
      latestFocusedElement.value = content;
    } else if (
      latestFocusedElement instanceof HTMLElement &&
      latestFocusedElement.contentEditable === "true"
    ) {
      (latestFocusedElement as HTMLElement).innerHTML = content.replace(
        /\n/g,
        "<br>"
      );
    }
    closePanel(shadowHost);
    setTimeout(() => {
      if (latestFocusedElement) {
        latestFocusedElement.focus();
      }
    }, 100);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    closePanel(shadowHost);
  };

  const handleFocusElement = () => {
    if (latestFocusedElement) {
      latestFocusedElement.scrollIntoView({ behavior: "smooth" });
      latestFocusedElement.focus();
    }
  };

  root.render(React.createElement(Panel, {
    config,
    currentValue,
    onClose: handleClose,
    onUse: latestFocusedElement ? handleUse : undefined,
    onCopy: handleCopy,
    onFocus: handleFocusElement,
    submit: options?.submit,
    autoUse: options?.autoUse,
  }));
}

function closePanel(shadowHost: HTMLElement): void {
  if (shadowHost.parentNode) {
    shadowHost.parentNode.removeChild(shadowHost);
  }

  if (latestFocusedElement) {
    latestFocusedElement.focus();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initializeExtension();
  });
} else {
  initializeExtension();
}

function initializeExtension(): void {
  createGlobalButton();

  addButtonsToExistingInputs();
  watchForInputs();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PAGE_INFO") {
    sendResponse({
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
    });
  }

  if (message.type === "OPEN_MODAL_FROM_SHORTCUT") {
    handleShortcutOpenPanel();
  }

  if (message.type === "OPEN_MODAL_AUTO_USE_FROM_SHORTCUT") {
    handleShortcutOpenPanelAutoUse();
  }
});

async function handleShortcutOpenPanel() {
  const config = await getConfig();

  if (config && config.apiKey && config.scrapeId) {
    const targetElement =
      latestFocusedElement ||
      (document.activeElement as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLElement);

    openPanel(config, targetElement, { submit: true });
  }
}

async function handleShortcutOpenPanelAutoUse() {
  const config = await getConfig();

  if (config && config.apiKey && config.scrapeId) {
    const targetElement =
      latestFocusedElement ||
      (document.activeElement as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLElement);

    openPanel(config, targetElement, { submit: true, autoUse: true });
  }
}
