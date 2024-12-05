/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 */

/** Creates a new token. */
export class Token {
	/**
	 * The type of the token.
	 *
	 * This is usually the key of a pattern in a {@link Grammar}.
	 *
	 * @see GrammarToken
	 */
	declare type: string;

	/**
	 * The strings or tokens contained by this token.
	 *
	 * This will be a token stream if the pattern matched also defined an `inside` grammar.
	 */
	declare content: string | TokenStream

	/**
	 * The alias(es) of the token.
	 *
	 * @see GrammarToken
	 */
	declare alias: string[]

	declare length: number

	constructor(
		/** See {@link Token#type type} */ type: string,
		/** See {@link Token#content content} */ content: string | TokenStream,
		/** The alias(es) of the token. */ alias = [] as string[],
		/** A copy of the full string this token was created from. */ matchedStr = ''
	) {
		this.type = type;
		this.content = content;
		this.alias = alias;

		// Copy of the full string this token was created from
		this.length = (matchedStr || '').length | 0;
	}

	/**
	 * Converts the given token or token stream to an HTML representation.
	 *
	 * The following hooks will be run:
	 * 1. `wrap`: On each {@link Token}.
	 */
	static stringify(
		/** The token or token stream to be converted. */ o: string | Token | TokenStream,
		/** The name of current language. */ language: string
	): string {
		if (typeof o === 'string') {
			return o;
		}

		if (Array.isArray(o)) {
			let s = '';

			for (const e of o) {
				s += Token.stringify(e, language);
			}

			return s;
		}

		const env = {
			type: o.type,
			content: Token.stringify(o.content, language),
			tag: 'span',
			classes: ['token', o.type],
			attributes: {} as Record<string, string>,
			language: language
		};

		const aliases = o.alias;

		if (aliases) {
			if (Array.isArray(aliases)) {
				Array.prototype.push.apply(env.classes, aliases);
			} else {
				env.classes.push(aliases);
			}
		}

		hooks.run('wrap', env);

		let attributes = '';

		for (const name in env.attributes) {
			attributes += ` ${name}="${(env.attributes[name] || '').replace(/"/g, '&quot;')}"`;
		}

		return `<${env.tag} class="${env.classes.join(' ')}"${attributes}>${env.content}</${env.tag}>`;
	}
}

const util = {
	encode<T extends Token | Token[] | string>(tokens: T): T {
		if (tokens instanceof Token) {
			return new Token(tokens.type, util.encode(tokens.content as string), tokens.alias) as T
		}

		if (Array.isArray(tokens)) {
			return tokens.map(util.encode) as T
		}

		return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ') as T
	},

	/**
	 * Returns the name of the type of the given value.
	 *
	 * @example
	 * type(null)      === 'Null'
	 * type(undefined) === 'Undefined'
	 * type(123)       === 'Number'
	 * type('foo')     === 'String'
	 * type(true)      === 'Boolean'
	 * type([1, 2])    === 'Array'
	 * type({})        === 'Object'
	 * type(String)    === 'Function'
	 * type(/abc+/)    === 'RegExp'
	 */
	type(o: any): string {
		return Object.prototype.toString.call(o).slice(8, -1);
	},

	/**
	 * Creates a deep clone of the given object.
	 *
	 * The main intended use of this function is to clone language definitions.
	 */
	clone<T extends object>(
		o: T,
		visited = new WeakMap as Map<T, T>
	): T {
		let clone: T;

		switch (util.type(o)) {
			case 'Object':
				if (visited.has(o)) {
					return visited.get(o)!
				}

				clone = {} as T

				visited.set(o, clone)

				for (const key of Object.keys(o)) {
					clone[key as keyof T] = util.clone(o[key as keyof T] as any, visited);
				}

				return clone

			case 'Array':
				if (visited.has(o)) {
					return visited.get(o)!
				}

				clone = [] as T

				visited.set(o, clone);

				(o as string[]).forEach((v, i) => {
					// @ts-expect-error array is too object-like
					clone[i] = util.clone(v, visited);
				});

				return clone;

			default:
				return o;
		}
	},
}

