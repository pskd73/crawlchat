class CrawlChatEmbed {
  constructor() {
    this.transitionDuration = 100;
    this.embedDivId = "crawlchat-embed";
    this.iframeId = "crawlchat-iframe";
    this.scriptId = "crawlchat-script";
    this.host = "https://crawlchat.app";
    this.scrapeId = this.getScrapeId();
    this.askAIButtonId = "crawlchat-ask-ai-button";
    this.lastScrollTop = 0;
    this.lastBodyStyle = {};
    this.originalTocMaxWidth = null;
    this.widgetConfig = {};
    this.sidepanelId = "crawlchat-sidepanel";
    this.tocSelector = "main .container .row .col:first-child";
  }

  getCustomTags() {
    const script = document.getElementById(this.scriptId);
    const allTags = script
      .getAttributeNames()
      .filter((name) => name.startsWith("data-tag-"))
      .map((name) => [
        name.replace("data-tag-", ""),
        script.getAttribute(name),
      ]);
    return Object.fromEntries(allTags);
  }

  isMobile() {
    return window.innerWidth < 700;
  }

  getScriptElem() {
    return document.getElementById(this.scriptId);
  }

  isSidePanel() {
    return (
      this.getCustomTags().sidepanel === "true" ||
      this.getScriptElem()?.dataset.sidepanel === "true"
    );
  }

  async mount() {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = `${this.host}/embed.css`;

    await new Promise((resolve, reject) => {
      style.onload = resolve;
      style.onerror = reject;
      document.head.appendChild(style);
    });

    window.addEventListener("message", (e) => this.handleOnMessage(e));

    if (this.getScriptElem()?.dataset.selectionButtons) {
      this.mountContentSelectTooltip();
    }

    if (!this.isMobile() && this.isSidePanel()) {
      this.mountSidePanel();
      if (this.getScriptElem()?.dataset.sidepanelOpen === "true") {
        setTimeout(() => {
          this.showSidePanel();
        }, 500);
      }
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.id = this.iframeId;

    const params = new URLSearchParams({
      embed: "true",
    });
    const customTags = this.getCustomTags();
    if (Object.keys(customTags).length > 0) {
      params.set("tags", btoa(JSON.stringify(customTags)));
    }
    if (this.isMobile()) {
      params.set("width", window.innerWidth.toString() + "px");
      params.set("height", window.innerHeight.toString() + "px");
      params.set("fullscreen", "true");
    }
    if (this.getScriptElem()?.dataset.noPrimaryColor === "true") {
      params.set("noPrimaryColor", "true");
    }
    const secret = this.getScriptElem()?.dataset.secret;
    if (secret) {
      params.set("secret", secret);
    }
    const src = `${this.host}/w/${this.scrapeId}?${params.toString()}`;

    iframe.src = src;
    iframe.allowTransparency = "true";
    iframe.allow = "clipboard-write";
    iframe.className = "crawlchat-embed";

    const div = document.createElement("div");
    div.id = this.embedDivId;

    div.appendChild(iframe);
    document.body.appendChild(div);
  }

  getScrapeId() {
    const script = document.getElementById(this.scriptId);
    return script?.getAttribute("data-id");
  }

  getScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
  }

  show() {
    const div = document.getElementById(this.embedDivId);
    div.classList.add("open");

    const overflowY = this.getScrollbarWidth() > 0 ? "scroll" : "hidden";

    this.lastScrollTop = window.scrollY;
    this.lastBodyStyle = document.body.style;
    document.body.style.position = "fixed";
    document.body.style.overflowY = overflowY;
    document.body.style.width = "100%";
    document.body.style.top = `-${this.lastScrollTop}px`;

    const iframe = document.getElementById(this.iframeId);
    iframe.contentWindow.postMessage("focus", "*");
  }

  async hide() {
    document.body.style = this.lastBodyStyle;
    window.scrollTo(0, this.lastScrollTop);

    const div = document.getElementById(this.embedDivId);
    div?.classList.remove("open");
    setTimeout(() => {
      window.focus();
    }, this.transitionDuration);

    await this.showAskAIButton();
  }

  isWidgetOpen() {
    const div = document.getElementById(this.embedDivId);
    return div.style.width === "100%";
  }

  async handleOnMessage(event) {
    if (event.data === "close") {
      window.crawlchatEmbed.hide();
      window.crawlchatEmbed.hideSidePanel();
      return;
    }
    if (event.origin !== this.host) {
      return;
    }
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      return;
    }
    if (data.type === "embed-ready") {
      this.widgetConfig = data.widgetConfig;
      await this.showAskAIButton();
    }
  }

  hideAskAIButton() {
    const button = document.getElementById(this.askAIButtonId);
    button.classList.add("hidden");
  }

  async showAskAIButton() {
    const script = document.getElementById(this.scriptId);

    if (
      !script ||
      script?.getAttribute("data-hide-ask-ai") === "true" ||
      (this.isSidePanel() && !this.isMobile())
    )
      return;

    const text =
      this.widgetConfig.buttonText ??
      script.getAttribute("data-ask-ai-text") ??
      "💬 Ask AI";
    const backgroundColor =
      this.widgetConfig.primaryColor ||
      script.getAttribute("data-ask-ai-background-color") ||
      "#7b2cbf";
    const color =
      this.widgetConfig.buttonTextColor ||
      script.getAttribute("data-ask-ai-color") ||
      "white";
    const position = script.getAttribute("data-ask-ai-position") ?? "br";
    const marginX = script.getAttribute("data-ask-ai-margin-x") ?? "20px";
    const marginY = script.getAttribute("data-ask-ai-margin-y") ?? "20px";
    const radius = script.getAttribute("data-ask-ai-radius") ?? "20px";
    const fontSize = script.getAttribute("data-ask-ai-font-size");

    let bottom = undefined;
    let right = undefined;
    let left = undefined;
    let top = undefined;

    if (position === "bl") {
      bottom = marginY;
      left = marginX;
    } else if (position === "br") {
      bottom = marginY;
      right = marginX;
    } else if (position === "tl") {
      top = marginY;
      left = marginX;
    } else if (position === "tr") {
      top = marginY;
      right = marginX;
    }

    const div = document.createElement("div");
    div.id = this.askAIButtonId;
    div.style.bottom = bottom;
    div.style.right = right;
    div.style.left = left;
    div.style.top = top;

    div.style.backgroundColor = backgroundColor;
    div.style.color = color;
    div.style.borderRadius = radius;
    div.style.fontSize = fontSize;

    const span = document.createElement("span");
    span.innerText = text;
    div.appendChild(span);

    if (this.widgetConfig.tooltip) {
      div.appendChild(this.makeTooltip(this.widgetConfig.tooltip));
    }

    div.addEventListener("click", function () {
      window.crawlchatEmbed.show();
      div.classList.add("hidden");
    });

    document.body.appendChild(div);
  }

  makeTooltip(text) {
    const div = document.createElement("div");
    div.innerText = text;
    div.className = "tooltip";
    return div;
  }

  showSidePanel() {
    document
      .getElementById("__docusaurus")
      ?.classList.add("crawlchat-sidepanel-open");
    document.getElementById(this.sidepanelId)?.classList.remove("hidden");

    const iframe = document.getElementById(this.iframeId);
    iframe.contentWindow.postMessage("focus", "*");
    if (this.getScriptElem()?.dataset.hideToc === "true") {
      this.hideDocusaurusToc();
    }
  }

  hideSidePanel() {
    document
      .getElementById("__docusaurus")
      ?.classList.remove("crawlchat-sidepanel-open");
    document.getElementById(this.sidepanelId)?.classList.add("hidden");
    if (this.getScriptElem()?.dataset.hideToc === "true") {
      this.showDocusaurusToc();
    }
  }

  mountSidePanel() {
    document
      .getElementById("__docusaurus")
      ?.classList.add("crawlchat-with-sidepanel");

    const sidepanel = document.createElement("div");
    sidepanel.id = this.sidepanelId;
    sidepanel.classList.add("hidden");

    sidepanel.appendChild(this.makeResizeDiv());

    const params = new URLSearchParams({
      embed: "true",
      fullscreen: "true",
      sidepanel: "true",
    });
    if (this.getScriptElem()?.dataset.noPrimaryColor === "true") {
      params.set("noPrimaryColor", "true");
    }
    const secret = this.getScriptElem()?.dataset.secret;
    if (secret) {
      params.set("secret", secret);
    }

    const iframe = document.createElement("iframe");
    iframe.src = `${this.host}/w/${this.scrapeId}?${params.toString()}`;
    iframe.allowTransparency = "true";
    iframe.allow = "clipboard-write";
    iframe.className = "crawlchat-embed";
    iframe.id = this.iframeId;

    sidepanel.appendChild(iframe);

    document.body.appendChild(sidepanel);

    const handleKeyDown = (e) => {
      if (e.metaKey && e.key === "i") {
        window.crawlchatEmbed.toggleSidePanel();
      }
    };
    document.removeEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleKeyDown);
  }

  toggleSidePanel() {
    if (this.isSidePanelOpen()) {
      this.hideSidePanel();
    } else {
      this.showSidePanel();
    }
  }

  makeResizeDiv() {
    const resize = document.createElement("div");
    resize.classList.add("crawlchat-sidepanel-resize");

    const handleMouseMove = (e) => {
      const width = Math.max(Math.min(window.innerWidth - e.clientX, 560), 400);
      document.documentElement.style.setProperty(
        "--crawlchat-sidepanel-width",
        `${width}px`
      );
      e.preventDefault();
      e.stopPropagation();
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.getElementById(this.sidepanelId).style.pointerEvents = "auto";
    };

    const handleMouseDown = (e) => {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.getElementById(this.sidepanelId).style.pointerEvents = "none";
      e.preventDefault();
      e.stopPropagation();
    };

    resize.addEventListener("mousedown", handleMouseDown);

    return resize;
  }

  isSidePanelOpen() {
    const sidepanel = document.getElementById(this.sidepanelId);
    return !sidepanel?.classList.contains("hidden");
  }

  hideDocusaurusToc() {
    const toc = document.querySelector(".theme-doc-toc-desktop");
    if (!toc) return;
    toc.parentElement.style.display = "none";

    const mainCol = document.querySelector(this.tocSelector);
    if (this.originalTocMaxWidth === null) {
      this.originalTocMaxWidth =
        mainCol.style.maxWidth || getComputedStyle(mainCol).maxWidth;
    }
    mainCol.style.setProperty("max-width", "100%", "important");
  }

  showDocusaurusToc() {
    const toc = document.querySelector(".theme-doc-toc-desktop");
    if (!toc) return;
    toc.parentElement.style.display = "block";

    const mainCol = document.querySelector(this.tocSelector);
    if (this.originalTocMaxWidth) {
      mainCol.style.setProperty(
        "max-width",
        this.originalTocMaxWidth,
        "important"
      );
    } else {
      mainCol.style.setProperty("max-width", "75%", "important");
    }
  }

  mountContentSelectTooltip() {
    const buttons = JSON.parse(this.getScriptElem()?.dataset.selectionButtons);

    let tooltip = null;
    let isSelecting = false;
    let hideTimeout = null;

    const createTooltip = () => {
      if (tooltip) return tooltip;

      tooltip = document.createElement("div");
      tooltip.id = "crawlchat-selection-tooltip";
      tooltip.dataset.showedAt = new Date().getTime().toString();

      for (const [key, button] of Object.entries(buttons)) {
        const buttonElement = document.createElement("button");
        buttonElement.className = "tooltip-button";
        buttonElement.textContent = button.name;
        buttonElement.dataset.action = key;
        tooltip.appendChild(buttonElement);
      }

      document.body.appendChild(tooltip);
      return tooltip;
    };

    const showTooltip = (selection) => {
      if (!selection || selection.toString().trim().length === 0) {
        hideTooltip();
        return;
      }

      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const tooltip = createTooltip();

      const tooltipRect = tooltip.getBoundingClientRect();
      const left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      const top = rect.bottom + 8;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let finalLeft = Math.max(
        8,
        Math.min(left, viewportWidth - tooltipRect.width - 8)
      );
      let finalTop = top;

      if (finalTop + tooltipRect.height > viewportHeight - 8) {
        finalTop = rect.top - tooltipRect.height - 8;
      }

      tooltip.style.left = `${finalLeft + window.scrollX}px`;
      tooltip.style.top = `${finalTop + window.scrollY}px`;
      tooltip.style.opacity = "1";
    };

    const hideTooltip = () => {
      if (tooltip) {
        tooltip.style.opacity = "0";
        hideTimeout = setTimeout(() => {
          if (tooltip && tooltip.style.opacity === "0") {
            tooltip.remove();
            tooltip = null;
            hideTimeout = null;
          }
        }, 200);
      }
    };

    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        const commonAncestor = range.commonAncestorContainer;
        const mainElement =
          commonAncestor.nodeType === Node.TEXT_NODE
            ? commonAncestor.parentElement.closest("main")
            : commonAncestor.closest("main");

        const noSelectionElements = document.querySelectorAll(
          ".no-crawlchat-selection"
        );
        let hasExcludedContent = false;

        for (const excludedElement of noSelectionElements) {
          if (range.intersectsNode(excludedElement)) {
            hasExcludedContent = true;
            break;
          }
        }

        if (mainElement && !hasExcludedContent) {
          showTooltip(selection);
          isSelecting = true;
        } else {
          hideTooltip();
          isSelecting = false;
        }
      } else if (isSelecting) {
        hideTooltip();
        isSelecting = false;
      }
    };

    const handleClick = (e) => {
      if (e.target.classList.contains("tooltip-button")) {
        e.preventDefault();
        e.stopPropagation();

        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }

        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
          const text = selection.toString().trim();
          const action = e.target.dataset.action;
          const queryPrefix = buttons[action].queryPrefix;

          this.open({
            query: `${queryPrefix} ${text}`,
          });
          hideTooltip();
          isSelecting = false;
        }
      } else {
        const tooltip = document.getElementById("crawlchat-selection-tooltip");
        if (!tooltip) return;
        const showedAt = parseInt(tooltip.dataset.showedAt);
        if (new Date().getTime() - showedAt > 100) {
          hideTooltip();
          isSelecting = false;
        }
      }
    };

    const handleScroll = () => {
      if (isSelecting) {
        hideTooltip();
        isSelecting = false;
      }
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);
    document.addEventListener("click", handleClick);
    document.addEventListener("scroll", handleScroll, true);
  }

  open(options = {}) {
    if (this.isSidePanel()) {
      this.showSidePanel();
    } else {
      this.show();
    }

    if (options.query) {
      const iframe = document.getElementById(this.iframeId);
      iframe.contentWindow.postMessage(
        JSON.stringify({
          type: "query",
          query: options.query,
        }),
        "*"
      );
    }
  }
}

async function setupCrawlChat() {
  window.crawlchatEmbed = new CrawlChatEmbed();
  await window.crawlchatEmbed.mount();
}

if (document.readyState === "complete" || window.frameElement) {
  setupCrawlChat();
} else {
  window.addEventListener("load", setupCrawlChat);
}
