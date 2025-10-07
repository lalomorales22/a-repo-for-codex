# Codex Programming Language Documentation

## Introduction

Codex is a complete programming language implementation created and managed by Codex for demonstration purposes. This project showcases all aspects of language design and implementation.

## Language Syntax

### Variables

Variables are declared using the `let` keyword:

```codex
let x = 10
let name = "Codex"
let pi = 3.14159
```

### Functions

Functions are defined using the `func` keyword:

```codex
func add(a, b) {
    return a + b
}

func greet(name) {
    print("Hello, " + name)
}
```

### Control Flow

#### If Statements

```codex
if (x > 10) {
    print("x is greater than 10")
} else {
    print("x is 10 or less")
}
```

#### While Loops

```codex
let i = 0
while (i < 10) {
    print(i)
    i = i + 1
}
```

### Operators

- Arithmetic: `+`, `-`, `*`, `/`
- Comparison: `==`, `!=`, `<`, `>`
- Assignment: `=`

### Comments

Comments start with `#`:

```codex
# This is a comment
let x = 10  # Inline comment
```

## Command Line Interface

### Running Programs

```bash
python main.py run examples/hello.cdx
```

### Compiling Programs

```bash
# Compile and display object code
python main.py compile examples/hello.cdx

# Compile and save to file
python main.py compile examples/hello.cdx -o hello.obj
```

### Interactive REPL

```bash
python main.py repl
```

### AI Assistant

```bash
python main.py assistant
```

### Generating Images

```bash
python main.py generate-image "A beautiful landscape"
python main.py generate-image "Futuristic city" --size 512x512 --style vivid
```

### Generating Videos

```bash
python main.py generate-video "Ocean waves"
python main.py generate-video "Mountain sunset" --duration 10 --resolution 1920x1080
```

### Viewing the Gallery

```bash
# View all content
python main.py gallery

# View only images
python main.py gallery --type images

# View only videos
python main.py gallery --type videos
```

## Architecture

### Lexer

The lexer (`lexer/lexer.py`) tokenizes source code into a stream of tokens. It recognizes:
- Keywords (let, func, if, else, while, return, print)
- Literals (numbers, strings)
- Identifiers (variable and function names)
- Operators and delimiters

### Parser

The parser (`parser/parser.py`) builds an Abstract Syntax Tree (AST) from the token stream using recursive descent parsing.

### Interpreter

The interpreter (`interpreter/interpreter.py`) executes the AST directly without compilation, providing:
- Variable scoping (global and local)
- Function calls with parameter passing
- Control flow execution

### Compiler

The compiler (`compiler/compiler.py`) translates the AST into bytecode instructions:
- `LOAD_CONST` - Load a constant
- `LOAD_VAR` - Load a variable
- `STORE_VAR` - Store a variable
- `BINARY_ADD/SUB/MUL/DIV` - Binary operations
- `CALL_FUNC` - Call a function
- `JUMP` - Unconditional jump
- `JUMP_IF_FALSE` - Conditional jump
- `RETURN` - Return from function
- `PRINT` - Print value

### Linker

The linker (`linker/linker.py`) combines multiple object files into a single executable:
- Resolves symbol references
- Merges constant pools
- Adjusts instruction offsets

## API Integrations

### Sora2 Video Generation

```python
from api import get_api_manager

api = get_api_manager()
result = api.generate_video(
    prompt="Beautiful nature scene",
    duration=5,
    resolution="1920x1080"
)
```

### Sora Image Generation

```python
from api import get_api_manager

api = get_api_manager()
result = api.generate_image(
    prompt="Artistic portrait",
    size="1024x1024",
    style="vivid"
)
```

## Database

The SQLite database (`database/database.py`) stores:
- **code_snippets** - Saved Codex programs
- **generated_images** - Generated images with metadata
- **generated_videos** - Generated videos with metadata
- **compilation_results** - Compilation history
- **chat_history** - AI assistant conversations

## Gallery System

The gallery (`gallery/gallery.py`) provides:
- Storage and retrieval of generated content
- Search functionality
- Export to JSON
- Display formatted content

## AI Assistant

The AI assistant (`assistant/assistant.py`) offers:
- Interactive chat interface
- Help with Codex syntax
- Code examples and documentation
- Conversation history persistence

## Examples

### Hello World
```codex
print("Hello, World!")
```

### Calculator
```codex
func add(a, b) {
    return a + b
}

let result = add(5, 3)
print(result)
```

### Fibonacci
```codex
func fibonacci(n) {
    if (n < 2) {
        return n
    }
    return fibonacci(n - 1) + fibonacci(n - 2)
}

let i = 0
while (i < 10) {
    print(fibonacci(i))
    i = i + 1
}
```

## Development

### Project Structure
```
/api            - API integrations (Sora2, Image Gen)
/assistant      - AI assistant functionality
/compiler       - Compiler implementation
/database       - SQLite database management
/examples       - Example Codex programs
/gallery        - Gallery system
/interpreter    - Interpreter implementation
/lexer          - Lexical analyzer
/linker         - Object file linker
/parser         - Syntax parser
main.py         - Main entry point
```

### Environment Variables

- `SORA_API_KEY` - API key for Sora2 video generation
- `SORA_IMAGE_API_KEY` - API key for Sora image generation
- `OPENAI_API_KEY` - API key for AI assistant (future)

## Contributing

This repository is managed by Codex for demonstration purposes. The goal is to showcase capabilities for a Product Manager role at OpenAI.

## License

MIT License
