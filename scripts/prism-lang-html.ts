import { Prism } from "./prism.ts"

import "./prism-lang-markup.ts"
import "./prism-lang-css.ts"
import "./prism-lang-js.ts"

Prism.languages.html = Prism.languages.extend('markup', {});
