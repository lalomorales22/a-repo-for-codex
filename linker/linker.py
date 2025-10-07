"""
Linker for the Codex Programming Language
Links multiple object files into a single executable
"""

from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class ObjectFile:
    """Represents a compiled object file"""
    name: str
    constants: List[Any]
    instructions: List[Any]
    functions: Dict[str, List[Any]]
    exports: List[str]  # Exported symbols
    imports: List[str]  # Imported symbols


class Linker:
    """Links multiple object files into an executable"""
    
    def __init__(self):
        self.object_files: List[ObjectFile] = []
        self.symbol_table: Dict[str, ObjectFile] = {}
        self.linked_constants: List[Any] = []
        self.linked_instructions: List[Any] = []
        self.linked_functions: Dict[str, List[Any]] = {}
    
    def add_object_file(self, obj_file: ObjectFile):
        """Add an object file to be linked"""
        self.object_files.append(obj_file)
        
        # Build symbol table
        for export in obj_file.exports:
            if export in self.symbol_table:
                raise RuntimeError(f"Symbol '{export}' defined in multiple object files")
            self.symbol_table[export] = obj_file
    
    def resolve_imports(self):
        """Resolve all import references"""
        for obj_file in self.object_files:
            for import_sym in obj_file.imports:
                if import_sym not in self.symbol_table:
                    raise RuntimeError(f"Undefined symbol '{import_sym}' in {obj_file.name}")
    
    def link(self) -> Dict[str, Any]:
        """Link all object files into a single executable"""
        # Resolve all imports first
        self.resolve_imports()
        
        # Merge constants
        constant_offset_map: Dict[str, Dict[int, int]] = {}
        for obj_file in self.object_files:
            offset_map = {}
            for i, const in enumerate(obj_file.constants):
                if const not in self.linked_constants:
                    self.linked_constants.append(const)
                offset_map[i] = self.linked_constants.index(const)
            constant_offset_map[obj_file.name] = offset_map
        
        # Merge instructions with adjusted constant references
        instruction_offset_map: Dict[str, int] = {}
        for obj_file in self.object_files:
            instruction_offset_map[obj_file.name] = len(self.linked_instructions)
            
            for instr in obj_file.instructions:
                # Adjust constant references
                if hasattr(instr, 'opcode') and instr.opcode == 'LOAD_CONST':
                    old_idx = instr.arg
                    new_idx = constant_offset_map[obj_file.name][old_idx]
                    instr.arg = new_idx
                
                self.linked_instructions.append(instr)
        
        # Merge functions
        for obj_file in self.object_files:
            for func_name, func_code in obj_file.functions.items():
                if func_name in self.linked_functions:
                    raise RuntimeError(f"Function '{func_name}' defined in multiple object files")
                
                # Adjust constant references in function code
                adjusted_code = []
                for instr in func_code:
                    if hasattr(instr, 'opcode') and instr.opcode == 'LOAD_CONST':
                        old_idx = instr.arg
                        new_idx = constant_offset_map[obj_file.name][old_idx]
                        instr.arg = new_idx
                    adjusted_code.append(instr)
                
                self.linked_functions[func_name] = adjusted_code
        
        return {
            'constants': self.linked_constants,
            'instructions': self.linked_instructions,
            'functions': self.linked_functions,
            'entry_point': 0
        }
    
    def to_executable(self) -> str:
        """Generate executable representation"""
        executable = self.link()
        
        lines = ["# Codex Executable", ""]
        
        # Constants section
        lines.append("CONSTANTS:")
        for i, const in enumerate(executable['constants']):
            lines.append(f"  {i}: {repr(const)}")
        lines.append("")
        
        # Code section
        lines.append("CODE:")
        for i, instr in enumerate(executable['instructions']):
            lines.append(f"  {i:4d}: {instr}")
        lines.append("")
        
        # Functions section
        if executable['functions']:
            lines.append("FUNCTIONS:")
            for name, func_code in executable['functions'].items():
                lines.append(f"  {name}:")
                for i, instr in enumerate(func_code):
                    lines.append(f"    {i:4d}: {instr}")
                lines.append("")
        
        lines.append(f"ENTRY_POINT: {executable['entry_point']}")
        
        return "\n".join(lines)


def link_files(object_files: List[ObjectFile]) -> Dict[str, Any]:
    """Convenience function to link multiple object files"""
    linker = Linker()
    
    for obj_file in object_files:
        linker.add_object_file(obj_file)
    
    return linker.link()
