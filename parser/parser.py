"""
Parser for the Codex Programming Language
Builds an Abstract Syntax Tree (AST) from tokens
"""

from dataclasses import dataclass
from typing import List, Optional, Any
from lexer import Token, TokenType


# AST Node Classes
@dataclass
class ASTNode:
    """Base class for AST nodes"""
    pass


@dataclass
class NumberNode(ASTNode):
    """Numeric literal"""
    value: float


@dataclass
class StringNode(ASTNode):
    """String literal"""
    value: str


@dataclass
class IdentifierNode(ASTNode):
    """Variable or function identifier"""
    name: str


@dataclass
class BinaryOpNode(ASTNode):
    """Binary operation (e.g., a + b)"""
    left: ASTNode
    operator: str
    right: ASTNode


@dataclass
class UnaryOpNode(ASTNode):
    """Unary operation (e.g., -x)"""
    operator: str
    operand: ASTNode


@dataclass
class AssignmentNode(ASTNode):
    """Variable assignment"""
    name: str
    value: ASTNode


@dataclass
class FunctionCallNode(ASTNode):
    """Function call"""
    name: str
    arguments: List[ASTNode]


@dataclass
class FunctionDefNode(ASTNode):
    """Function definition"""
    name: str
    parameters: List[str]
    body: List[ASTNode]


@dataclass
class IfNode(ASTNode):
    """If statement"""
    condition: ASTNode
    then_body: List[ASTNode]
    else_body: Optional[List[ASTNode]]


@dataclass
class WhileNode(ASTNode):
    """While loop"""
    condition: ASTNode
    body: List[ASTNode]


@dataclass
class ReturnNode(ASTNode):
    """Return statement"""
    value: Optional[ASTNode]


@dataclass
class PrintNode(ASTNode):
    """Print statement"""
    value: ASTNode


@dataclass
class ProgramNode(ASTNode):
    """Root program node"""
    statements: List[ASTNode]


