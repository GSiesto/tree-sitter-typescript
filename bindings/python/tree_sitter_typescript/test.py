import tree_sitter_typescript as tstypescript
from tree_sitter import Language, Parser

TYPESCRIPT_LANGUAGE = Language(tstypescript.language_typescript(), "typescript")
TSX_LANGUAGE = Language(tstypescript.language_tsx(), "tsx")

# Create a parser for TypeScript
typescript_parser = Parser()
typescript_parser.set_language(TYPESCRIPT_LANGUAGE)

# Create a parser for TSX
tsx_parser = Parser()
tsx_parser.set_language(TSX_LANGUAGE)

# Create a simple TypeScript code snippet
typescript_code = """
function add(a: number, b: number): number {
        return a + b;
}
"""

# Parse the TypeScript code
typescript_tree = typescript_parser.parse(bytes(typescript_code, "utf8"))

# Create a simple TSX code snippet
tsx_code = """
import React from 'react';

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <p>
                    Hello, world!
                </p>
            </header>
        </div>
    );
}

export default App;
"""

# Parse the TSX code
tsx_tree = tsx_parser.parse(bytes(tsx_code, "utf8"))

# Print the root nodes of the syntax trees
print("TypeScript root node:", typescript_tree.root_node)
print("TSX root node:", tsx_tree.root_node)

# Check if the root nodes represent programs
assert typescript_tree.root_node.type == 'program', "TypeScript root node does not represent a program"
assert tsx_tree.root_node.type == 'program', "TSX root node does not represent a program"

# Check if the root nodes have children
assert typescript_tree.root_node.child_count > 0, "TypeScript root node has no children"
assert tsx_tree.root_node.child_count > 0, "TSX root node has no children"

# Print the types of the children of the root nodes
print("TypeScript child node types:")
for child in typescript_tree.root_node.children:
        print(child.type)

print("TSX child node types:")
for child in tsx_tree.root_node.children:
        print(child.type)

print("tree_sitter_typescript package is working!")