const hooks = {
	all: {} as Record<string, HookCallback[]>,

	/**
	 * Adds the given callback to the list of callbacks for the given hook.
	 *
	 * The callback will be invoked when the hook it is registered for is run.
	 * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
	 *
	 * One callback function can be registered to multiple hooks and the same hook multiple times.
	 */
	add(
		/** The name of the hook. */
		name: string,
		/** The callback function which is given environment variables. */
		callback: HookCallback
	) {
		const allHooks = hooks.all;

		allHooks[name] = allHooks[name] || [];

		allHooks[name].push(callback);
	},

	/**
	 * Runs a hook invoking all registered callbacks with the given environment variables.
	 *
	 * Callbacks will be invoked synchronously and in the order in which they were registered.
	 */
	run(
		/** The name of the hook. */
		name: string,
		/** The environment variables of the hook passed to all callbacks registered. */
		env: Record<string, any>
	) {
		const callbacks = hooks.all[name];

		if (!callbacks || !callbacks.length) {
			return;
		}

		for (const callback of callbacks) {
			callback(env);
		}
	}
}

export class LanguageMethods {
	/**
	 * Creates a deep copy of the language with the given id and appends the given tokens.
	 *
	 * If a token in `redef` also appears in the copied language, then the existing token in the copied language
	 * will be overwritten at its original position.
	 *
	 * ## Best practices
	 *
	 * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
	 * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
	 * understand the language definition because, normally, the order of tokens matters in Prism grammars.
	 *
	 * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
	 * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
	 *
	 * @example
	 * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
	 *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
	 *     // at its original position
	 *     'comment': { ... },
	 *     // CSS doesn't have a 'color' token, so this token will be appended
	 *     'color': /\b(?:red|green|blue)\b/
	 * });
	 */
	extend(id: string, redef: Grammar) {
		return Object.assign(util.clone(Prism.languages[id]), redef);
	}

	/**
	 * Inserts tokens _before_ another token in a language definition or any other grammar.
	 *
	 * ## Usage
	 *
	 * This helper method makes it easy to modify existing languages. For example, the CSS language definition
	 * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
	 * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
	 * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
	 * this:
	 *
	 * ```js
	 * Prism.languages.markup.style = {
	 *     // token
	 * };
	 * ```
	 *
	 * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
	 * before existing tokens. For the CSS example above, you would use it like this:
	 *
	 * ```js
	 * Prism.languages.insertBefore('markup', 'cdata', {
	 *     'style': {
	 *         // token
	 *     }
	 * });
	 * ```
	 *
	 * ## Special cases
	 *
	 * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
	 * will be ignored.
	 *
	 * This behavior can be used to insert tokens after `before`:
	 *
	 * ```js
	 * Prism.languages.insertBefore('markup', 'comment', {
	 *     'comment': Prism.languages.markup.comment,
	 *     // tokens after 'comment'
	 * });
	 * ```
	 *
	 * ## Limitations
	 *
	 * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
	 * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
	 * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
	 * deleting properties which is necessary to insert at arbitrary positions.
	 *
	 * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
	 * Instead, it will create a new object and replace all references to the target object with the new one. This
	 * can be done without temporarily deleting properties, so the iteration order is well-defined.
	 *
	 * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
	 * you hold the target object in a variable, then the value of the variable will not change.
	 *
	 * ```js
	 * var oldMarkup = Prism.languages.markup;
	 * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
	 *
	 * assert(oldMarkup !== Prism.languages.markup);
	 * assert(newMarkup === Prism.languages.markup);
	 * ```
	 */
	insertBefore(
		/** The property of `root` (e.g. a language id in `Prism.languages`) that contains the object to be modified. */
		inside: string,
		/** The key to insert before. */
		before: string,
		/** An object containing the key-value pairs to be inserted. */
		insert: Grammar,
		/** The object containing `inside`, i.e. the object that contains the object to be modified. */
		root = Prism.languages as Record<string, any>
	) {
		const grammar = root[inside];

		const ret = {} as Grammar;

		for (const token of Object.keys(grammar)) {
			if (token === before) {
				for (const newToken of Object.keys(insert)) {
					ret[newToken] = insert[newToken];
				}
			}

			// Do not insert token which also occur in insert. See #1525
			if (!Object.hasOwn(insert, token)) {
				ret[token] = grammar[token];
			}
		}

		const old = root[inside];

		root[inside] = ret;

		// Update references in other language definitions
		this.DFS(Prism.languages as Record<string, any>, (key: string, value: any) => {
			if (value === old && key !== inside) {
				(Prism.languages as Record<string, any>)[key] = ret;
			}
		});

		return ret;
	}

