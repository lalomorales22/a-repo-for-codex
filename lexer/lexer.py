"""
Lexer for the Codex Programming Language
Tokenizes source code into a stream of tokens
"""

import re
from enum import Enum, auto
from dataclasses import dataclass
from typing import List, Optional


class TokenType(Enum):
    """Token types for the Codex language"""
    # Keywords
    LET = auto()
    FUNC = auto()
    IF = auto()
    ELSE = auto()
    WHILE = auto()
    RETURN = auto()
    PRINT = auto()
    
    # Literals
    NUMBER = auto()
    STRING = auto()
    IDENTIFIER = auto()
    
    # Operators
    PLUS = auto()
    MINUS = auto()
    MULTIPLY = auto()
    DIVIDE = auto()
    ASSIGN = auto()
    EQUALS = auto()
    NOT_EQUALS = auto()
    LESS_THAN = auto()
    GREATER_THAN = auto()
    
    # Delimiters
    LPAREN = auto()
    RPAREN = auto()
    LBRACE = auto()
    RBRACE = auto()
    SEMICOLON = auto()
    COMMA = auto()
    
    # Special
    EOF = auto()
    NEWLINE = auto()


@dataclass
class Token:
    """Represents a single token"""
    type: TokenType
    value: str
    line: int
    column: int


class Lexer:
    """Lexical analyzer for Codex language"""
    
    KEYWORDS = {
        'let': TokenType.LET,
        'func': TokenType.FUNC,
        'if': TokenType.IF,
        'else': TokenType.ELSE,
        'while': TokenType.WHILE,
        'return': TokenType.RETURN,
        'print': TokenType.PRINT,
    }
    
    def __init__(self, source: str):
        self.source = source
        self.pos = 0
        self.line = 1
        self.column = 1
        self.tokens: List[Token] = []
    
    def current_char(self) -> Optional[str]:
        """Get current character"""
        if self.pos >= len(self.source):
            return None
        return self.source[self.pos]
    
    def peek_char(self, offset: int = 1) -> Optional[str]:
        """Peek ahead at character"""
        pos = self.pos + offset
        if pos >= len(self.source):
            return None
        return self.source[pos]
    
    def advance(self):
        """Move to next character"""
        if self.pos < len(self.source):
            if self.source[self.pos] == '\n':
                self.line += 1
                self.column = 1
            else:
                self.column += 1
            self.pos += 1
    
    def skip_whitespace(self):
        """Skip whitespace except newlines"""
        while self.current_char() and self.current_char() in ' \t\r':
            self.advance()
    
    def skip_comment(self):
        """Skip comments starting with #"""
        if self.current_char() == '#':
            while self.current_char() and self.current_char() != '\n':
                self.advance()
    
    def read_number(self) -> Token:
        """Read a number token"""
        start_col = self.column
        num_str = ''
        while self.current_char() and (self.current_char().isdigit() or self.current_char() == '.'):
            num_str += self.current_char()
            self.advance()
        return Token(TokenType.NUMBER, num_str, self.line, start_col)
    
    def read_string(self) -> Token:
        """Read a string token"""
        start_col = self.column
        self.advance()  # Skip opening quote
        string_val = ''
        while self.current_char() and self.current_char() != '"':
            if self.current_char() == '\\':
                self.advance()
                if self.current_char():
                    string_val += self.current_char()
                    self.advance()
            else:
                string_val += self.current_char()
                self.advance()
        self.advance()  # Skip closing quote
        return Token(TokenType.STRING, string_val, self.line, start_col)
    
    def read_identifier(self) -> Token:
        """Read an identifier or keyword"""
        start_col = self.column
        identifier = ''
        while self.current_char() and (self.current_char().isalnum() or self.current_char() == '_'):
            identifier += self.current_char()
            self.advance()
        
        token_type = self.KEYWORDS.get(identifier, TokenType.IDENTIFIER)
        return Token(token_type, identifier, self.line, start_col)
    
    def tokenize(self) -> List[Token]:
        """Tokenize the entire source code"""
        while self.current_char():
            self.skip_whitespace()
            
            if not self.current_char():
                break
            
            if self.current_char() == '#':
                self.skip_comment()
                continue
            
            if self.current_char() == '\n':
                token = Token(TokenType.NEWLINE, '\\n', self.line, self.column)
                self.tokens.append(token)
                self.advance()
                continue
            
            if self.current_char().isdigit():
                self.tokens.append(self.read_number())
                continue
            
            if self.current_char() == '"':
                self.tokens.append(self.read_string())
                continue
            
            if self.current_char().isalpha() or self.current_char() == '_':
                self.tokens.append(self.read_identifier())
                continue
            
            # Single character tokens
            char = self.current_char()
            col = self.column
            
            if char == '+':
                self.tokens.append(Token(TokenType.PLUS, char, self.line, col))
            elif char == '-':
                self.tokens.append(Token(TokenType.MINUS, char, self.line, col))
            elif char == '*':
                self.tokens.append(Token(TokenType.MULTIPLY, char, self.line, col))
            elif char == '/':
                self.tokens.append(Token(TokenType.DIVIDE, char, self.line, col))
            elif char == '(':
                self.tokens.append(Token(TokenType.LPAREN, char, self.line, col))
            elif char == ')':
                self.tokens.append(Token(TokenType.RPAREN, char, self.line, col))
            elif char == '{':
                self.tokens.append(Token(TokenType.LBRACE, char, self.line, col))
            elif char == '}':
                self.tokens.append(Token(TokenType.RBRACE, char, self.line, col))
            elif char == ';':
                self.tokens.append(Token(TokenType.SEMICOLON, char, self.line, col))
            elif char == ',':
                self.tokens.append(Token(TokenType.COMMA, char, self.line, col))
            elif char == '=':
                if self.peek_char() == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.EQUALS, '==', self.line, col))
                else:
                    self.tokens.append(Token(TokenType.ASSIGN, char, self.line, col))
            elif char == '!':
                if self.peek_char() == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.NOT_EQUALS, '!=', self.line, col))
            elif char == '<':
                self.tokens.append(Token(TokenType.LESS_THAN, char, self.line, col))
            elif char == '>':
                self.tokens.append(Token(TokenType.GREATER_THAN, char, self.line, col))
            
            self.advance()
        
        self.tokens.append(Token(TokenType.EOF, '', self.line, self.column))
        return self.tokens
