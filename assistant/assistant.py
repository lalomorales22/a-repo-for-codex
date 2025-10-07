"""
AI Assistant for the Codex project
Provides interactive AI-powered assistance
"""

import os
from typing import List, Dict, Optional, Any
from dataclasses import dataclass


@dataclass
class Message:
    """Represents a chat message"""
    role: str  # 'user' or 'assistant'
    content: str


class AIAssistant:
    """AI-powered assistant for Codex"""
    
    def __init__(self, database=None):
        from database import get_database
        self.db = database or get_database()
        self.conversation_history: List[Message] = []
        self.api_key = os.environ.get('OPENAI_API_KEY')
    
    def chat(self, user_message: str) -> str:
        """
        Send a message to the AI assistant
        
        Args:
            user_message: The user's message
        
        Returns:
            The assistant's response
        """
        # Add user message to history
        self.conversation_history.append(Message('user', user_message))
        
        # Generate response (placeholder implementation)
        # In a real implementation, this would call OpenAI's API
        assistant_response = self._generate_response(user_message)
        
        # Add assistant response to history
        self.conversation_history.append(Message('assistant', assistant_response))
        
        # Save to database
        self.db.save_chat_message(user_message, assistant_response)
        
        return assistant_response
    
    def _generate_response(self, user_message: str) -> str:
        """
        Generate a response to the user's message
        This is a placeholder implementation
        """
        # Parse common commands
        lower_msg = user_message.lower()
        
        if 'help' in lower_msg or 'what can you do' in lower_msg:
            return """I'm the Codex AI Assistant! I can help you with:

📝 Writing and debugging Codex code
🎬 Generating videos with Sora2
🖼️  Creating images with Sora
📚 Understanding the Codex language syntax
🔧 Compiling and interpreting code
💡 Providing programming suggestions and best practices

Just ask me anything about Codex or request content generation!"""
        
        elif 'compile' in lower_msg or 'compile code' in lower_msg:
            return """To compile Codex code, use:

```python
from lexer import Lexer
from parser import Parser
from compiler import Compiler

# Your Codex source code
source = '''
let x = 10
print(x)
'''

# Compile it
lexer = Lexer(source)
tokens = lexer.tokenize()
parser = Parser(tokens)
ast = parser.parse()
compiler = Compiler()
compiler.compile(ast)

# Get object code
object_code = compiler.to_object_code()
print(object_code)
```"""
        
        elif 'interpret' in lower_msg or 'run' in lower_msg:
            return """To run Codex code directly, use the interpreter:

```python
from interpreter import run_code

# Your Codex source code
source = '''
let x = 10
let y = 20
print(x + y)
'''

# Run it
result = run_code(source)
```"""
        
        elif 'video' in lower_msg or 'sora2' in lower_msg:
            return """To generate a video with Sora2:

```python
from api import get_api_manager

api = get_api_manager()
result = api.generate_video(
    prompt="A beautiful sunset over mountains",
    duration=5,
    resolution="1920x1080"
)

if result.success:
    print(f"Video URL: {result.url}")
else:
    print(f"Error: {result.error}")
```"""
        
        elif 'image' in lower_msg or 'picture' in lower_msg:
            return """To generate an image with Sora:

```python
from api import get_api_manager

api = get_api_manager()
result = api.generate_image(
    prompt="A futuristic city at night",
    size="1024x1024",
    style="vivid"
)

if result.success:
    print(f"Image URL: {result.url}")
else:
    print(f"Error: {result.error}")
```"""
        
        elif 'gallery' in lower_msg:
            return """To view the gallery:

```python
from gallery import get_gallery

gallery = get_gallery()
gallery.display_gallery()  # Show all content
gallery.display_gallery("images")  # Show only images
gallery.display_gallery("videos")  # Show only videos
```"""
        
        elif 'syntax' in lower_msg or 'example' in lower_msg:
            return """Here's a Codex language syntax example:

```codex
# Variables
let x = 10
let name = "Codex"

# Functions
func add(a, b) {
    return a + b
}

let result = add(5, 3)
print(result)

# Conditionals
if (x > 5) {
    print("x is greater than 5")
} else {
    print("x is 5 or less")
}

# Loops
let i = 0
while (i < 5) {
    print(i)
    i = i + 1
}
```"""
        
        else:
            return f"""I understand you're asking about: "{user_message}"

I'm a placeholder AI assistant. In a production environment, I would use OpenAI's API to provide intelligent responses.

For now, try asking me about:
- Compiling Codex code
- Running the interpreter
- Generating videos or images
- Viewing the gallery
- Codex syntax examples

Or type 'help' for more information!"""
    
    def get_conversation_history(self) -> List[Message]:
        """Get the current conversation history"""
        return self.conversation_history
    
    def clear_conversation(self):
        """Clear the conversation history"""
        self.conversation_history = []
    
    def load_chat_history(self, limit: int = 10):
        """Load previous chat history from database"""
        history = self.db.get_chat_history(limit)
        for entry in reversed(history):
            self.conversation_history.append(Message('user', entry['user_message']))
            self.conversation_history.append(Message('assistant', entry['assistant_message']))
    
    def interactive_session(self):
        """Start an interactive chat session"""
        print("\n" + "="*60)
        print("🤖 CODEX AI ASSISTANT")
        print("="*60)
        print("Type 'exit' or 'quit' to end the session")
        print("Type 'clear' to clear conversation history")
        print("Type 'help' for available commands\n")
        
        while True:
            try:
                user_input = input("You: ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ('exit', 'quit'):
                    print("\nGoodbye! 👋\n")
                    break
                
                if user_input.lower() == 'clear':
                    self.clear_conversation()
                    print("\n[Conversation history cleared]\n")
                    continue
                
                response = self.chat(user_input)
                print(f"\nAssistant: {response}\n")
                
            except KeyboardInterrupt:
                print("\n\nGoodbye! 👋\n")
                break
            except Exception as e:
                print(f"\nError: {e}\n")


# Singleton instance
_assistant_instance = None

def get_assistant() -> AIAssistant:
    """Get or create assistant singleton instance"""
    global _assistant_instance
    if _assistant_instance is None:
        _assistant_instance = AIAssistant()
    return _assistant_instance
