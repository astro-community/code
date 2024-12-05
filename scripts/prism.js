/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */

/** Creates a new token. */
class Token {
	constructor(
		/** @type {string} See {@link Token#type type} */ type,
		/** @type {string | TokenStream} See {@link Token#content content} */ content,
		/** @type {string|string[]} The alias(es) of the token. */ alias = [],
		/** @type {string} A copy of the full string this token was created from. */ matchedStr = ''
	) {
		/**
		 * The type of the token.
		 *
		 * This is usually the key of a pattern in a {@link Grammar}.
		 *
		 * @type {string}
		 * @see GrammarToken
		 * @public
		 */
		this.type = type;

		/**
		 * The strings or tokens contained by this token.
		 *
		 * This will be a token stream if the pattern matched also defined an `inside` grammar.
		 *
		 * @type {string | TokenStream}
		 * @public
		 */
		this.content = content;

		/**
		 * The alias(es) of the token.
		 *
		 * @type {string|string[]}
		 * @see GrammarToken
		 * @public
		 */
		this.alias = alias;

		// Copy of the full string this token was created from
		this.length = (matchedStr || '').length | 0;
	}

	/**
	 * Converts the given token or token stream to an HTML representation.
	 *
	 * The following hooks will be run:
	 * 1. `wrap`: On each {@link Token}.
	 *
	 * @param {string | Token | TokenStream} o The token or token stream to be converted.
	 * @param {string} language The name of current language.
	 * @returns {string} The HTML representation of the token or token stream.
	 * @memberof Token
	 * @static
	 */
	static stringify(o, language) {
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
			attributes: {},
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

		Prism.hooks.run('wrap', env);

		let attributes = '';

		for (const name in env.attributes) {
			attributes += ` ${name}="${(env.attributes[name] || '').replace(/"/g, '&quot;')}"`;
		}

		return `<${env.tag} class="${env.classes.join(' ')}"${attributes}>${env.content}</${env.tag}>`;
	}
}