	// Traverse a language definition with Depth First Search
	DFS<T extends Record<string, any>>(
		this: T,
		o: T,
		callback: (this: T, i: keyof T, value: any, type: string) => any,
		type = '',
		visited = new Map<T, boolean>
	) {
		for (const i of Object.keys(o)) {
			callback.call(o, i, o[i], type || i);

			const property = o[i];
			const propertyType = util.type(property);

			if (propertyType === 'Object' && !visited.has(property)) {
				visited.set(property, true);

				this.DFS(property, callback, null, visited);
			} else if (propertyType === 'Array' && !visited.has(property)) {
				visited.set(property, true);

				this.DFS(property, callback, i, visited);
			}
		}
	}
}

export const Prism = {
	/**
	 * A namespace for utility methods.
	 *
	 * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
	 * change or disappear at any time.
	 */
	util,

	/**
	 * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
	 */
	languages: Object.assign(new LanguageMethods(), {
		/**
		 * The grammar for plain, unformatted text.
		 */
		plaintext: {},
	} as Record<string, any>),

	plugins: {},

	/**
	 * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
	 * and the language definitions to use, and returns a string with the HTML produced.
	 *
	 * The following hooks will be run:
	 * 1. `before-tokenize`
	 * 2. `after-tokenize`
	 * 3. `wrap`: On each {@link Token}.
	 *
	 * @example
	 * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
	 */
	highlight(
		/** A string with the code to be highlighted. */
		text: string,
		/** An object containing the tokens to use. */
		grammar: Grammar,
		/** The name of the language definition passed to `grammar`. */
		language: string
	): string {
		const env = {
			code: text,
			grammar: grammar,
			language: language
		} as {
			code: string
			grammar: Grammar,
			language: string
			tokens: TokenStream
		};

		hooks.run('before-tokenize', env);

		if (!env.grammar) {
			throw new Error(`Prism.highlight failed: No grammar found for language "${env.language}".`);
		}

		env.tokens = Prism.tokenize(env.code, env.grammar);

		hooks.run('after-tokenize', env);

		return Token.stringify(util.encode(env.tokens as Token[]), env.language);
	},

	/**
	 * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
	 * and the language definitions to use, and returns an array with the tokenized code.
	 *
	 * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
	 *
	 * This method could be useful in other contexts as well, as a very crude parser.
	 *
	 * @example
	 * let code = `var foo = 0;`;
	 * let tokens = Prism.tokenize(code, Prism.languages.javascript);
	 * tokens.forEach(token => {
	 *     if (token instanceof Prism.Token && token.type === 'number') {
	 *         console.log(`Found numeric literal: ${token.content}`);
	 *     }
	 * });
	 */
	tokenize(
		/** A string with the code to be highlighted. */
		text: string,
		/** An object containing the tokens to use. */
		grammar: Grammar
	): TokenStream {
		const rest = grammar.rest;

		if (rest) {
			for (const token in rest) {
				grammar[token] = rest[token as keyof typeof rest];
			}

			// biome-ignore lint/performance/noDelete: this is intentional
			delete grammar.rest;
		}

		const tokenList = new LinkedList();

		addAfter(tokenList, tokenList.head, text);

		matchGrammar(text, tokenList, grammar, tokenList.head, 0);

		return toArray(tokenList);
	},

	hooks,

	Token,
};

