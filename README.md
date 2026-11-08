# OpenBot plugins

An OpenBot plugin market. In OpenBot, add it with `ManagePlugin {action: "add_market", url: "<this repository's https address>"}`, then `ListPlugins {market: true}` lists what is here. Every install asks for approval.

| Plugin | What it does |
|---|---|
| wa-self-reply | Replies in WhatsApp Web's chat with yourself (给自己发消息) when a new message arrives there. Needs WhatsApp Web signed in, in OpenBot's browser profile "wa". |

Layout: `marketplace.json` lists each plugin's folder; each folder is a plugin (`plugin.json` + code).
