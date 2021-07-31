/**
 *                  LISP                      C
 *
 *   2 + 2          (add 2 2)                 add(2, 2)
 *   4 - 2          (subtract 4 2)            subtract(4, 2)
 *   2 + (4 - 2)    (add 2 (subtract 4 2))    add(2, subtract(4, 2))
 *
 *
 *   1. input  => tokenizer   => tokens
 *   2. tokens => parser      => ast
 *   3. ast    => transformer => newAst
 *   4. newAst => generator   => output
 */

function tokenizer(input) {
	// A `current` variable for tracking our position in the code like a cursor.
	let current = 0;

	// And a `tokens` array for pushing our tokens to.
	let tokens = [];

	// We start by creating a `while` loop where we are setting up our `current`
	// variable to be incremented as much as we want `inside` the loop.
	//
	// We do this because we may want to increment `current` many times within a
	// single loop because our tokens can be any length.
	while (current < input.length) {
		// We're also going to store the `current` character in the `input`.
		let char = input[current];

		// The first thing we want to check for is an open parenthesis. This will
		// later be used for `CallExpression` but for now we only care about the
		// character.
		//
		// We check to see if we have an open parenthesis:
		if (char === '(') {
			// If we do, we push a new token with the type `paren` and set the value
			// to an open parenthesis.
			tokens.push({
				type: 'paren',
				value: '(',
			});

			// Then we increment `current`
			current++;

			// And we `continue` onto the next cycle of the loop.
			continue;
		}

		// Next we're going to check for a closing parenthesis. We do the same exact
		// thing as before: Check for a closing parenthesis, add a new token,
		// increment `current`, and `continue`.
		if (char === ')') {
			tokens.push({
				type: 'paren',
				value: ')',
			});
			current++;
			continue;
		}

		// Moving on, we're now going to check for whitespace. This is interesting
		// because we care that whitespace exists to separate characters, but it
		// isn't actually important for us to store as a token. We would only throw
		// it out later.
		//
		// So here we're just going to test for existence and if it does exist we're
		// going to just `continue` on.
		let WHITESPACE = /\s/;
		if (WHITESPACE.test(char)) {
			current++;
			continue;
		}

		// The next type of token is a number. This is different than what we have
		// seen before because a number could be any number of characters and we
		// want to capture the entire sequence of characters as one token.
		//
		//   (add 123 456)
		//        ^^^ ^^^
		//        Only two separate tokens
		//
		// So we start this off when we encounter the first number in a sequence.
		let NUMBERS = /[0-9]/;
		if (NUMBERS.test(char)) {
			// We're going to create a `value` string that we are going to push
			// characters to.
			let value = '';

			// Then we're going to loop through each character in the sequence until
			// we encounter a character that is not a number, pushing each character
			// that is a number to our `value` and incrementing `current` as we go.
			while (NUMBERS.test(char)) {
				value += char;
				char = input[++current];
			}

			// After that we push our `number` token to the `tokens` array.
			tokens.push({ type: 'number', value });

			// And we continue on.
			continue;
		}

		// We'll also add support for strings in our language which will be any
		// text surrounded by double quotes (").
		//
		//   (concat "foo" "bar")
		//            ^^^   ^^^ string tokens
		//
		// We'll start by checking for the opening quote:
		if (char === '"') {
			// Keep a `value` variable for building up our string token.
			let value = '';

			// We'll skip the opening double quote in our token.
			char = input[++current];

			// Then we'll iterate through each character until we reach another
			// double quote.
			while (char !== '"') {
				value += char;
				char = input[++current];
			}

			// Skip the closing double quote.
			char = input[++current];

			// And add our `string` token to the `tokens` array.
			tokens.push({ type: 'string', value });

			continue;
		}

		// The last type of token will be a `name` token. This is a sequence of
		// letters instead of numbers, that are the names of functions in our lisp
		// syntax.
		//
		//   (add 2 4)
		//    ^^^
		//    Name token
		//
		let LETTERS = /[a-z]/i;
		if (LETTERS.test(char)) {
			let value = '';

			// Again we're just going to loop through all the letters pushing them to
			// a value.
			while (LETTERS.test(char)) {
				value += char;
				char = input[++current];
			}

			// And pushing that value as a token with the type `name` and continuing.
			tokens.push({ type: 'name', value });

			continue;
		}

		// Finally if we have not matched a character by now, we're going to throw
		// an error and completely exit.
		throw new TypeError('I dont know what this character is: ' + char);
	}

	// Then at the end of our `tokenizer` we simply return the tokens array.
	return tokens;
}

