#!/usr/bin/env python3
"""
Codex - A Programming Language Project
Main entry point for the Codex application
"""

import sys
import argparse
from pathlib import Path


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Codex - A complete programming language implementation',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py run examples/hello.cdx        # Run a Codex file
  python main.py compile examples/hello.cdx    # Compile to object code
  python main.py repl                          # Start interactive REPL
  python main.py assistant                     # Start AI assistant
  python main.py gallery                       # View gallery
  python main.py generate-image "sunset"       # Generate an image
  python main.py generate-video "ocean waves"  # Generate a video
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # Run command
    run_parser = subparsers.add_parser('run', help='Run a Codex source file')
    run_parser.add_argument('file', help='Codex source file to run')
    
    # Compile command
    compile_parser = subparsers.add_parser('compile', help='Compile a Codex source file')
    compile_parser.add_argument('file', help='Codex source file to compile')
    compile_parser.add_argument('-o', '--output', help='Output file for object code')
    
    # REPL command
    subparsers.add_parser('repl', help='Start interactive REPL')
    
    # Assistant command
    subparsers.add_parser('assistant', help='Start AI assistant')
    
    # Gallery command
    gallery_parser = subparsers.add_parser('gallery', help='View gallery')
    gallery_parser.add_argument('--type', choices=['all', 'images', 'videos'], 
                               default='all', help='Type of content to display')
    
    # Generate image command
    image_parser = subparsers.add_parser('generate-image', help='Generate an image')
    image_parser.add_argument('prompt', help='Image generation prompt')
    image_parser.add_argument('--size', default='1024x1024', help='Image size')
    image_parser.add_argument('--style', default='natural', help='Image style')
    
    # Generate video command
    video_parser = subparsers.add_parser('generate-video', help='Generate a video')
    video_parser.add_argument('prompt', help='Video generation prompt')
    video_parser.add_argument('--duration', type=int, default=5, help='Duration in seconds')
    video_parser.add_argument('--resolution', default='1920x1080', help='Video resolution')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 0
    
    try:
        if args.command == 'run':
            return cmd_run(args.file)
        elif args.command == 'compile':
            return cmd_compile(args.file, args.output)
        elif args.command == 'repl':
            return cmd_repl()
        elif args.command == 'assistant':
            return cmd_assistant()
        elif args.command == 'gallery':
            return cmd_gallery(args.type)
        elif args.command == 'generate-image':
            return cmd_generate_image(args.prompt, args.size, args.style)
        elif args.command == 'generate-video':
            return cmd_generate_video(args.prompt, args.duration, args.resolution)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    
    return 0


def cmd_run(file_path: str) -> int:
    """Run a Codex source file"""
    from interpreter import run_code
    
    path = Path(file_path)
    if not path.exists():
        print(f"Error: File '{file_path}' not found")
        return 1
    
    print(f"Running {file_path}...\n")
    source = path.read_text()
    
    try:
        run_code(source)
        return 0
    except Exception as e:
        print(f"Runtime error: {e}", file=sys.stderr)
        return 1


def cmd_compile(file_path: str, output_path: str = None) -> int:
    """Compile a Codex source file"""
    from lexer import Lexer
    from parser import Parser
    from compiler import Compiler
    from database import get_database
    
    path = Path(file_path)
    if not path.exists():
        print(f"Error: File '{file_path}' not found")
        return 1
    
    print(f"Compiling {file_path}...\n")
    source = path.read_text()
    
    try:
        # Compile
        lexer = Lexer(source)
        tokens = lexer.tokenize()
        parser = Parser(tokens)
        ast = parser.parse()
        compiler = Compiler()
        compiler.compile(ast)
        
        # Generate object code
        object_code = compiler.to_object_code()
        
        # Save compilation result to database
        db = get_database()
        db.save_compilation_result(source, object_code, success=True)
        
        # Output
        if output_path:
            Path(output_path).write_text(object_code)
            print(f"Object code written to {output_path}")
        else:
            print(object_code)
        
        return 0
    except Exception as e:
        print(f"Compilation error: {e}", file=sys.stderr)
        
        # Save failed compilation to database
        db = get_database()
        db.save_compilation_result(source, success=False, error_message=str(e))
        
        return 1


def cmd_repl() -> int:
    """Start interactive REPL"""
    from interpreter import Interpreter
    from lexer import Lexer
    from parser import Parser
    
    print("\n" + "="*60)
    print("CODEX REPL - Interactive Interpreter")
    print("="*60)
    print("Type 'exit' or 'quit' to exit")
    print("Type 'help' for language syntax\n")
    
    interpreter = Interpreter()
    
    while True:
        try:
            line = input(">>> ").strip()
            
            if not line:
                continue
            
            if line.lower() in ('exit', 'quit'):
                print("\nGoodbye!\n")
                break
            
            if line.lower() == 'help':
                print("""
Codex Language Syntax:
  let x = 10              # Variable declaration
  let name = "text"       # String variable
  print(x)                # Print statement
  
  func add(a, b) {        # Function definition
      return a + b
  }
  
  if (x > 5) { ... }      # Conditional
  while (x < 10) { ... }  # Loop
                """)
                continue
            
            # Parse and execute
            lexer = Lexer(line)
            tokens = lexer.tokenize()
            parser = Parser(tokens)
            ast = parser.parse()
            result = interpreter.interpret(ast)
            
            if result is not None:
                print(result)
        
        except KeyboardInterrupt:
            print("\n\nGoodbye!\n")
            break
        except Exception as e:
            print(f"Error: {e}")
    
    return 0


def cmd_assistant() -> int:
    """Start AI assistant"""
    from assistant import get_assistant
    
    assistant = get_assistant()
    assistant.interactive_session()
    return 0


def cmd_gallery(content_type: str = 'all') -> int:
    """View gallery"""
    from gallery import get_gallery
    
    gallery = get_gallery()
    gallery.display_gallery(content_type)
    return 0


def cmd_generate_image(prompt: str, size: str, style: str) -> int:
    """Generate an image"""
    from api import get_api_manager
    from gallery import get_gallery
    
    print(f"\nGenerating image...")
    api = get_api_manager()
    result = api.generate_image(prompt, size=size, style=style)
    
    if result.success:
        print(f"\n✅ Image generated successfully!")
        print(f"URL: {result.url}")
        
        # Add to gallery
        gallery = get_gallery()
        img_id = gallery.add_image(prompt, result.url, metadata=result.metadata)
        print(f"Added to gallery with ID: {img_id}\n")
        return 0
    else:
        print(f"\n❌ Error: {result.error}\n")
        return 1


def cmd_generate_video(prompt: str, duration: int, resolution: str) -> int:
    """Generate a video"""
    from api import get_api_manager
    from gallery import get_gallery
    
    print(f"\nGenerating video...")
    api = get_api_manager()
    result = api.generate_video(prompt, duration=duration, resolution=resolution)
    
    if result.success:
        print(f"\n✅ Video generated successfully!")
        print(f"URL: {result.url}")
        
        # Add to gallery
        gallery = get_gallery()
        vid_id = gallery.add_video(prompt, result.url, metadata=result.metadata)
        print(f"Added to gallery with ID: {vid_id}\n")
        return 0
    else:
        print(f"\n❌ Error: {result.error}\n")
        return 1


if __name__ == '__main__':
    sys.exit(main())