export const Prism = {
	/**
	 * A namespace for utility methods.
	 *
	 * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
	 * change or disappear at any time.
	 *
	 * @namespace
	 * @memberof Prism
	 */
	util: {
		/** @template {Token | Token[] | string} T */
		/** @returns {T} */
		encode(/** @type {T} */ tokens) {
			if (tokens instanceof Token) {
				return /** @type {T} */ (new Token(tokens.type, Prism.utils.encode(tokens.content), tokens.alias));
			}

			if (Array.isArray(tokens)) {
				return /** @type {T} */ (tokens.map(Prism.utils.encode));
			}

			return /** @type {T} */ (tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' '));
		},

		/**
		 * Returns the name of the type of the given value.
		 *
		 * @param {any} o
		 * @returns {string}
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
		type(o) {
			return Object.prototype.toString.call(o).slice(8, -1);
		},

		/**
		 * Creates a deep clone of the given object.
		 *
		 * The main intended use of this function is to clone language definitions.
		 *
		 * @template T
		 * @returns {T}
		 */
		clone(
			/** @type {T} */ o,
			/** @type {Map<T, T>} */ visited = /** @type {any} */ (new WeakMap)
		) {
			/** @type {T} */
			let clone;

			switch (Prism.util.type(o)) {
				case 'Object':
					if (visited.has(o)) {
						return /** @type {T} */ (visited.get(o))
					}

					clone = /** @type {any} */ ({});

					visited.set(o, clone)

					for (const key of Object.keys(/** @type {any} */ (o))) {
						clone[key] = Prism.util.clone(o[key], visited);
					}

					return /** @type {any} */ (clone);

				case 'Array':
					if (visited.has(o)) {
						return /** @type {T} */ (visited.get(o))
					}

					clone = /** @type {any} */ ([]);

					visited.set(o, clone);

					(/** @type {Array} */(/** @type {any} */(o))).forEach((v, i) => {
						clone[i] = Prism.util.clone(v, visited);
					});

					return /** @type {any} */ (clone);

				default:
					return o;
			}
		},
	},

	/**
	 * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
	 *
	 * @namespace
	 * @memberof Prism
	 * @public
	 */
	languages: {
		/**
		 * The grammar for plain, unformatted text.
		 */
		plaintext: {},

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
		 * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
		 * @param {Grammar} redef The new tokens to append.
		 * @returns {Grammar} The new language created.
		 * @public
		 * @example
		 * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
		 *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
		 *     // at its original position
		 *     'comment': { ... },
		 *     // CSS doesn't have a 'color' token, so this token will be appended
		 *     'color': /\b(?:red|green|blue)\b/
		 * });
		 */
		extend(id, redef) {
			return Object.assign(Prism.util.clone(Prism.languages[id]), redef);
		},

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
		 *
		 * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
		 * object to be modified.
		 * @param {string} before The key to insert before.
		 * @param {Grammar} insert An object containing the key-value pairs to be inserted.
		 * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
		 * object to be modified.
		 *
		 * Defaults to `Prism.languages`.
		 * @returns {Grammar} The new grammar object.
		 * @public
		 */
		insertBefore(inside, before, insert, root = Prism.languages) {
			const grammar = root[inside];

			/** @type {Grammar} */
			const ret = {};

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
			Prism.languages.DFS(Prism.languages, (key, value) => {
				if (value === old && key !== inside) {
					this[key] = ret;
				}
			});

			return ret;
		},

		// Traverse a language definition with Depth First Search
		/** @template {any[] | Record<any, any>} T */
		DFS(
			/** @type {T} */ o,
			/** @type {(...args: any[]) => any} */ callback,
			/** @type {string} */ type,
			/** @type {Map<T, boolean>} */ visited = new Map
		) {
			for (const i of Object.keys(o)) {
				callback.call(o, i, o[i], type || i);

				const property = o[i];
				const propertyType = Prism.util.type(property);

				if (propertyType === 'Object' && !visited.has(property)) {
					visited.set(property, true);

					Prism.languages.DFS(property, callback, null, visited);
				} else if (propertyType === 'Array' && !visited.has(property)) {
					visited.set(property, true);

					Prism.languages.DFS(property, callback, i, visited);
				}
			}
		}
	},

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
	 * @param {string} text A string with the code to be highlighted.
	 * @param {Grammar} grammar An object containing the tokens to use.
	 *
	 * Usually a language definition like `Prism.languages.markup`.
	 * @param {string} language The name of the language definition passed to `grammar`.
	 * @returns {string} The highlighted HTML.
	 * @memberof Prism
	 * @public
	 * @example
	 * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
	 */
	highlight(text, grammar, language) {
		const env = {
			code: text,
			grammar: grammar,
			language: language
		};

		Prism.hooks.run('before-tokenize', env);

		if (!env.grammar) {
			throw new Error(`Prism.highlight failed: No grammar found for language "${env.language}".`);
		}

		env.tokens = Prism.tokenize(env.code, env.grammar);

		Prism.hooks.run('after-tokenize', env);

		return Token.stringify(Prism.util.encode(env.tokens), env.language);
	},

	/**
	 * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
	 * and the language definitions to use, and returns an array with the tokenized code.
	 *
	 * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
	 *
	 * This method could be useful in other contexts as well, as a very crude parser.
	 *
	 * @param {string} text A string with the code to be highlighted.
	 * @param {Grammar} grammar An object containing the tokens to use.
	 *
	 * Usually a language definition like `Prism.languages.markup`.
	 * @returns {TokenStream} An array of strings and tokens, a token stream.
	 * @memberof Prism
	 * @public
	 * @example
	 * let code = `var foo = 0;`;
	 * let tokens = Prism.tokenize(code, Prism.languages.javascript);
	 * tokens.forEach(token => {
	 *     if (token instanceof Prism.Token && token.type === 'number') {
	 *         console.log(`Found numeric literal: ${token.content}`);
	 *     }
	 * });
	 */
	tokenize(text, grammar) {
		const rest = grammar.rest;

		if (rest) {
			for (const token in rest) {
				grammar[token] = rest[token];
			}

			// biome-ignore lint/performance/noDelete: this is intentional
			delete grammar.rest;
		}

		const tokenList = new LinkedList();

		addAfter(tokenList, tokenList.head, text);

		matchGrammar(text, tokenList, grammar, tokenList.head, 0);

		return toArray(tokenList);
	},

	/**
	 * @namespace
	 * @memberof Prism
	 * @public
	 */
	hooks: {
		all: {},

		/**
		 * Adds the given callback to the list of callbacks for the given hook.
		 *
		 * The callback will be invoked when the hook it is registered for is run.
		 * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
		 *
		 * One callback function can be registered to multiple hooks and the same hook multiple times.
		 *
		 * @param {string} name The name of the hook.
		 * @param {HookCallback} callback The callback function which is given environment variables.
		 * @public
		 */
		add(name, callback) {
			const hooks = Prism.hooks.all;

			hooks[name] = hooks[name] || [];

			hooks[name].push(callback);
		},

		/**
		 * Runs a hook invoking all registered callbacks with the given environment variables.
		 *
		 * Callbacks will be invoked synchronously and in the order in which they were registered.
		 *
		 * @param {string} name The name of the hook.
		 * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
		 * @public
		 */
		run(name, env) {
			const callbacks = Prism.hooks.all[name];

			if (!callbacks || !callbacks.length) {
				return;
			}

			for (const callback of callbacks) {
				callback(env);
			}
		}
	},

	Token,
};

/**
 * A token stream is an array of strings and {@link Token Token} objects.
 *
 * Token streams have to fulfill a few properties that are assumed by most functions (mostly internal ones) that process
 * them.
 *
 * 1. No adjacent strings.
 * 2. No empty strings.
 *
 *    The only exception here is the token stream that only contains the empty string and nothing else.
 *
 * @typedef {Array<string | Token>} TokenStream
 * @global
 * @public
 */

/**
 * @param {RegExp} pattern
 * @param {number} pos
 * @param {string} text
 * @param {boolean} lookbehind
 * @returns {RegExpExecArray | null}
 */
