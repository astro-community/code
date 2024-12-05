import { Prism } from "./prism.ts"

import "./prism-lang-xml.ts"

Prism.languages.svg = Prism.languages.extend('xml', {});