const matchPattern = (
	pattern: RegExp,
	pos: number,
	text: string,
	lookbehind: boolean
) => {
	pattern.lastIndex = pos;
	const match = pattern.exec(text);

	if (match && lookbehind && match[1]) {
		// change the match to remove the text matched by the Prism lookbehind group
		const lookbehindLength = match[1].length;

		match.index += lookbehindLength;
		match[0] = match[0].slice(lookbehindLength);
	}

	return match;
}

type RematchOptions = {
    cause: string;
    reach: number;
};

const matchGrammar = (
	text: string,
	tokenList: LinkedList<string | Token>,
	grammar: any,
	startNode: LinkedListNode<string | Token>,
	startPos: number,
	rematch?: RematchOptions
) => {
	for (const token of Object.keys(grammar)) {
		if (!grammar[token]) {
			continue;
		}

		let patterns = grammar[token];

		patterns = Array.isArray(patterns) ? patterns : [patterns];

		for (let j = 0; j < patterns.length; ++j) {
			if (rematch && rematch.cause === `${token},${j}`) {
				return;
			}

			const patternObj = patterns[j];
			const inside = patternObj.inside;
			const lookbehind = !!patternObj.lookbehind;
			const greedy = !!patternObj.greedy;
			const alias = patternObj.alias;

			if (greedy && !patternObj.pattern.global) {
				// Without the global flag, lastIndex won't work
				const flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];

				patternObj.pattern = RegExp(patternObj.pattern.source, `${flags}g`);
			}

			const pattern: RegExp = patternObj.pattern || patternObj;

			for ( // iterate the token list and keep track of the current token/string position
				let currentNode = startNode.next, pos = startPos;

				currentNode && currentNode !== tokenList.tail;

				pos += currentNode.value.length, currentNode = currentNode.next
			) {

				if (rematch && pos >= rematch.reach) {
					break;
				}

				let str = currentNode.value;

				if (tokenList.length > text.length) {
					// Something went terribly wrong, ABORT, ABORT!
					return;
				}

				if (str instanceof Token) {
					continue;
				}

				let removeCount = 1; // this is the to parameter of removeBetween

				let match: RegExpExecArray | null;

				if (greedy) {
					match = matchPattern(pattern, pos, text, lookbehind);

					if (!match || match.index >= text.length) {
						break;
					}

					const from = match.index;
					const to = match.index + match[0].length;

					let p = pos;

					// find the node that contains the match
					p += currentNode.value.length;

					while (from >= p) {
						currentNode = currentNode.next!;

						if (currentNode) {
							p += currentNode.value.length;
						}
					}

					// adjust pos (and p)
					p -= currentNode.value.length;

					pos = p;

					// the current node is a Token, then the match starts inside another Token, which is invalid
					if (currentNode.value instanceof Token) {
						continue;
					}

					// find the last node which is affected by this match
					for (
						let k = currentNode;
						k !== tokenList.tail && (p < to || typeof k.value === 'string');
						k = k.next!
					) {
						++removeCount;

						p += k.value.length;
					}

					removeCount--;

					// replace with the new match
					str = text.slice(pos, p);
					match.index -= pos;
				} else {
					match = matchPattern(pattern, 0, str, lookbehind);
					if (!match) {
						continue;
					}
				}

				// eslint-disable-next-line no-redeclare
				const from = match.index;
				const matchStr = match[0];
				const before = str.slice(0, from);
				const after = str.slice(from + matchStr.length);

				const reach = pos + str.length;

				if (rematch && reach > rematch.reach) {
					rematch.reach = reach;
				}

				let removeFrom = currentNode.prev!;

				if (before) {
					removeFrom = addAfter(tokenList, removeFrom, before);
					pos += before.length;
				}

				removeRange(tokenList, removeFrom, removeCount);

				const wrapped = new Token(token, inside ? Prism.tokenize(matchStr, inside) : matchStr, alias, matchStr);

				currentNode = addAfter(tokenList, removeFrom, wrapped);

				if (after) {
					addAfter(tokenList, currentNode, after);
				}

				if (removeCount > 1) {
					// at least one Token object was removed, so we have to do some rematching
					// this can only happen if the current pattern is greedy

					const nestedRematch: RematchOptions = {
						cause: `${token},${j}`,
						reach: reach
					};

					matchGrammar(text, tokenList, grammar, currentNode.prev!, pos, nestedRematch);

					// the reach might have been extended because of the rematching
					if (rematch && nestedRematch.reach > rematch.reach) {
						rematch.reach = nestedRematch.reach;
					}
				}
			}
		}
	}
}

