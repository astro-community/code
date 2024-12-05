# Astro Code <img src="https://jonneal.dev/astro-logo.svg" alt="" width="90" height="90" align="right">

**Astro Code** enables code syntax highlighting and rendering in **[Astro](https://astro.build)** projects.

[![NPM Version][npm-img]][npm-url]
[![NPM Downloads][dl-img]][dl-url]

- **Syntax Highlighting**: Beautifully highlight code blocks in various programming languages.
  - Syntax highlighting for popular languages like JavaScript, TypeScript, HTML, CSS, and more.
- **Lightweight**: Minimal dependency footprint for faster builds.
  - A fully optimized ESM version of Prism for modern web apps.
- **Customizable**: Easily adapt the component to your project's needs.
  - Customize styles and themes using your own CSS.

## Installation

Install the component via npm:

```shell
npm install @astropub/code
```

Import and use the component in your Astro files:

```astro
---
import Code from "@astropub/code"
---
<Code lang="js" code="const str = 'string'">
```

## Usage

To display a syntax-highlighted code block:

```astro
---
import Code from "@astropub/code"
---
<Code lang="html" code="<h1>Hello, Astro!</h1>"></Code>
```

#### Multi-Line Code

Pass an array of strings to the code prop:

```astro
---
import Code from "@astropub/code"
---
<Code lang="css" code={[
  "body {",
  "  margin: 0;",
  "}"
]}></Code>
```

## Supported Languages

Out of the box, Astro Code supports these languages via Prism.js:

| Language   |                Type Value |
|:---------- | -------------------------:|
| Scripting  |     `js` `jsx` `ts` `tsx` |
| Content    | `html` `json` `svg` `xml` |
| Styling    |                     `css` |
| Shell      |                      `sh` |

## API Reference

| Atttribute | Type                | Description               |
| ---------- | ------------------- | ------------------------- |
| `code`     | `string` `string[]` | Code to render.           |
| `lang`     | `string`            | Language of highlighting. |

## License

Licensed under the [MIT-0 License](https://opensource.org/license/mit-0).

<br />

Enjoy!

[npm-img]: https://img.shields.io/npm/v/@astropub/code?color=%23444&label=&labelColor=%23CB0000&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjE1MCAxNTAgNDAwIDQwMCIgZmlsbD0iI0ZGRiI+PHBhdGggZD0iTTE1MCA1NTBoMjAwVjI1MGgxMDB2MzAwaDEwMFYxNTBIMTUweiIvPjwvc3ZnPg==&style=for-the-badge
[npm-url]: https://www.npmjs.com/package/@astropub/code
[dl-url]: https://www.npmjs.com/package/@astropub/code
[dl-img]: https://img.shields.io/badge/dynamic/json?url=https://api.npmjs.org/downloads/point/last-week/@astropub/code&query=downloads&label=⇓+week&color=%23444&labelColor=%23EEd100&style=for-the-badge
