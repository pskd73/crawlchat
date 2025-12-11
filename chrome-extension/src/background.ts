// Background script for Chrome extension
console.log("Background script loaded");

const API_HOST = "https://wings.crawlchat.app";

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details);
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-modal") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "OPEN_MODAL_FROM_SHORTCUT",
        });
      }
    });
  }

  if (command === "open-modal-auto-use") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "OPEN_MODAL_AUTO_USE_FROM_SHORTCUT",
        });
      }
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message);

  if (message.type === "GREETING") {
    sendResponse({ response: "Hello from background script!" });
  }

  if (message.type === "GET_INJECT_CSS") {
    // Read the inject CSS file (now includes Tailwind and modal styles)
    fetch(chrome.runtime.getURL("inject.css"))
      .then((response) => response.text())
      .then((css) => {
        sendResponse({ css });
      })
      .catch((error) => {
        console.error("Error loading inject CSS:", error);
        sendResponse({ css: null });
      });
    return true; // Keep the message channel open for async response
  }

  if (message.type === "GET_STICKY_BUTTON_CSS") {
    // Read the sticky button CSS file
    fetch(chrome.runtime.getURL("sticky-button.css"))
      .then((response) => response.text())
      .then((css) => {
        sendResponse({ css });
      })
      .catch((error) => {
        console.error("Error loading sticky button CSS:", error);
        sendResponse({ css: null });
      });
    return true; // Keep the message channel open for async response
  }

  if (message.type === "API_COMPOSE") {
    const { config, prompt, messages, formatText, slate, content, title } =
      message;

    fetch(`${API_HOST}/compose/${config.scrapeId}`, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        messages,
        formatText,
        slate,
        content,
        title,
        llmModel: "haiku_4_5",
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message) {
          sendResponse({ success: false, error: data.message });
        } else {
          sendResponse({ success: true, data });
        }
      })
      .catch((error) => {
        console.error("API compose error:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === "CONFIG_UPDATED") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "CONFIG_UPDATED",
        });
      }
    });
  }

  return true;
});