/**
 * ============================================================================
 *                                 ヽ/❀o ل͜ o\ﾉ
 *                                THE PARSER!!!
 * ============================================================================
 */

/**
 * For our parser we're going to take our array of tokens and turn it into an
 * AST.
 *
 *   [{ type: 'paren', value: '(' }, ...]   =>   { type: 'Program', body: [...] }
 */

// Okay, so we define a `parser` function that accepts our array of `tokens`.
function parser(tokens) {
	// Again we keep a `current` variable that we will use as a cursor.
	let current = 0;

	// But this time we're going to use recursion instead of a `while` loop. So we
	// define a `walk` function.
	function walk() {
		// Inside the walk function we start by grabbing the `current` token.
		let token = tokens[current];
		if (token.type === 'number') {
			// If we have one, we'll increment `current`.
			current++;
			return {
				type: 'NumberLiteral',
				value: token.value,
			};
		}

		if (token.type === 'string') {
			current++;

			return {
				type: 'StringLiteral',
				value: token.value,
			};
		}

		if (token.type === 'paren' && token.value === '(') {
			// (
			token = tokens[++current];

			let node = {
				type: 'CallExpression',
				name: token.value,
				params: [],
			};

			token = tokens[++current];
			// (
			while (token.type !== 'paren' || (token.type === 'paren' && token.value !== ')')) {
				node.params.push(walk());
				token = tokens[current];
			}

			current++;
			return node;
		}

		throw new TypeError(token.type);
	}

	// Now, we're going to create our AST which will have a root which is a
	// `Program` node.
	let ast = {
		type: 'Program',
		body: [],
	};

	// And we're going to kickstart our `walk` function, pushing nodes to our
	// `ast.body` array.
	//
	// The reason we are doing this inside a loop is because our program can have
	// `CallExpression` after one another instead of being nested.
	//
	//   (add 2 2)
	//   (subtract 4 2)
	//
	while (current < tokens.length) {
		// 数组2个元素，node为2个{},{}
		ast.body.push(walk());
	}

	// At the end of our parser we'll return the AST.
	return ast;
}

function traverser(ast, visitor) {
	function traverseArray(array, parent) {
		array.forEach(child => {
			traverseNode(child, parent);
		});
	}
	function traverseNode(node, parent) {
		// We start by testing for the existence of a method on the visitor with a
		// matching `type`.
		let methods = visitor[node.type];

		// If there is an `enter` method for this node type we'll call it with the
		// `node` and its `parent`.
		if (methods && methods.enter) {
			methods.enter(node, parent);
		}

		switch (node.type) {
			case 'Program':
				traverseArray(node.body, node);
				break;

			case 'CallExpression':
				traverseArray(node.params, node);
				break;

			case 'NumberLiteral':
			case 'StringLiteral':
				break;

			default:
				throw new TypeError(node.type);
		}

		if (methods && methods.exit) {
			console.log(`methods`, methods);
			methods.exit(node, parent);
		}
	}
	traverseNode(ast, null);
}
/**
 * Next up, the transformer. Our transformer is going to take the AST that we
 * have built and pass it to our traverser function with a visitor and will
 * create a new ast.
 *
 * ----------------------------------------------------------------------------
 *   Original AST                     |   Transformed AST
 * ----------------------------------------------------------------------------
 *   {                                |   {
 *     type: 'Program',               |     type: 'Program',
 *     body: [{                       |     body: [{
 *       type: 'CallExpression',      |       type: 'ExpressionStatement',
 *       name: 'add',                 |       expression: {
 *       params: [{                   |         type: 'CallExpression',
 *         type: 'NumberLiteral',     |         callee: {
 *         value: '2'                 |           type: 'Identifier',
 *       }, {                         |           name: 'add'
 *         type: 'CallExpression',    |         },
 *         name: 'subtract',          |         arguments: [{
 *         params: [{                 |           type: 'NumberLiteral',
 *           type: 'NumberLiteral',   |           value: '2'
 *           value: '4'               |         }, {
 *         }, {                       |           type: 'CallExpression',
 *           type: 'NumberLiteral',   |           callee: {
 *           value: '2'               |             type: 'Identifier',
 *         }]                         |             name: 'subtract'
 *       }]                           |           },
 *     }]                             |           arguments: [{
 *   }                                |             type: 'NumberLiteral',
 *                                    |             value: '4'
 * ---------------------------------- |           }, {
 *                                    |             type: 'NumberLiteral',
 *                                    |             value: '2'
 *                                    |           }]
 *  (sorry the other one is longer.)  |         }
 *                                    |       }
 *                                    |     }]
 *                                    |   }
 * ----------------------------------------------------------------------------
 */

