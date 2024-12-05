import { Prism } from "./prism.js"

import "./prism-lang-markup.js"
import "./prism-lang-css.js"
import "./prism-lang-js.js"

Prism.languages.html = Prism.languages.extend('markup', {});
