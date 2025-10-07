# Quick Start Guide

## Installation

No installation required! The project uses only Python standard library.

```bash
git clone https://github.com/lalomorales22/a-repo-for-codex.git
cd a-repo-for-codex
```

## Quick Examples

### 1. Run a Program
```bash
python main.py run examples/hello.cdx
```

### 2. Try the Interactive REPL
```bash
python main.py repl
```

Then type:
```codex
let x = 10
let y = 20
print(x + y)
```

### 3. Compile Code
```bash
python main.py compile examples/calculator.cdx
```

### 4. Generate Content

Generate an image:
```bash
python main.py generate-image "Beautiful mountain landscape at sunset"
```

Generate a video:
```bash
python main.py generate-video "Waves crashing on a beach"
```

### 5. View Your Gallery
```bash
python main.py gallery
```

### 6. Chat with AI Assistant
```bash
python main.py assistant
```

Try asking:
- "help"
- "show me syntax examples"
- "how do I compile code?"
- "how do I generate a video?"

## Available Examples

Run any of these examples:

```bash
python main.py run examples/hello.cdx       # Hello World
python main.py run examples/calculator.cdx  # Calculator functions
python main.py run examples/fibonacci.cdx   # Fibonacci sequence
python main.py run examples/factorial.cdx   # Factorial calculation
python main.py run examples/loops.cdx       # Loop examples
```

## Full Command Reference

```bash
# Interpreter
python main.py run <file>                    # Run a Codex file
python main.py repl                          # Interactive REPL

# Compiler
python main.py compile <file>                # Compile to object code
python main.py compile <file> -o <output>    # Save to file

# Content Generation
python main.py generate-image <prompt>       # Generate image
python main.py generate-video <prompt>       # Generate video

# Gallery
python main.py gallery                       # View all
python main.py gallery --type images         # Images only
python main.py gallery --type videos         # Videos only

# AI Assistant
python main.py assistant                     # Start chat
```

## What's Included?

- ✅ Complete programming language (Codex)
- ✅ Lexer, Parser, Compiler, Interpreter
- ✅ Object code generation and linker
- ✅ Sora2 API integration for video generation
- ✅ Sora Image API integration
- ✅ Gallery system with SQLite database
- ✅ AI Assistant for help and guidance
- ✅ Example programs
- ✅ Complete documentation

## Learn More

See [DOCUMENTATION.md](DOCUMENTATION.md) for complete language reference and API documentation.
