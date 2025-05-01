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

    const script = document.getElementById(this.scriptId);
    this.askAIEnabled = script.getAttribute("data-ask-ai") === "true";
  }

  mount() {
    const iframe = document.createElement("iframe");
    iframe.id = this.iframeId;
    iframe.src = `${this.host}/w/${this.scrapeId}?embed=true`;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.backgroundColor = "transparent";
    iframe.style.background = "transparent";
    iframe.allowTransparency = "true";
    iframe.style.opacity = "1";
    iframe.allow = "clipboard-write";

    const div = document.createElement("div");
    div.id = this.embedDivId;
    div.style.position = "fixed";
    div.style.top = "0px";
    div.style.left = "0px";
    div.style.width = "0px";
    div.style.height = "0px";
    div.style.border = "none";
    div.style.zIndex = "1000";
    div.style.transition = `opacity ${this.transitionDuration}ms ease`;
    div.style.opacity = "0";

    div.appendChild(iframe);
    document.body.appendChild(div);
    window.addEventListener("message", this.handleOnMessage);

    if (this.askAIEnabled) {
      this.showAskAIButton();
    }
  }

  getScrapeId() {
    const script = document.getElementById(this.scriptId);
    return script?.getAttribute("data-id");
  }

  show() {
    const div = document.getElementById(this.embedDivId);
    div.style.width = "100%";
    div.style.height = "100%";
    setTimeout(() => {
      div.style.opacity = "1";
    }, 0);
    this.lastScrollTop = window.scrollY;
    this.lastBodyStyle = document.body.style;
    document.body.style.position = "fixed";
    document.body.style.overflowY = "scroll";
    document.body.style.width = "100%";
    document.body.style.top = `-${this.lastScrollTop}px`;

    const iframe = document.getElementById(this.iframeId);
    iframe.contentWindow.postMessage("focus", "*");
  }

  hide() {
    document.body.style = this.lastBodyStyle;
    window.scrollTo(0, this.lastScrollTop);

    const div = document.getElementById(this.embedDivId);
    div.style.opacity = "0";
    setTimeout(() => {
      div.style.width = "0px";
      div.style.height = "0px";
      window.focus();
    }, this.transitionDuration);

    if (this.askAIEnabled) {
      this.showAskAIButton();
    }
  }

  isWidgetOpen() {
    const div = document.getElementById(this.embedDivId);
    return div.style.width === "100%";
  }

  handleOnMessage(event) {
    if (event.data === "close") {
      window.crawlchatEmbed.hide();
    }
  }

  hideAskAIButton() {
    const button = document.getElementById(this.askAIButtonId);
    button.style.opacity = "0";
  }

  showAskAIButton() {
    const script = document.getElementById(this.scriptId);

    if (!script) {
      return;
    }

    const text = script.getAttribute("data-ask-ai-text") ?? "💬 Ask AI";
    const backgroundColor =
      script.getAttribute("data-ask-ai-background-color") ?? "#7b2cbf";
    const color = script.getAttribute("data-ask-ai-color") ?? "white";
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
    div.style.position = "fixed";
    div.style.bottom = bottom;
    div.style.right = right;
    div.style.left = left;
    div.style.top = top;
    div.style.padding = "8px 20px";

    div.style.backgroundColor = backgroundColor;
    div.style.color = color;
    div.style.borderRadius = radius;
    div.style.cursor = "pointer";
    // div.style.fontWeight = "bold";
    div.style.transition = "scale 0.1s ease, opacity 0.3s ease";
    div.style.fontSize = fontSize;

    div.style.scale = "1";
    div.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";

    div.addEventListener("mouseover", function () {
      div.style.scale = "1.05";
    });

    div.addEventListener("mouseout", function () {
      div.style.scale = "1";
    });

    div.innerText = text;

    div.addEventListener("click", function () {
      window.crawlchatEmbed.show();
      div.style.opacity = "0";
    });

    document.body.appendChild(div);
  }
}

function setupCrawlChat() {
  window.crawlchatEmbed = new CrawlChatEmbed();
  window.crawlchatEmbed.mount();
}

if (document.readyState === "complete" || window.frameElement) {
  setupCrawlChat();
} else {
  window.addEventListener("load", setupCrawlChat);
}