export type LinkedListNode<T> = {
	value: T;

	/**
	 * The previous node.
	 */
	prev: LinkedListNode<T> | null;

	/**
	 * The next node.
	 */
	next: LinkedListNode<T> | null;
};

export class LinkedList<T = string> {
	declare head: LinkedListNode<T>
	declare tail: LinkedListNode<T>
	declare length: number

	constructor() {
		const value = null as T

		const head = { value, prev: null, next: null } as LinkedListNode<T>;
		const tail = { value, prev: head, next: null } as LinkedListNode<T>;

		head.next = tail;

		this.head = head;
		this.tail = tail;

		this.length = 0;
	}
}

/**
 * Adds a new node with the given value to the list.
 */
const addAfter = <T>(list: LinkedList<T>, node: LinkedListNode<T>, value: T) => {
	// assumes that node != list.tail && values.length >= 0
	const next = node.next!;

	const newNode = { value: value, prev: node, next } as LinkedListNode<T>;

	node.next = next.prev = newNode;

	++list.length;

	return newNode;
}

/**
 * Removes `count` nodes after the given node. The given node will not be removed.
 */
const removeRange = <T>(list: LinkedList<T>, node: LinkedListNode<T>, count: number) => {
	let next = node.next!
	let removedCount = 0;

	while (removedCount < count && next !== list.tail) {
		next = next.next!

		++removedCount;
	}

	node.next = next;
	next.prev = node;

	list.length -= removedCount;
}

const toArray = <T>(list: LinkedList<T>) => {
	const array = [];

	let node = list.head.next as LinkedListNode<T>;

	while (node !== list.tail) {
		array.push(node.value);

		node = node.next as LinkedListNode<T>
	}

	return array;
};

// some additional documentation/types

/**
 * The expansion of a simple `RegExp` literal to support additional properties.
 */
export interface GrammarToken {
	/**
	 * The regular expression of the token.
	 */
	pattern: RegExp;
	/**
	 * If `true`, then the first capturing group of `pattern` will (effectively)
	 * behave as a lookbehind group meaning that the captured text will not be part of the matched text of the new token.
	 */
	lookbehind?: boolean;
	/**
	 * Whether the token is greedy.
	 */
	greedy?: boolean;
	/**
	 * An optional alias or list of aliases.
	 */
	alias?: string | string[];
	/**
	 * The nested grammar of this token.
	 *
	 * The `inside` grammar will be used to tokenize the text value of each token of this kind.
	 *
	 * This can be used to make nested and even recursive language definitions.
	 *
	 * Note: This can cause infinite recursion. Be careful when you embed different languages or even the same language into
	 * each another.
	 */
	inside?: Grammar;
};

export type Grammar = Record<string, RegExp | GrammarToken | Array<RegExp | GrammarToken>>;

export type HookCallback = (
	/** The environment variables of the hook. */
	env: Record<string, any>
) => void

export type TokenStream = string[] | Token[]