class Parser:
    """Recursive descent parser for Codex language"""
    
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0
    
    def current_token(self) -> Token:
        """Get current token"""
        if self.pos >= len(self.tokens):
            return self.tokens[-1]  # Return EOF
        return self.tokens[self.pos]
    
    def peek_token(self, offset: int = 1) -> Token:
        """Peek ahead at token"""
        pos = self.pos + offset
        if pos >= len(self.tokens):
            return self.tokens[-1]
        return self.tokens[pos]
    
    def advance(self):
        """Move to next token"""
        if self.pos < len(self.tokens):
            self.pos += 1
    
    def expect(self, token_type: TokenType) -> Token:
        """Expect a specific token type"""
        token = self.current_token()
        if token.type != token_type:
            raise SyntaxError(f"Expected {token_type}, got {token.type} at line {token.line}")
        self.advance()
        return token
    
    def skip_newlines(self):
        """Skip newline tokens"""
        while self.current_token().type == TokenType.NEWLINE:
            self.advance()
    
    def parse(self) -> ProgramNode:
        """Parse the entire program"""
        statements = []
        self.skip_newlines()
        
        while self.current_token().type != TokenType.EOF:
            stmt = self.parse_statement()
            if stmt:
                statements.append(stmt)
            self.skip_newlines()
        
        return ProgramNode(statements)
    
    def parse_statement(self) -> Optional[ASTNode]:
        """Parse a single statement"""
        self.skip_newlines()
        token = self.current_token()
        
        if token.type == TokenType.LET:
            return self.parse_assignment()
        elif token.type == TokenType.FUNC:
            return self.parse_function_def()
        elif token.type == TokenType.IF:
            return self.parse_if_statement()
        elif token.type == TokenType.WHILE:
            return self.parse_while_statement()
        elif token.type == TokenType.RETURN:
            return self.parse_return_statement()
        elif token.type == TokenType.PRINT:
            return self.parse_print_statement()
        elif token.type == TokenType.IDENTIFIER:
            # Could be assignment or function call
            if self.peek_token().type == TokenType.ASSIGN:
                return self.parse_assignment()
            else:
                return self.parse_expression()
        else:
            return self.parse_expression()
    
    def parse_assignment(self) -> AssignmentNode:
        """Parse variable assignment"""
        if self.current_token().type == TokenType.LET:
            self.advance()
        
        name = self.expect(TokenType.IDENTIFIER).value
        self.expect(TokenType.ASSIGN)
        value = self.parse_expression()
        
        if self.current_token().type == TokenType.SEMICOLON:
            self.advance()
        
        return AssignmentNode(name, value)
    
    def parse_function_def(self) -> FunctionDefNode:
        """Parse function definition"""
        self.expect(TokenType.FUNC)
        name = self.expect(TokenType.IDENTIFIER).value
        self.expect(TokenType.LPAREN)
        
        parameters = []
        while self.current_token().type != TokenType.RPAREN:
            param = self.expect(TokenType.IDENTIFIER).value
            parameters.append(param)
            if self.current_token().type == TokenType.COMMA:
                self.advance()
        
        self.expect(TokenType.RPAREN)
        self.expect(TokenType.LBRACE)
        self.skip_newlines()
        
        body = []
        while self.current_token().type != TokenType.RBRACE:
            stmt = self.parse_statement()
            if stmt:
                body.append(stmt)
            self.skip_newlines()
        
        self.expect(TokenType.RBRACE)
        return FunctionDefNode(name, parameters, body)
    
    def parse_if_statement(self) -> IfNode:
        """Parse if statement"""
        self.expect(TokenType.IF)
        self.expect(TokenType.LPAREN)
        condition = self.parse_expression()
        self.expect(TokenType.RPAREN)
        self.expect(TokenType.LBRACE)
        self.skip_newlines()
        
        then_body = []
        while self.current_token().type != TokenType.RBRACE:
            stmt = self.parse_statement()
            if stmt:
                then_body.append(stmt)
            self.skip_newlines()
        
        self.expect(TokenType.RBRACE)
        
        else_body = None
        if self.current_token().type == TokenType.ELSE:
            self.advance()
            self.expect(TokenType.LBRACE)
            self.skip_newlines()
            
            else_body = []
            while self.current_token().type != TokenType.RBRACE:
                stmt = self.parse_statement()
                if stmt:
                    else_body.append(stmt)
                self.skip_newlines()
            
            self.expect(TokenType.RBRACE)
        
        return IfNode(condition, then_body, else_body)
    
    def parse_while_statement(self) -> WhileNode:
        """Parse while loop"""
        self.expect(TokenType.WHILE)
        self.expect(TokenType.LPAREN)
        condition = self.parse_expression()
        self.expect(TokenType.RPAREN)
        self.expect(TokenType.LBRACE)
        self.skip_newlines()
        
        body = []
        while self.current_token().type != TokenType.RBRACE:
            stmt = self.parse_statement()
            if stmt:
                body.append(stmt)
            self.skip_newlines()
        
        self.expect(TokenType.RBRACE)
        return WhileNode(condition, body)
    
    def parse_return_statement(self) -> ReturnNode:
        """Parse return statement"""
        self.expect(TokenType.RETURN)
        
        value = None
        if self.current_token().type not in (TokenType.SEMICOLON, TokenType.NEWLINE):
            value = self.parse_expression()
        
        if self.current_token().type == TokenType.SEMICOLON:
            self.advance()
        
        return ReturnNode(value)
    
    def parse_print_statement(self) -> PrintNode:
        """Parse print statement"""
        self.expect(TokenType.PRINT)
        self.expect(TokenType.LPAREN)
        value = self.parse_expression()
        self.expect(TokenType.RPAREN)
        
        if self.current_token().type == TokenType.SEMICOLON:
            self.advance()
        
        return PrintNode(value)
    
    def parse_expression(self) -> ASTNode:
        """Parse expression"""
        return self.parse_comparison()
    
    def parse_comparison(self) -> ASTNode:
        """Parse comparison expression"""
        left = self.parse_term()
        
        while self.current_token().type in (TokenType.EQUALS, TokenType.NOT_EQUALS,
                                            TokenType.LESS_THAN, TokenType.GREATER_THAN):
            op = self.current_token().value
            self.advance()
            right = self.parse_term()
            left = BinaryOpNode(left, op, right)
        
        return left
    
    def parse_term(self) -> ASTNode:
        """Parse additive expression"""
        left = self.parse_factor()
        
        while self.current_token().type in (TokenType.PLUS, TokenType.MINUS):
            op = self.current_token().value
            self.advance()
            right = self.parse_factor()
            left = BinaryOpNode(left, op, right)
        
        return left
    
    def parse_factor(self) -> ASTNode:
        """Parse multiplicative expression"""
        left = self.parse_unary()
        
        while self.current_token().type in (TokenType.MULTIPLY, TokenType.DIVIDE):
            op = self.current_token().value
            self.advance()
            right = self.parse_unary()
            left = BinaryOpNode(left, op, right)
        
        return left
    
    def parse_unary(self) -> ASTNode:
        """Parse unary expression"""
        if self.current_token().type in (TokenType.PLUS, TokenType.MINUS):
            op = self.current_token().value
            self.advance()
            operand = self.parse_unary()
            return UnaryOpNode(op, operand)
        
        return self.parse_primary()
    
    def parse_primary(self) -> ASTNode:
        """Parse primary expression"""
        token = self.current_token()
        
        if token.type == TokenType.NUMBER:
            self.advance()
            return NumberNode(float(token.value))
        
        elif token.type == TokenType.STRING:
            self.advance()
            return StringNode(token.value)
        
        elif token.type == TokenType.IDENTIFIER:
            name = token.value
            self.advance()
            
            # Check if it's a function call
            if self.current_token().type == TokenType.LPAREN:
                self.advance()
                arguments = []
                
                while self.current_token().type != TokenType.RPAREN:
                    arg = self.parse_expression()
                    arguments.append(arg)
                    
                    if self.current_token().type == TokenType.COMMA:
                        self.advance()
                
                self.expect(TokenType.RPAREN)
                return FunctionCallNode(name, arguments)
            
            return IdentifierNode(name)
        
        elif token.type == TokenType.LPAREN:
            self.advance()
            expr = self.parse_expression()
            self.expect(TokenType.RPAREN)
            return expr
        
        raise SyntaxError(f"Unexpected token {token.type} at line {token.line}")
