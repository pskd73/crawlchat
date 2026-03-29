---
sidebar_position: 1
---

# Embed on web

The most common way to put the bot in use is to embed it on your documentation website. This is a very straight forward adding `<script/>` tag on your `html` page. Customise the web widget from [Customise](https://crawlchat.app/integrate/customise) page

:::note
Framework specific embed instructions are coming soon!
:::

You can go to Connect > [Embed](https://crawlchat.app/connect/embed) page to find more information.

## HTML

Copy the following code and past in the `<head>` section of your page. Replace value of `data-id` to your collection id. You can find it on [Settings](https://crawlchat.app/settings) page.

```html
<script
  src="https://crawlchat.app/embed.js"
  id="crawlchat-script"
  data-id="YOUR_COLLECTION_ID" <!-- Ex: 67d29ce750df5f4d86e1db33 --!>
></script>
```

## Docusaurus

If you are running a Docusaurus website (just like this one), add the following code to your `docusaurus.config.ts` file. Replace value of `data-id` to your collection id. You can find it on [Settings](https://crawlchat.app/settings) page.

```json
headTags: [
  {
      "tagName": "script",
      "attributes": {
        "src": "https://crawlchat.app/embed.js",
        "id": "crawlchat-script",
        "data-id": "YOUR_COLLECTION_ID"
        "data-sidepanel": true // optional
      },
    },
],
```

You can enable the chatbot widget into a [Side Panel](/connect/side-panel)

## Mintlify

You can embed the chatbot on Mintlify website by creating `crawlchat.js` file in root folder with following content. Replace value of `data-id` to your collection id. You can find it on [Settings](https://crawlchat.app/settings) page.

```js
function inject() {
  const script = document.createElement("script");
  script.src = "https://crawlchat.app/embed.js";
  script.id = "crawlchat-script";
  script.dataset.id = "YOUR_COLLECTION_ID";
  script.dataset.sidepanel = true; // optional

  document.head.appendChild(script);
}

inject();
```

You can enable the chatbot widget into a [Side Panel](/connect/side-panel)

## Options

All configuration options are set via `data-*` attributes on the script tag. Here's a complete list of available parameters:

| Parameter             | Type    | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | ------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-id` (required)  | string  | -       | Your collection ID. You can find it on the [Settings](https://crawlchat.app/connect/embed) page. Example: `67d29ce750df5f4d86e1db33`                                                                                                                                                                                                                                                                                                                                                    |
| `data-sidepanel`      | boolean | `false` | Set to `"true"` to enable sidepanel mode (only works on desktop, width >= 700px). The chat will appear as a resizable side panel instead of a modal                                                                                                                                                                                                                                                                                                                                     |
| `data-small`          | boolean | `false` | Loads the widget with smaller font size and icons                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `data-theme`          | string  | -       | Theme setting passed to the embedded widget.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `data-noPrimaryColor` | boolean | `false` | Set to `"true"` to disable the primary color theme in the embedded widget                                                                                                                                                                                                                                                                                                                                                                                                               |
| `data-secret`         | string  | -       | Secret value used to replace `{{secret}}` placeholders in API action headers. When configuring API actions, you can use `{{secret}}` as a placeholder in header values (e.g., `Authorization: Bearer {{secret}}`). The placeholder will be replaced with the value provided via `data-secret` when the action is executed. This allows you to keep secrets out of your action configuration and provide them dynamically per embed instance. Example: `data-secret="your-api-key-here"` |
| `data-tag-*`          | string  | -       | Dynamic custom tags. Any attribute starting with `data-tag-` will be passed to the embedded widget. The tag name (after `data-tag-`) and value are sent as key-value pairs. Example: `data-tag-custom="value"` becomes `{"custom": "value"}`                                                                                                                                                                                                                                            |

### Notes

- Boolean parameters should be set to the string `"true"` (not the boolean `true`)
- The Ask AI button is automatically hidden when using sidepanel mode on desktop
- Sidepanel mode only activates on screens wider than 700px
- Custom tags are base64-encoded and passed as URL parameters to the embedded widget
