import { Prism, type Token } from "./prism.ts"

import "./prism-lang-markup.ts"
import "./prism-lang-js.ts"

const javascript = Prism.util.clone(Prism.languages.javascript);

const space = /(?:\s|\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))\*\/)/.source;
const braces = /(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])*\})/.source;
let spread = /(?:\{<S>*\.{3}(?:[^{}]|<BRACES>)*\})/.source;

const re = (source: string, flags = '') => RegExp(
	source
		.replace(/<S>/g, () => space)
		.replace(/<BRACES>/g, () => braces)
		.replace(/<SPREAD>/g, () => spread),
	flags
);

spread = re(spread).source;

Prism.languages.jsx = Prism.languages.extend('markup', javascript);
Prism.languages.jsx.tag.pattern = re(
	/<\/?(?:[\w.:-]+(?:<S>+(?:[\w.:$-]+(?:=(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s{'"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\/?)?>/.source
);

Prism.languages.jsx.tag.inside.tag.pattern = /^<\/?[^\s>\/]*/;
Prism.languages.jsx.tag.inside['attr-value'].pattern = /=(?!\{)(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s'">]+)/;
Prism.languages.jsx.tag.inside.tag.inside['class-name'] = /^[A-Z]\w*(?:\.[A-Z]\w*)*$/;
Prism.languages.jsx.tag.inside.comment = javascript.comment;

Prism.languages.insertBefore('inside', 'attr-name', {
	'spread': {
		pattern: re(/<SPREAD>/.source),
		inside: Prism.languages.jsx
	}
}, Prism.languages.jsx.tag);

Prism.languages.insertBefore('inside', 'special-attr', {
	'script': {
		// Allow for two levels of nesting
		pattern: re(/=<BRACES>/.source),
		alias: 'language-javascript',
		inside: {
			'script-punctuation': {
				pattern: /^=(?=\{)/,
				alias: 'punctuation'
			},
			rest: Prism.languages.jsx
		},
	}
}, Prism.languages.jsx.tag);

// The following will handle plain text inside tags
const stringifyToken = (token: Token): string => {
	if (!token) {
		return '';
	}

	if (typeof token === 'string') {
		return token;
	}

	if (typeof token.content === 'string') {
		return token.content;
	}

	return (token.content as Token[]).map(stringifyToken).join('');
};

const walkTokens = (tokens: Token[]) => {
	const openedTags = [];

	for (let i = 0; i < tokens.length; ++i) {
		const token = tokens[i];

		let notTagNorBrace = false;

		if (typeof token !== 'string') {
			if (token.type === 'tag' && token.content[0] && (token.content as Token[])[0].type === 'tag') {
				// We found a tag, now find its kind

				if (((token.content as Token[])[0].content as Token[])[0].content === '</') {
					// Closing tag
					if (openedTags.length > 0 && openedTags[openedTags.length - 1].tagName === stringifyToken(((token.content as Token[])[0].content as Token[])[1])) {
						// Pop matching opening tag
						openedTags.pop();
					}
				} else {
					if ((token.content as Token[])[token.content.length - 1].content === '/>') {
						// Autoclosed tag, ignore
					} else {
						// Opening tag
						openedTags.push({
							tagName: stringifyToken(((token.content as Token[])[0].content as Token[])[1]),
							openedBraces: 0
						});
					}
				}
			} else if (openedTags.length > 0 && token.type === 'punctuation' && token.content === '{') {

				// Here we might have entered a JSX context inside a tag
				++openedTags[openedTags.length - 1].openedBraces;

			} else if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces > 0 && token.type === 'punctuation' && token.content === '}') {

				// Here we might have left a JSX context inside a tag
				--openedTags[openedTags.length - 1].openedBraces;

			} else {
				notTagNorBrace = true;
			}
		}
		if (notTagNorBrace || typeof token === 'string') {
			if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces === 0) {
				// Here we are inside a tag, and not inside a JSX context.
				// That's plain text: drop any tokens matched.
				let plainText = stringifyToken(token);

				// And merge text with adjacent text
				if (i < tokens.length - 1 && (typeof tokens[i + 1] === 'string' || tokens[i + 1].type === 'plain-text')) {
					plainText += stringifyToken(tokens[i + 1]);
					tokens.splice(i + 1, 1);
				}
				if (i > 0 && (typeof tokens[i - 1] === 'string' || tokens[i - 1].type === 'plain-text')) {
					plainText = stringifyToken(tokens[i - 1]) + plainText;
					tokens.splice(i - 1, 1);
					--i;
				}

				tokens[i] = new Prism.Token('plain-text', plainText, undefined, plainText);
			}
		}

		if (token.content && typeof token.content !== 'string') {
			walkTokens(token.content as Token[]);
		}
	}
};

Prism.hooks.add('after-tokenize', (env) => {
	if (env.language !== 'jsx') {
		return;
	}

	walkTokens(env.tokens);
});
