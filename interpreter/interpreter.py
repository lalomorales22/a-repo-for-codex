"""
Interpreter for the Codex Programming Language
Executes AST directly without compilation
"""

from typing import Any, Dict, List, Optional
from parser import *


class ReturnException(Exception):
    """Exception used to implement return statements"""
    def __init__(self, value):
        self.value = value


class Interpreter:
    """Interpreter for Codex language"""
    
    def __init__(self):
        self.global_scope: Dict[str, Any] = {}
        self.call_stack: List[Dict[str, Any]] = []
    
    def get_variable(self, name: str) -> Any:
        """Get variable value from current scope"""
        # Check local scope first
        if self.call_stack:
            local_scope = self.call_stack[-1]
            if name in local_scope:
                return local_scope[name]
        
        # Then check global scope
        if name in self.global_scope:
            return self.global_scope[name]
        
        raise NameError(f"Variable '{name}' not defined")
    
    def set_variable(self, name: str, value: Any):
        """Set variable value in current scope"""
        if self.call_stack:
            self.call_stack[-1][name] = value
        else:
            self.global_scope[name] = value
    
    def interpret(self, node: ASTNode) -> Any:
        """Interpret an AST node"""
        if isinstance(node, ProgramNode):
            return self.interpret_program(node)
        elif isinstance(node, NumberNode):
            return node.value
        elif isinstance(node, StringNode):
            return node.value
        elif isinstance(node, IdentifierNode):
            return self.get_variable(node.name)
        elif isinstance(node, BinaryOpNode):
            return self.interpret_binary_op(node)
        elif isinstance(node, UnaryOpNode):
            return self.interpret_unary_op(node)
        elif isinstance(node, AssignmentNode):
            return self.interpret_assignment(node)
        elif isinstance(node, FunctionCallNode):
            return self.interpret_function_call(node)
        elif isinstance(node, FunctionDefNode):
            return self.interpret_function_def(node)
        elif isinstance(node, IfNode):
            return self.interpret_if(node)
        elif isinstance(node, WhileNode):
            return self.interpret_while(node)
        elif isinstance(node, ReturnNode):
            return self.interpret_return(node)
        elif isinstance(node, PrintNode):
            return self.interpret_print(node)
        else:
            raise RuntimeError(f"Unknown node type: {type(node)}")
    
    def interpret_program(self, node: ProgramNode) -> Any:
        """Interpret a program"""
        result = None
        for statement in node.statements:
            result = self.interpret(statement)
        return result
    
    def interpret_binary_op(self, node: BinaryOpNode) -> Any:
        """Interpret binary operation"""
        left = self.interpret(node.left)
        right = self.interpret(node.right)
        
        if node.operator == '+':
            return left + right
        elif node.operator == '-':
            return left - right
        elif node.operator == '*':
            return left * right
        elif node.operator == '/':
            if right == 0:
                raise RuntimeError("Division by zero")
            return left / right
        elif node.operator == '==':
            return left == right
        elif node.operator == '!=':
            return left != right
        elif node.operator == '<':
            return left < right
        elif node.operator == '>':
            return left > right
        else:
            raise RuntimeError(f"Unknown operator: {node.operator}")
    
    def interpret_unary_op(self, node: UnaryOpNode) -> Any:
        """Interpret unary operation"""
        operand = self.interpret(node.operand)
        
        if node.operator == '+':
            return +operand
        elif node.operator == '-':
            return -operand
        else:
            raise RuntimeError(f"Unknown unary operator: {node.operator}")
    
    def interpret_assignment(self, node: AssignmentNode) -> Any:
        """Interpret variable assignment"""
        value = self.interpret(node.value)
        self.set_variable(node.name, value)
        return value
    
    def interpret_function_call(self, node: FunctionCallNode) -> Any:
        """Interpret function call"""
        func = self.get_variable(node.name)
        
        if not isinstance(func, FunctionDefNode):
            raise RuntimeError(f"'{node.name}' is not a function")
        
        # Evaluate arguments
        args = [self.interpret(arg) for arg in node.arguments]
        
        # Check argument count
        if len(args) != len(func.parameters):
            raise RuntimeError(
                f"Function '{node.name}' expects {len(func.parameters)} arguments, "
                f"got {len(args)}"
            )
        
        # Create new scope for function
        local_scope = dict(zip(func.parameters, args))
        self.call_stack.append(local_scope)
        
        try:
            # Execute function body
            result = None
            for statement in func.body:
                result = self.interpret(statement)
            return result
        except ReturnException as e:
            return e.value
        finally:
            self.call_stack.pop()
    
    def interpret_function_def(self, node: FunctionDefNode) -> None:
        """Interpret function definition"""
        self.set_variable(node.name, node)
    
    def interpret_if(self, node: IfNode) -> Any:
        """Interpret if statement"""
        condition = self.interpret(node.condition)
        
        if condition:
            result = None
            for statement in node.then_body:
                result = self.interpret(statement)
            return result
        elif node.else_body:
            result = None
            for statement in node.else_body:
                result = self.interpret(statement)
            return result
        
        return None
    
    def interpret_while(self, node: WhileNode) -> Any:
        """Interpret while loop"""
        result = None
        while self.interpret(node.condition):
            for statement in node.body:
                result = self.interpret(statement)
        return result
    
    def interpret_return(self, node: ReturnNode) -> None:
        """Interpret return statement"""
        value = None
        if node.value:
            value = self.interpret(node.value)
        raise ReturnException(value)
    
    def interpret_print(self, node: PrintNode) -> None:
        """Interpret print statement"""
        value = self.interpret(node.value)
        print(value)
        return None


def run_code(source: str) -> Any:
    """Convenience function to run Codex code"""
    from lexer import Lexer
    
    lexer = Lexer(source)
    tokens = lexer.tokenize()
    
    parser = Parser(tokens)
    ast = parser.parse()
    
    interpreter = Interpreter()
    return interpreter.interpret(ast)