const matchPattern = (pattern, pos, text, lookbehind) => {
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

/**
 * @param {string} text
 * @param {LinkedList<string | Token>} tokenList
 * @param {any} grammar
 * @param {LinkedListNode<string | Token>} startNode
 * @param {number} startPos
 * @param {RematchOptions} [rematch]
 * @returns {void}
 * @private
 *
 * @typedef RematchOptions
 * @property {string} cause
 * @property {number} reach
 */
const matchGrammar = (text, tokenList, grammar, startNode, startPos, rematch) => {
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

			/** @type {RegExp} */
			const pattern = patternObj.pattern || patternObj;

			for ( // iterate the token list and keep track of the current token/string position
				let currentNode = /** @type {LinkedListNode<string | Token>} */ startNode.next, pos = startPos;

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

				let match;

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
						currentNode = /** @type {LinkedListNode<string | Token>} */ (currentNode.next);

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
						k = /** @type {LinkedListNode<string | Token>} */ (k.next)
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

				let removeFrom = /** @type {LinkedListNode<string | Token>} */ (currentNode.prev);

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

					/** @type {RematchOptions} */
					const nestedRematch = {
						cause: `${token},${j}`,
						reach: reach
					};

					matchGrammar(text, tokenList, grammar, /** @type {LinkedListNode<string | Token>} */ (currentNode.prev), pos, nestedRematch);

					// the reach might have been extended because of the rematching
					if (rematch && nestedRematch.reach > rematch.reach) {
						rematch.reach = nestedRematch.reach;
					}
				}
			}
		}
	}
}

/**
 * @template T
 * @typedef LinkedListNode
 * @property {T} value
 * @property {LinkedListNode<T> | null} prev The previous node.
 * @property {LinkedListNode<T> | null} next The next node.
 * @private
 */

/**
 * @template T
 * @private
 */
class LinkedList {
	constructor() {
		/** @type {any} */
		const value = null

		/** @type {LinkedListNode<T>} */
		const head = { value, prev: null, next: null };

		/** @type {LinkedListNode<T>} */
		const tail = { value, prev: head, next: null };

		head.next = tail;

		/** @type {LinkedListNode<T>} */
		this.head = head;

		/** @type {LinkedListNode<T>} */
		this.tail = tail;

		this.length = 0;
	}
}

/**
 * Adds a new node with the given value to the list.
 *
 * @param {LinkedList<T>} list
 * @param {LinkedListNode<T>} node
 * @param {T} value
 * @returns {LinkedListNode<T>} The added node.
 * @template T
 */
const addAfter = (list, node, value) => {
	// assumes that node != list.tail && values.length >= 0
	const { next } = /** @type {{ next: LinkedListNode<T> }} */ (node);

	const newNode = { value: value, prev: node, next };

	node.next = next.prev = newNode;

	++list.length;

	return newNode;
}

/**
 * Removes `count` nodes after the given node. The given node will not be removed.
 *
 * @param {LinkedList<T>} list
 * @param {LinkedListNode<T>} node
 * @param {number} count
 * @template T
 */
const removeRange = (list, node, count) => {
	let next = /** @type {LinkedListNode<T>} */ (node.next);
	let removedCount = 0;

	while (removedCount < count && next !== list.tail) {
		next = /** @type {LinkedListNode<T>} */ (next.next);

		++removedCount;
	}

	node.next = next;
	next.prev = node;

	list.length -= removedCount;
}

/**
 * @param {LinkedList<T>} list
 * @returns {T[]}
 * @template T
 */
const toArray = (list) => {
	const array = [];

	let node = /** @type {LinkedListNode<T>} */ (list.head.next);

	while (node !== list.tail) {
		array.push(node.value);

		node = /** @type {LinkedListNode<T>} */ (node.next);
	}

	return array;
};

// some additional documentation/types

/**
 * The expansion of a simple `RegExp` literal to support additional properties.
 *
 * @typedef GrammarToken
 * @property {RegExp} pattern The regular expression of the token.
 * @property {boolean} [lookbehind=false] If `true`, then the first capturing group of `pattern` will (effectively)
 * behave as a lookbehind group meaning that the captured text will not be part of the matched text of the new token.
 * @property {boolean} [greedy=false] Whether the token is greedy.
 * @property {string|string[]} [alias] An optional alias or list of aliases.
 * @property {Grammar} [inside] The nested grammar of this token.
 *
 * The `inside` grammar will be used to tokenize the text value of each token of this kind.
 *
 * This can be used to make nested and even recursive language definitions.
 *
 * Note: This can cause infinite recursion. Be careful when you embed different languages or even the same language into
 * each another.
 * @global
 * @public
 */

/**
 * @typedef Grammar
 * @type {Object<string, RegExp | GrammarToken | Array<RegExp | GrammarToken>>}
 * @property {Grammar} [rest] An optional grammar object that will be appended to this grammar.
 * @global
 * @public
 */

/**
 * @callback HookCallback
 * @param {Object<string, any>} env The environment variables of the hook.
 * @returns {void}
 * @global
 * @public
 */

/** @typedef {InstanceType<typeof Object>} PlainObject */