function transformer(ast) {
	let newAst = {
		type: 'Program',
		body: [],
	};
	ast._context = newAst.body;
	// 引用类型，后面在_context加内容会在newAst.body出现

	traverser(ast, {
		// The first visitor method accepts any `NumberLiteral`
		NumberLiteral: {
			// We'll visit them on enter.
			enter(node, parent) {
				// We'll create a new node also named `NumberLiteral` that we will push to
				// the parent context.
				parent._context.push({
					type: 'NumberLiteral',
					value: node.value,
				});
			},
		},

		// Next we have `StringLiteral`
		StringLiteral: {
			enter(node, parent) {
				parent._context.push({
					type: 'StringLiteral',
					value: node.value,
				});
			},
		},

		// Next up, `CallExpression`.
		CallExpression: {
			enter(node, parent) {
				// We start creating a new node `CallExpression` with a nested
				// `Identifier`.
				let expression = {
					type: 'CallExpression',
					callee: {
						type: 'Identifier',
						name: node.name,
					},
					arguments: [],
				};
				node._context = expression.arguments;
				// node在后面循环的时候后会变成parent，parent._context会进入ast_context
				if (parent.type !== 'CallExpression') {
					expression = {
						type: 'ExpressionStatement',
						expression: expression,
					};
				}
				parent._context.push(expression);
			},
		},
	});

	// At the end of our transformer function we'll return the new ast that we
	// just created.
	return newAst;
}

function codeGenerator(node) {
	// We'll break things down by the `type` of the `node`.
	switch (node.type) {
		// If we have a `Program` node. We will map through each node in the `body`
		// and run them through the code generator and join them with a newline.
		case 'Program':
			return node.body.map(codeGenerator).join('\n');

		// For `ExpressionStatement` we'll call the code generator on the nested
		// expression and we'll add a semicolon...
		case 'ExpressionStatement':
			return (
				codeGenerator(node.expression) + ';' // << (...because we like to code the *correct* way)
			);

		// For `CallExpression` we will print the `callee`, add an open
		// parenthesis, we'll map through each node in the `arguments` array and run
		// them through the code generator, joining them with a comma, and then
		// we'll add a closing parenthesis.
		case 'CallExpression':
			return codeGenerator(node.callee) + '(' + node.arguments.map(codeGenerator).join(', ') + ')';

		// For `Identifier` we'll just return the `node`'s name.
		case 'Identifier':
			return node.name;

		// For `NumberLiteral` we'll just return the `node`'s value.
		case 'NumberLiteral':
			return node.value;

		// For `StringLiteral` we'll add quotations around the `node`'s value.
		case 'StringLiteral':
			return '"' + node.value + '"';

		// And if we haven't recognized the node, we'll throw an error.
		default:
			throw new TypeError(node.type);
	}
}

function compiler(input) {
	let tokens = tokenizer(input);
	let ast = parser(tokens);
	let newAst = transformer(ast);
	let output = codeGenerator(newAst);

	return output;
}

module.exports = {
	tokenizer,
	parser,
	traverser,
	transformer,
	codeGenerator,
	compiler,
};

/*
1. 重点parser,transformer,codeGenerator,
-----------------------------------------------------------------------------------------------------

parser
	node.params.push(walk());
	主要是使用递归，根节点分为子节点，从下往上的树结构
	

-----------------------------------------------------------------------------------------------------

-----------------------------------------------------------------------------------------------------

transformer
	最重要的部分

	ast._context = newAst.body;=>操作过程一直是以parent._context来操作,由于数组和object是引用类型，赋值的是地址，所以_context会和body一起改变

	parent._context.push(expression);	=>树结构，最终的根节点是ast._context，一层传一层最后汇聚在根节点

	node._context = expression.arguments;=>子节点一直传到根节点，在2层的node是3层parent

	从上往下的树结构，从node到parent到ast
-----------------------------------------------------------------------------------------------------


-----------------------------------------------------------------------------------------------------

codeGenerator
	return codeGenerator(node.callee) + '(' + node.arguments.map(codeGenerator).join(', ') + ')'; 

	node.arguments.map(codeGenerator).join(', ')=>将add的arguments转为add(2,codeGenerator(node.arguments))

-----------------------------------------------------------------------------------------------------

*/
