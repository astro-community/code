import { Prism, type TokenStream } from "./prism.ts"

import "./prism-lang-css.ts"
import "./prism-lang-css-extras.ts"
import "./prism-lang-html.ts"
import "./prism-lang-js.ts"
import "./prism-lang-js-extras.ts"
import "./prism-lang-json.ts"
import "./prism-lang-jsx.ts"
import "./prism-lang-sh.ts"
import "./prism-lang-svg.ts"
import "./prism-lang-tsx.ts"
import "./prism-lang-xml.ts"

/** Highlights the given plain text string using the given language. */
export const highlightText = (
	/** A string with the code to be highlighted. */
	text: string,
	/** The name of the language definition passed to `grammar`. */
	language: string
) => {
	const grammar = Prism.languages[language]

	if (grammar) {
		return Prism.highlight(text, grammar, language)
	}

	return text
}

/** Highlights the given `Text` node using the given language. */
export const highlightTextNode = (
	/** A Text Node with the code to be highlighted. */
	text: Text,
	/** The name of the language definition passed to `grammar`. */
	lang: string
) => {
	const code = text.data
	const grammar = Prism.languages[lang]

	if (grammar) {
		const tokens = Prism.tokenize(code, grammar)

		_highlightTextNode(text, tokens, "source", 0, globalThis.CSS?.highlights)
	}
}

const _highlightTextNode = (node: Text, tokens: TokenStream, type: string, index = 0, highlights = new Map) => {
	for (const token of tokens) {
		if (typeof token === "string") {
			const range = new StaticRange({
				startContainer: node,
				startOffset: index,
				endContainer: node,
				endOffset: index + token.length,
			})

			if (highlights.has(type)) {
				highlights.get(type)!.add(range)
			} else {
				highlights.set(type, new Highlight(range))
			}
		} else {
			_highlightTextNode(node, [].concat(token.content as any), token.type, index, highlights)
		}

		index += token.length
	}
}
