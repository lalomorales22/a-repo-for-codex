"""
Compiler for the Codex Programming Language
Compiles AST to bytecode/object code
"""

from typing import List, Any, Dict
from dataclasses import dataclass
from parser import *


@dataclass
class Instruction:
    """Represents a single bytecode instruction"""
    opcode: str
    arg: Any = None
    
    def __str__(self):
        if self.arg is not None:
            return f"{self.opcode} {self.arg}"
        return self.opcode


class Compiler:
    """Compiler for Codex language"""
    
    # Opcodes
    LOAD_CONST = "LOAD_CONST"
    LOAD_VAR = "LOAD_VAR"
    STORE_VAR = "STORE_VAR"
    BINARY_ADD = "BINARY_ADD"
    BINARY_SUB = "BINARY_SUB"
    BINARY_MUL = "BINARY_MUL"
    BINARY_DIV = "BINARY_DIV"
    BINARY_EQ = "BINARY_EQ"
    BINARY_NEQ = "BINARY_NEQ"
    BINARY_LT = "BINARY_LT"
    BINARY_GT = "BINARY_GT"
    UNARY_PLUS = "UNARY_PLUS"
    UNARY_MINUS = "UNARY_MINUS"
    CALL_FUNC = "CALL_FUNC"
    RETURN = "RETURN"
    JUMP = "JUMP"
    JUMP_IF_FALSE = "JUMP_IF_FALSE"
    PRINT = "PRINT"
    POP = "POP"
    
    def __init__(self):
        self.instructions: List[Instruction] = []
        self.constants: List[Any] = []
        self.functions: Dict[str, List[Instruction]] = {}
    
    def add_instruction(self, opcode: str, arg: Any = None):
        """Add an instruction to the bytecode"""
        self.instructions.append(Instruction(opcode, arg))
    
    def add_constant(self, value: Any) -> int:
        """Add a constant to the constant pool"""
        if value not in self.constants:
            self.constants.append(value)
        return self.constants.index(value)
    
    def compile(self, node: ASTNode) -> List[Instruction]:
        """Compile an AST node to bytecode"""
        if isinstance(node, ProgramNode):
            return self.compile_program(node)
        elif isinstance(node, NumberNode):
            return self.compile_number(node)
        elif isinstance(node, StringNode):
            return self.compile_string(node)
        elif isinstance(node, IdentifierNode):
            return self.compile_identifier(node)
        elif isinstance(node, BinaryOpNode):
            return self.compile_binary_op(node)
        elif isinstance(node, UnaryOpNode):
            return self.compile_unary_op(node)
        elif isinstance(node, AssignmentNode):
            return self.compile_assignment(node)
        elif isinstance(node, FunctionCallNode):
            return self.compile_function_call(node)
        elif isinstance(node, FunctionDefNode):
            return self.compile_function_def(node)
        elif isinstance(node, IfNode):
            return self.compile_if(node)
        elif isinstance(node, WhileNode):
            return self.compile_while(node)
        elif isinstance(node, ReturnNode):
            return self.compile_return(node)
        elif isinstance(node, PrintNode):
            return self.compile_print(node)
        else:
            raise RuntimeError(f"Unknown node type: {type(node)}")
    
    def compile_program(self, node: ProgramNode) -> List[Instruction]:
        """Compile a program"""
        for statement in node.statements:
            self.compile(statement)
        return self.instructions
    
    def compile_number(self, node: NumberNode) -> List[Instruction]:
        """Compile a number literal"""
        const_idx = self.add_constant(node.value)
        self.add_instruction(self.LOAD_CONST, const_idx)
        return self.instructions
    
    def compile_string(self, node: StringNode) -> List[Instruction]:
        """Compile a string literal"""
        const_idx = self.add_constant(node.value)
        self.add_instruction(self.LOAD_CONST, const_idx)
        return self.instructions
    
    def compile_identifier(self, node: IdentifierNode) -> List[Instruction]:
        """Compile an identifier (variable reference)"""
        self.add_instruction(self.LOAD_VAR, node.name)
        return self.instructions
    
    def compile_binary_op(self, node: BinaryOpNode) -> List[Instruction]:
        """Compile a binary operation"""
        self.compile(node.left)
        self.compile(node.right)
        
        op_map = {
            '+': self.BINARY_ADD,
            '-': self.BINARY_SUB,
            '*': self.BINARY_MUL,
            '/': self.BINARY_DIV,
            '==': self.BINARY_EQ,
            '!=': self.BINARY_NEQ,
            '<': self.BINARY_LT,
            '>': self.BINARY_GT,
        }
        
        opcode = op_map.get(node.operator)
        if opcode:
            self.add_instruction(opcode)
        else:
            raise RuntimeError(f"Unknown operator: {node.operator}")
        
        return self.instructions
    
    def compile_unary_op(self, node: UnaryOpNode) -> List[Instruction]:
        """Compile a unary operation"""
        self.compile(node.operand)
        
        if node.operator == '+':
            self.add_instruction(self.UNARY_PLUS)
        elif node.operator == '-':
            self.add_instruction(self.UNARY_MINUS)
        else:
            raise RuntimeError(f"Unknown unary operator: {node.operator}")
        
        return self.instructions
    
    def compile_assignment(self, node: AssignmentNode) -> List[Instruction]:
        """Compile a variable assignment"""
        self.compile(node.value)
        self.add_instruction(self.STORE_VAR, node.name)
        return self.instructions
    
    def compile_function_call(self, node: FunctionCallNode) -> List[Instruction]:
        """Compile a function call"""
        # Compile arguments
        for arg in node.arguments:
            self.compile(arg)
        
        # Call function
        self.add_instruction(self.CALL_FUNC, (node.name, len(node.arguments)))
        return self.instructions
    
    def compile_function_def(self, node: FunctionDefNode) -> List[Instruction]:
        """Compile a function definition"""
        # Store function in function table
        func_compiler = Compiler()
        for statement in node.body:
            func_compiler.compile(statement)
        
        self.functions[node.name] = func_compiler.instructions
        return self.instructions
    
    def compile_if(self, node: IfNode) -> List[Instruction]:
        """Compile an if statement"""
        # Compile condition
        self.compile(node.condition)
        
        # Jump if false
        jump_if_false_idx = len(self.instructions)
        self.add_instruction(self.JUMP_IF_FALSE, None)  # Placeholder
        
        # Compile then body
        for statement in node.then_body:
            self.compile(statement)
        
        # Jump to end (skip else)
        jump_to_end_idx = len(self.instructions)
        self.add_instruction(self.JUMP, None)  # Placeholder
        
        # Update jump_if_false target
        else_start = len(self.instructions)
        self.instructions[jump_if_false_idx].arg = else_start
        
        # Compile else body
        if node.else_body:
            for statement in node.else_body:
                self.compile(statement)
        
        # Update jump_to_end target
        end_idx = len(self.instructions)
        self.instructions[jump_to_end_idx].arg = end_idx
        
        return self.instructions
    
    def compile_while(self, node: WhileNode) -> List[Instruction]:
        """Compile a while loop"""
        loop_start = len(self.instructions)
        
        # Compile condition
        self.compile(node.condition)
        
        # Jump if false (to end)
        jump_if_false_idx = len(self.instructions)
        self.add_instruction(self.JUMP_IF_FALSE, None)  # Placeholder
        
        # Compile body
        for statement in node.body:
            self.compile(statement)
        
        # Jump back to loop start
        self.add_instruction(self.JUMP, loop_start)
        
        # Update jump_if_false target
        loop_end = len(self.instructions)
        self.instructions[jump_if_false_idx].arg = loop_end
        
        return self.instructions
    
    def compile_return(self, node: ReturnNode) -> List[Instruction]:
        """Compile a return statement"""
        if node.value:
            self.compile(node.value)
        else:
            const_idx = self.add_constant(None)
            self.add_instruction(self.LOAD_CONST, const_idx)
        
        self.add_instruction(self.RETURN)
        return self.instructions
    
    def compile_print(self, node: PrintNode) -> List[Instruction]:
        """Compile a print statement"""
        self.compile(node.value)
        self.add_instruction(self.PRINT)
        return self.instructions
    
    def to_object_code(self) -> str:
        """Convert bytecode to object code representation"""
        lines = ["# Codex Object Code", ""]
        
        # Constants section
        lines.append("CONSTANTS:")
        for i, const in enumerate(self.constants):
            lines.append(f"  {i}: {repr(const)}")
        lines.append("")
        
        # Main code section
        lines.append("CODE:")
        for i, instr in enumerate(self.instructions):
            lines.append(f"  {i:4d}: {instr}")
        lines.append("")
        
        # Functions section
        if self.functions:
            lines.append("FUNCTIONS:")
            for name, func_code in self.functions.items():
                lines.append(f"  {name}:")
                for i, instr in enumerate(func_code):
                    lines.append(f"    {i:4d}: {instr}")
                lines.append("")
        
        return "\n".join(lines)
