import { Prism } from "./prism.ts"

import "./prism-lang-markup.ts"

Prism.languages.xml = Prism.languages.extend('markup', {});
