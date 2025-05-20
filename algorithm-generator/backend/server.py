import ast
import graphviz
import re
import javalang
from flask import Flask, request, jsonify
from flask_cors import CORS
from parse_python import parse_python_code, analyze_complexity, suggest_optimizations

app = Flask(__name__)
CORS(app)

# Helper function to create a minimal flowchart
def create_minimal_flowchart(error_message=None):
    dot = graphviz.Digraph()
    dot.node("Start", "Start", shape="oval", style="filled", fillcolor="lightgreen")
    if error_message:
        dot.node("Error", error_message, shape="rectangle", style="filled", fillcolor="lightcoral")
        dot.edge("Start", "Error")
        dot.node("End", "End", shape="oval", style="filled", fillcolor="red")
        dot.edge("Error", "End")
    else:
        dot.node("End", "End", shape="oval", style="filled", fillcolor="red")
        dot.edge("Start", "End")
    return dot.pipe(format="svg").decode("utf-8")

# Helper function to get line number of a pattern in the code
def get_line_number(code, pattern, index=0):
    lines = code.splitlines()
    count = 0
    for i, line in enumerate(lines):
        if pattern in line:
            if count == index:
                return i + 1
            count += 1
    return -1

# ✅ Optimized Memory Analysis for Python
def analyze_python_memory(code, tree=None):
    try:
        if tree is None:
            tree = ast.parse(code)
        memory_usage = 0  # Estimated memory usage in bytes
        bottlenecks = []
        suggestions = []
        memory_breakdown = []

        def estimate_variable_size(node, depth=0):
            if isinstance(node, ast.Num):
                return 24  # Approximate size of a Python integer/float
            elif isinstance(node, ast.Str):
                return 49 + len(node.s)  # Base size of string + 1 byte per char
            elif isinstance(node, ast.List):
                base_size = 64 + 8 * len(node.elts)  # Base size of list + 8 bytes per element
                nested_size = sum(estimate_variable_size(elt, depth + 1) for elt in node.elts)
                total_size = base_size + nested_size
                if len(node.elts) > 1000:
                    bottlenecks.append({
                        "line": node.lineno if hasattr(node, "lineno") else -1,
                        "description": f"Large list with {len(node.elts)} elements"
                    })
                    suggestions.append({
                        "line": node.lineno if hasattr(node, "lineno") else -1,
                        "suggestion": "Consider using a generator or numpy array for large datasets to save memory"
                    })
                return total_size
            elif isinstance(node, ast.Dict):
                base_size = 240 + 36 * len(node.keys)  # Base size of dict + 36 bytes per entry
                nested_size = sum(estimate_variable_size(k, depth + 1) + estimate_variable_size(v, depth + 1) for k, v in zip(node.keys, node.values))
                return base_size + nested_size
            return 0

        # Analyze variable assignments
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        var_name = target.id
                        size = estimate_variable_size(node.value)
                        memory_usage += size
                        memory_breakdown.append({
                            "variable": var_name,
                            "type": type(node.value).__name__,
                            "size": f"{size} bytes",
                            "line": node.lineno
                        })
                        if isinstance(node.value, ast.Subscript) and isinstance(node.value.value, ast.Name):
                            bottlenecks.append({
                                "line": node.lineno,
                                "description": "Unnecessary list copy using slicing"
                            })
                            suggestions.append({
                                "line": node.lineno,
                                "suggestion": "Use a reference instead of copying (e.g., y = x instead of y = x[:])"
                            })
            elif isinstance(node, ast.ListComp):
                list_comp_size = 64 + 8 * 1000  # Assume 1000 elements for estimation
                memory_usage += list_comp_size
                memory_breakdown.append({
                    "variable": "list comprehension",
                    "type": "ListComp",
                    "size": f"{list_comp_size} bytes (assumed 1000 elements)",
                    "line": node.lineno
                })
                bottlenecks.append({
                    "line": node.lineno,
                    "description": "List comprehension creates a large list in memory"
                })
                suggestions.append({
                    "line": node.lineno,
                    "suggestion": "Consider using a generator expression to save memory"
                })
            elif isinstance(node, ast.AugAssign) and isinstance(node.op, ast.Add) and isinstance(node.target, ast.Name):
                if isinstance(node.value, ast.Str):
                    str_concat_size = 49 + len(node.value.s)
                    memory_usage += str_concat_size
                    memory_breakdown.append({
                        "variable": node.target.id,
                        "type": "string (concatenation)",
                        "size": f"{str_concat_size} bytes",
                        "line": node.lineno
                    })
                    bottlenecks.append({
                        "line": node.lineno,
                        "description": "String concatenation in a loop creates multiple temporary objects"
                    })
                    suggestions.append({
                        "line": node.lineno,
                        "suggestion": "Use a list to collect strings and join them at the end (e.g., ''.join(list))"
                    })
            # Estimate memory for loop variables
            elif isinstance(node, ast.For):
                if isinstance(node.target, ast.Name):
                    var_name = node.target.id
                    loop_var_size = 24  # Size of a Python integer
                    memory_usage += loop_var_size
                    memory_breakdown.append({
                        "variable": var_name,
                        "type": "int (loop variable)",
                        "size": f"{loop_var_size} bytes",
                        "line": node.lineno
                    })
            # Estimate memory for function parameters
            elif isinstance(node, ast.FunctionDef):
                for param in node.args.args:
                    param_name = param.arg
                    param_size = 24  # Size of a Python integer (assumed)
                    memory_usage += param_size
                    memory_breakdown.append({
                        "variable": f"{param_name} (param in {node.name})",
                        "type": "int (assumed)",
                        "size": f"{param_size} bytes",
                        "line": node.lineno
                    })

        return {
            "estimated_memory_usage": f"{memory_usage / 1024:.2f} KB",
            "memory_breakdown": memory_breakdown,
            "bottlenecks": bottlenecks,
            "suggestions": suggestions
        }
    except Exception as e:
        return {
            "estimated_memory_usage": "0.00 KB",
            "memory_breakdown": [],
            "bottlenecks": [],
            "suggestions": [{"line": -1, "suggestion": f"Memory analysis failed: {str(e)}"}]
        }

# ✅ Optimized Memory Analysis for C++
def analyze_cpp_memory(code, parsed_data=None):
    try:
        memory_usage = 0  # Estimated memory usage in bytes
        bottlenecks = []
        suggestions = []
        memory_breakdown = []

        if parsed_data is None:
            parsed_data = {
                "declarations": re.findall(r"(\w+)\s+(\w+)\s*(?:=\s*([^;]+))?\s*;", code, re.DOTALL) or [],
                "loop_vars": re.findall(r"for\s*\(\s*(\w+)\s+(\w+)\s*=\s*[^;]+;", code, re.DOTALL) or [],
                "functions": re.findall(r"\b(\w+)\s+(\w+)\s*\((.*?)\)\s*{", code, re.DOTALL) or [],
                "loops": re.findall(r"(for|while)\s*\((.*?)\)", code, re.DOTALL) or [],
                "array_decls": re.findall(r"(\w+)\s+(\w+)\s*\[(\d+)\]\s*;", code, re.DOTALL) or [],
                "assignments": re.findall(r"(\w+)\s*=\s*(\d+);", code, re.DOTALL) or []
            }

        required_keys = ["declarations", "loop_vars", "functions", "loops", "array_decls", "assignments"]
        for key in required_keys:
            if key not in parsed_data:
                parsed_data[key] = []

        # Estimate memory usage for variable declarations
        for i, (var_type, var_name, value) in enumerate(parsed_data["declarations"]):
            if var_type in ["int", "float"]:
                memory_usage += 4
                memory_breakdown.append({
                    "variable": var_name,
                    "type": var_type,
                    "size": "4 bytes",
                    "line": get_line_number(code, f"{var_name} ", i)
                })
            elif var_type in ["double"]:
                memory_usage += 8
                memory_breakdown.append({
                    "variable": var_name,
                    "type": var_type,
                    "size": "8 bytes",
                    "line": get_line_number(code, f"{var_name} ", i)
                })
            elif var_type == "string":
                str_size = 32 + (len(value.strip('"')) if value else 0)
                memory_usage += str_size
                memory_breakdown.append({
                    "variable": var_name,
                    "type": var_type,
                    "size": f"{str_size} bytes",
                    "line": get_line_number(code, f"{var_name} ", i)
                })
            elif "vector" in var_type:
                vec_size = 24 + 8 * 1000
                memory_usage += vec_size
                memory_breakdown.append({
                    "variable": var_name,
                    "type": "vector",
                    "size": f"{vec_size} bytes (assumed 1000 elements)",
                    "line": get_line_number(code, f"{var_name} ", i)
                })
                bottlenecks.append({
                    "line": get_line_number(code, f"{var_name} ", i),
                    "description": "Large vector allocation on stack"
                })
                suggestions.append({
                    "line": get_line_number(code, f"{var_name} ", i),
                    "suggestion": "Consider using dynamic allocation (e.g., std::vector on heap) or reserve memory in advance"
                })

        # Estimate memory usage for array declarations
        for i, (var_type, var_name, size) in enumerate(parsed_data["array_decls"]):
            if var_type in ["int", "float"]:
                array_size = int(size)
                array_memory = array_size * 4
                memory_usage += array_memory
                memory_breakdown.append({
                    "variable": var_name,
                    "type": f"{var_type} array[{array_size}]",
                    "size": f"{array_memory} bytes",
                    "line": get_line_number(code, f"{var_name} ", i)
                })
                if array_size > 1000:
                    bottlenecks.append({
                        "line": get_line_number(code, f"{var_name} ", i),
                        "description": f"Large array declaration ({array_size} elements) on stack"
                    })
                    suggestions.append({
                        "line": get_line_number(code, f"{var_name} ", i),
                        "suggestion": "Consider using dynamic allocation (e.g., new int[]) to avoid stack overflow"
                    })

        # Estimate memory usage for loop variables
        for i, (var_type, var_name) in enumerate(parsed_data["loop_vars"]):
            if var_type in ["int", "float"]:
                memory_usage += 4
                memory_breakdown.append({
                    "variable": var_name,
                    "type": f"{var_type} (loop variable)",
                    "size": "4 bytes",
                    "line": get_line_number(code, "for ", i)
                })
            elif var_type in ["double"]:
                memory_usage += 8
                memory_breakdown.append({
                    "variable": var_name,
                    "type": f"{var_type} (loop variable)",
                    "size": "8 bytes",
                    "line": get_line_number(code, "for ", i)
                })

        # Estimate memory usage for function parameters
        for i, (ret_type, func_name, params) in enumerate(parsed_data["functions"]):
            param_list = [p.strip() for p in params.split(",") if p.strip()]
            array_param = None
            size_param = None
            for param in param_list:
                param_type = param.split()[0] if param.split() else ""
                param_name = param.split()[-1].replace("[]", "") if param.split() else ""
                if param_type in ["int", "float"]:
                    memory_usage += 4
                    memory_breakdown.append({
                        "variable": f"{param_name} (param in {func_name})",
                        "type": param_type,
                        "size": "4 bytes",
                        "line": get_line_number(code, f"{func_name}(", i)
                    })
                elif param_type in ["double"]:
                    memory_usage += 8
                    memory_breakdown.append({
                        "variable": f"{param_name} (param in {func_name})",
                        "type": param_type,
                        "size": "8 bytes",
                        "line": get_line_number(code, f"{func_name}(", i)
                    })
                elif "[]" in param:
                    array_param = param
                    for p in param_list:
                        if p.startswith("int ") and p != param:
                            size_param = p.split()[1]
                            break
            if array_param and size_param:
                array_size = None
                for var, val in parsed_data["assignments"]:
                    if var == size_param:
                        array_size = int(val)
                        break
                if array_size is None:
                    for _, arr_name, arr_size in parsed_data["array_decls"]:
                        if arr_name in array_param:
                            array_size = int(arr_size)
                            break
                if array_size is None:
                    array_size = 100
                array_memory = array_size * 4
                if not any(d["variable"] == param_name for d in memory_breakdown):
                    memory_usage += array_memory
                    memory_breakdown.append({
                        "variable": f"{param_name} (array param in {func_name})",
                        "type": "int array",
                        "size": f"{array_memory} bytes (assumed {array_size} elements)",
                        "line": get_line_number(code, f"{func_name}(", i)
                    })
                if array_size > 1000:
                    bottlenecks.append({
                        "line": get_line_number(code, f"{func_name}(", i),
                        "description": f"Large array parameter ({array_size} elements) passed to function"
                    })
                    suggestions.append({
                        "line": get_line_number(code, f"{func_name}(", i),
                        "suggestion": "Consider passing a reference to a smaller data structure or using a vector with reserved capacity"
                    })

        # Check for string concatenation in loops
        for i, (loop_type, condition) in enumerate(parsed_data["loops"]):
            loop_body = re.search(r"\{(.*?)\}", code[code.index(condition) + len(condition):], re.DOTALL)
            if loop_body and "string" in loop_body.group(1) and "+=" in loop_body.group(1):
                str_concat_memory = 32 * 100
                memory_usage += str_concat_memory
                memory_breakdown.append({
                    "variable": "temporary strings",
                    "type": "string (concatenation in loop)",
                    "size": f"{str_concat_memory} bytes (assumed 100 concatenations)",
                    "line": get_line_number(code, f"{loop_type} ", i)
                })
                bottlenecks.append({
                    "line": get_line_number(code, f"{loop_type} ", i),
                    "description": "String concatenation in a loop creates multiple temporary objects"
                })
                suggestions.append({
                    "line": get_line_number(code, f"{loop_type} ", i),
                    "suggestion": "Use std::stringstream or pre-allocate string size to avoid reallocations"
                })

        return {
            "estimated_memory_usage": f"{memory_usage / 1024:.2f} KB",
            "memory_breakdown": memory_breakdown,
            "bottlenecks": bottlenecks,
            "suggestions": suggestions
        }
    except Exception as e:
        return {
            "estimated_memory_usage": "0.00 KB",
            "memory_breakdown": [],
            "bottlenecks": [],
            "suggestions": [{"line": -1, "suggestion": f"Memory analysis failed: {str(e)}"}]
        }

# ✅ Optimized Memory Analysis for Java
def analyze_java_memory(code, tree=None):
    try:
        if tree is None:
            tree = javalang.parse.parse(code)
        memory_usage = 0  # Estimated memory usage in bytes
        bottlenecks = []
        suggestions = []
        memory_breakdown = []

        # Analyze variable declarations
        for path, node in tree.filter(javalang.tree.LocalVariableDeclaration):
            for decl in node.declarators:
                var_type = node.type.name
                var_name = decl.name
                if var_type in ["int", "float"]:
                    memory_usage += 4
                    memory_breakdown.append({
                        "variable": var_name,
                        "type": var_type,
                        "size": "4 bytes",
                        "line": node.position.line if node.position else -1
                    })
                elif var_type == "double":
                    memory_usage += 8
                    memory_breakdown.append({
                        "variable": var_name,
                        "type": var_type,
                        "size": "8 bytes",
                        "line": node.position.line if node.position else -1
                    })
                elif var_type == "String":
                    str_size = 40 + (len(decl.initializer.value) if decl.initializer else 0)
                    memory_usage += str_size
                    memory_breakdown.append({
                        "variable": var_name,
                        "type": var_type,
                        "size": f"{str_size} bytes",
                        "line": node.position.line if node.position else -1
                    })
                elif var_type == "ArrayList":
                    list_size = 40 + 8 * 1000
                    memory_usage += list_size
                    memory_breakdown.append({
                        "variable": var_name,
                        "type": "ArrayList",
                        "size": f"{list_size} bytes (assumed 1000 elements)",
                        "line": node.position.line if node.position else -1
                    })
                    bottlenecks.append({
                        "line": node.position.line if node.position else -1,
                        "description": "Large ArrayList allocation"
                    })
                    suggestions.append({
                        "line": node.position.line if node.position else -1,
                        "suggestion": "Consider pre-allocating capacity (e.g., new ArrayList<>(capacity)) to avoid resizing"
                    })
                if isinstance(node.type, javalang.tree.BasicType) and node.type.dimensions:
                    array_size = None
                    if decl.initializer and isinstance(decl.initializer, javalang.tree.ArrayInitializer):
                        array_size = len(decl.initializer.values)
                    elif decl.initializer and isinstance(decl.initializer, javalang.tree.ArrayCreator):
                        array_size = int(decl.initializer.dimensions[0].value) if decl.initializer.dimensions else None
                    if array_size:
                        if var_type in ["int", "float"]:
                            array_memory = array_size * 4
                            memory_usage += array_memory
                            memory_breakdown.append({
                                "variable": var_name,
                                "type": f"{var_type} array[{array_size}]",
                                "size": f"{array_memory} bytes",
                                "line": node.position.line if node.position else -1
                            })
                        elif var_type == "double":
                            array_memory = array_size * 8
                            memory_usage += array_memory
                            memory_breakdown.append({
                                "variable": var_name,
                                "type": f"{var_type} array[{array_size}]",
                                "size": f"{array_memory} bytes",
                                "line": node.position.line if node.position else -1
                            })
                        if array_size > 1000:
                            bottlenecks.append({
                                "line": node.position.line if node.position else -1,
                                "description": f"Large array declaration ({array_size} elements)"
                            })
                            suggestions.append({
                                "line": node.position.line if node.position else -1,
                                "suggestion": "Consider using a smaller array or an ArrayList with pre-allocated capacity"
                            })

        # Analyze loop variables
        for path, node in tree.filter(javalang.tree.ForStatement):
            if node.control and hasattr(node.control, 'init'):
                for init in node.control.init:
                    if isinstance(init, javalang.tree.LocalVariableDeclaration):
                        for decl in init.declarators:
                            var_type = init.type.name
                            var_name = decl.name
                            if var_type in ["int", "float"]:
                                memory_usage += 4
                                memory_breakdown.append({
                                    "variable": var_name,
                                    "type": f"{var_type} (loop variable)",
                                    "size": "4 bytes",
                                    "line": node.position.line if node.position else -1
                                })
                            elif var_type == "double":
                                memory_usage += 8
                                memory_breakdown.append({
                                    "variable": var_name,
                                    "type": f"{var_type} (loop variable)",
                                    "size": "8 bytes",
                                    "line": node.position.line if node.position else -1
                                })

        # Analyze function parameters
        for path, node in tree.filter(javalang.tree.MethodDeclaration):
            method_name = node.name
            for param in node.parameters:
                param_type = param.type.name
                param_name = param.name
                if param_type in ["int", "float"]:
                    memory_usage += 4
                    memory_breakdown.append({
                        "variable": f"{param_name} (param in {method_name})",
                        "type": param_type,
                        "size": "4 bytes",
                        "line": node.position.line if node.position else -1
                    })
                elif param_type == "double":
                    memory_usage += 8
                    memory_breakdown.append({
                        "variable": f"{param_name} (param in {method_name})",
                        "type": param_type,
                        "size": "8 bytes",
                        "line": node.position.line if node.position else -1
                    })
                elif param_type == "String":
                    memory_usage += 40
                    memory_breakdown.append({
                        "variable": f"{param_name} (param in {method_name})",
                        "type": "String",
                        "size": "40 bytes (base size)",
                        "line": node.position.line if node.position else -1
                    })
                if param.type.dimensions:
                    array_size = None
                    for path2, node2 in tree.filter(javalang.tree.MethodInvocation):
                        if node2.member == method_name:
                            for arg in node2.arguments:
                                if isinstance(arg, javalang.tree.MemberReference):
                                    for path3, node3 in tree.filter(javalang.tree.LocalVariableDeclaration):
                                        for decl in node3.declarators:
                                            if decl.name == arg.member:
                                                if decl.initializer and isinstance(decl.initializer, javalang.tree.ArrayCreator):
                                                    array_size = int(decl.initializer.dimensions[0].value) if decl.initializer.dimensions else None
                                                    break
                                        if array_size:
                                            break
                                if array_size:
                                    break
                        if array_size:
                            break
                    if array_size is None:
                        array_size = 100
                    if param_type in ["int", "float"]:
                        array_memory = array_size * 4
                        if not any(d["variable"] == param_name for d in memory_breakdown):
                            memory_usage += array_memory
                            memory_breakdown.append({
                                "variable": f"{param_name} (array param in {method_name})",
                                "type": f"{param_type} array",
                                "size": f"{array_memory} bytes (assumed {array_size} elements)",
                                "line": node.position.line if node.position else -1
                            })
                        if array_size > 1000:
                            bottlenecks.append({
                                "line": node.position.line if node.position else -1,
                                "description": f"Large array parameter ({array_size} elements) passed to method"
                            })
                            suggestions.append({
                                "line": node.position.line if node.position else -1,
                                "suggestion": "Consider passing a smaller array or using a List with pre-allocated capacity"
                            })

        # Check for string concatenation in loops
        for path, node in tree.filter(javalang.tree.ForStatement):
            if node.body:
                for sub_stmt in (node.body if isinstance(node.body, list) else [node.body]):
                    if isinstance(sub_stmt, javalang.tree.StatementExpression):
                        if hasattr(sub_stmt.expression, 'operator') and sub_stmt.expression.operator == "+=":
                            if hasattr(sub_stmt.expression.left, 'type') and sub_stmt.expression.left.type.name == "String":
                                str_concat_memory = 40 * 100
                                memory_usage += str_concat_memory
                                memory_breakdown.append({
                                    "variable": "temporary strings",
                                    "type": "String (concatenation in loop)",
                                    "size": f"{str_concat_memory} bytes (assumed 100 concatenations)",
                                    "line": node.position.line if node.position else -1
                                })
                                bottlenecks.append({
                                    "line": node.position.line if node.position else -1,
                                    "description": "String concatenation in a loop creates multiple temporary objects"
                                })
                                suggestions.append({
                                    "line": node.position.line if node.position else -1,
                                    "suggestion": "Use StringBuilder for string concatenation in loops"
                                })

        return {
            "estimated_memory_usage": f"{memory_usage / 1024:.2f} KB",
            "memory_breakdown": memory_breakdown,
            "bottlenecks": bottlenecks,
            "suggestions": suggestions
        }
    except Exception as e:
        return {
            "estimated_memory_usage": "0.00 KB",
            "memory_breakdown": [],
            "bottlenecks": [],
            "suggestions": [{"line": -1, "suggestion": f"Memory analysis failed: {str(e)}"}]
        }

# ✅ Optimized Python Flowchart Generator
def generate_python_flowchart(code):
    try:
        if not code.strip():
            return create_minimal_flowchart("Error: Empty Python Code"), [{"node_id": "error", "description": "Empty Python Code", "variables": {}, "output": None, "line": -1}], {}, {}, {}

        tree = ast.parse(code)
        dot = graphviz.Digraph()
        dot.node("Start", "Start", shape="oval", style="filled", fillcolor="lightgreen")
        last_node = "Start"

        node_info = {}
        node_counter = 1

        def process_node(parent, node):
            nonlocal dot
            nonlocal last_node
            nonlocal node_counter

            try:
                if isinstance(node, ast.FunctionDef):
                    func_name = f"Func_{node.name}_{node_counter}"
                    dot.node(func_name, f"Function: {node.name}", shape="parallelogram", style="filled", fillcolor="lightblue")
                    dot.edge(parent, func_name)
                    node_info[func_name] = {
                        "description": f"Function: {node.name}",
                        "variables": {},
                        "output": None,
                        "line": node.lineno if hasattr(node, "lineno") else -1
                    }
                    node_counter += 1
                    parent = func_name

                    prev_stmt = func_name
                    for stmt in node.body:
                        prev_stmt = process_node(prev_stmt, stmt)
                    return prev_stmt

                elif isinstance(node, ast.Assign):
                    assign_id = f"Assign_{node_counter}"
                    targets = [t.id for t in node.targets if isinstance(t, ast.Name)]
                    if targets:
                        dot.node(assign_id, f"Assign: {', '.join(targets)}", shape="rectangle", style="filled", fillcolor="lightblue")
                        dot.edge(parent, assign_id)
                        node_info[assign_id] = {
                            "description": f"Assign: {', '.join(targets)}",
                            "variables": {target: "N/A" for target in targets},
                            "output": None,
                            "line": node.lineno if hasattr(node, "lineno") else -1
                        }
                        node_counter += 1
                        return assign_id
                    return parent

                elif isinstance(node, ast.For):
                    loop_id = f"For_{node_counter}"
                    dot.node(loop_id, "For Loop", shape="diamond", style="filled", fillcolor="pink")
                    dot.edge(parent, loop_id)
                    node_info[loop_id] = {
                        "description": "For Loop",
                        "variables": {},
                        "output": None,
                        "line": node.lineno if hasattr(node, "lineno") else -1
                    }
                    node_counter += 1

                    prev_stmt = loop_id
                    for stmt in node.body:
                        prev_stmt = process_node(prev_stmt, stmt)
                    dot.edge(prev_stmt, loop_id)
                    return loop_id

                elif isinstance(node, ast.While):
                    loop_id = f"While_{node_counter}"
                    dot.node(loop_id, "While Loop", shape="diamond", style="filled", fillcolor="pink")
                    dot.edge(parent, loop_id)
                    node_info[loop_id] = {
                        "description": "While Loop",
                        "variables": {},
                        "output": None,
                        "line": node.lineno if hasattr(node, "lineno") else -1
                    }
                    node_counter += 1

                    prev_stmt = loop_id
                    for stmt in node.body:
                        prev_stmt = process_node(prev_stmt, stmt)
                    dot.edge(prev_stmt, loop_id)
                    return loop_id

                elif isinstance(node, ast.If):
                    if_id = f"If_{node_counter}"
                    dot.node(if_id, "If Condition", shape="diamond", style="filled", fillcolor="orange")
                    dot.edge(parent, if_id)
                    node_info[if_id] = {
                        "description": "If Condition",
                        "variables": {},
                        "output": None,
                        "line": node.lineno if hasattr(node, "lineno") else -1
                    }
                    node_counter += 1

                    prev_stmt = if_id
                    for stmt in node.body:
                        prev_stmt = process_node(if_id, stmt)

                    if node.orelse:
                        else_id = f"Else_{node_counter}"
                        dot.node(else_id, "Else", shape="diamond", style="filled", fillcolor="orange")
                        dot.edge(if_id, else_id)
                        node_info[else_id] = {
                            "description": "Else",
                            "variables": {},
                            "output": None,
                            "line": node.lineno if hasattr(node, "lineno") else -1
                        }
                        node_counter += 1
                        for stmt in node.orelse:
                            prev_stmt = process_node(else_id, stmt)
                    return prev_stmt

                elif isinstance(node, ast.Return):
                    return_id = f"Return_{node_counter}"
                    dot.node(return_id, "Return", shape="parallelogram", style="filled", fillcolor="yellow")
                    dot.edge(parent, return_id)
                    node_info[return_id] = {
                        "description": "Return",
                        "variables": {},
                        "output": None,
                        "line": node.lineno if hasattr(node, "lineno") else -1
                    }
                    node_counter += 1
                    return return_id

                elif isinstance(node, ast.Expr):
                    expr_id = f"Expr_{node_counter}"
                    dot.node(expr_id, "Expression", shape="rectangle", style="filled", fillcolor="lightgray")
                    dot.edge(parent, expr_id)
                    node_info[expr_id] = {
                        "description": "Expression",
                        "variables": {},
                        "output": None,
                        "line": node.lineno if hasattr(node, "lineno") else -1
                    }
                    node_counter += 1
                    return expr_id

                return parent

            except Exception as e:
                error_id = f"Error_{node_counter}"
                dot.node(error_id, f"Error in Node: {str(e)}", shape="rectangle", style="filled", fillcolor="lightcoral")
                dot.edge(parent, error_id)
                node_info[error_id] = {
                    "description": f"Error in Node: {str(e)}",
                    "variables": {},
                    "output": None,
                    "line": -1
                }
                node_counter += 1
                return error_id

        prev_node = last_node
        for node in ast.iter_child_nodes(tree):
            prev_node = process_node(prev_node, node)

        dot.node("End", "End", shape="oval", style="filled", fillcolor="red")
        dot.edge(prev_node, "End")

        execution_steps = [
            {
                "node_id": node_id,
                "description": info["description"],
                "variables": info["variables"],
                "output": info["output"],
                "line": info["line"]
            }
            for node_id, info in node_info.items()
        ]

        if not execution_steps:
            execution_steps = [{"node_id": "default", "description": "No significant statements found", "variables": {}, "output": None, "line": -1}]

        complexity_analysis = analyze_complexity(code)
        optimization_suggestions = suggest_optimizations(code)
        memory_analysis = analyze_python_memory(code, tree)

        return dot.pipe(format="svg").decode("utf-8"), execution_steps, complexity_analysis, optimization_suggestions, memory_analysis

    except Exception as e:
        return create_minimal_flowchart(f"Python Flowchart Error: {str(e)}"), [{"node_id": "error", "description": f"Python Flowchart Error: {str(e)}", "variables": {}, "output": None, "line": -1}], {}, {}, {}

# ✅ Optimized C++ Flowchart Generator
def generate_cpp_flowchart(code):
    try:
        if not code.strip():
            return create_minimal_flowchart("Error: Empty C++ Code"), [{"node_id": "error", "description": "Empty C++ Code", "variables": {}, "output": None, "line": -1}], {}, {}, {}

        parsed_data = {
            "functions": re.findall(r"\b(\w+)\s+(\w+)\s*\((.*?)\)\s*{", code, re.DOTALL) or [],
            "function_calls": re.findall(r"(\w+)\s*\(.*?\);", code, re.DOTALL) or [],
            "declarations": re.findall(r"(\w+)\s+(\w+)\s*(?:=\s*([^;]+))?\s*;", code, re.DOTALL) or [],
            "if_else_blocks": re.findall(r"(if|else if|else)\s*(\(.*?\))?\s*{", code, re.DOTALL) or [],
            "loops": re.findall(r"(for|while)\s*\((.*?)\)", code, re.DOTALL) or [],
            "loop_vars": re.findall(r"for\s*\(\s*(\w+)\s+(\w+)\s*=\s*[^;]+;", code, re.DOTALL) or [],
            "return_statements": re.findall(r"return\s+([^;]+);", code, re.DOTALL) or [],
            "print_statements": re.findall(r"cout\s*<<\s*(.*?);", code, re.DOTALL) or [],
            "array_decls": re.findall(r"(\w+)\s+(\w+)\s*\[(\d+)\]\s*;", code, re.DOTALL) or [],
            "assignments": re.findall(r"(\w+)\s*=\s*(\d+);", code, re.DOTALL) or []
        }

        dot = graphviz.Digraph()
        dot.node("Start", "Start", shape="oval", style="filled", fillcolor="lightgreen")
        last_node = "Start"

        for i, (ret_type, func_name, params) in enumerate(parsed_data["functions"]):
            func_node = f"Func_{func_name}_{i}"
            dot.node(func_node, f"Function: {func_name}", shape="parallelogram", style="filled", fillcolor="lightblue")
            dot.edge(last_node, func_node)
            last_node = func_node

        for i, (var_type, var_name, value) in enumerate(parsed_data["declarations"]):
            var_node = f"Var_{var_name}_{i}"
            label = f"Declare: {var_name}" if not value else f"{var_name} = {value.strip()}"
            dot.node(var_node, label, shape="rectangle", style="filled", fillcolor="lightyellow")
            dot.edge(last_node, var_node)
            last_node = var_node

        for i, (condition_type, condition) in enumerate(parsed_data["if_else_blocks"]):
            node_label = f"{condition_type.capitalize()}"
            if condition:
                node_label += f": {condition.strip('()')}"
            node_name = f"{condition_type}_{i}"
            dot.node(node_name, node_label, shape="diamond", style="filled", fillcolor="orange" if "if" in condition_type else "red")
            dot.edge(last_node, node_name)
            last_node = node_name

        for i, (loop_type, condition) in enumerate(parsed_data["loops"]):
            loop_node = f"Loop_{i}"
            dot.node(loop_node, f"{loop_type.capitalize()} Loop: {condition.strip()}", shape="diamond", style="filled", fillcolor="pink")
            dot.edge(last_node, loop_node)
            last_node = loop_node

        for i, func_call in enumerate(parsed_data["function_calls"]):
            if func_call not in [func_name for _, func_name, _ in parsed_data["functions"]]:
                call_node = f"Call_{func_call}_{i}"
                dot.node(call_node, f"Call: {func_call}()", shape="parallelogram", style="filled", fillcolor="yellow")
                dot.edge(last_node, call_node)
                last_node = call_node

        for i, ret in enumerate(parsed_data["return_statements"]):
            return_node = f"Return_{i}"
            dot.node(return_node, f"Return: {ret.strip()}", shape="rectangle", style="filled", fillcolor="lightblue")
            dot.edge(last_node, return_node)
            last_node = return_node

        for i, statement in enumerate(parsed_data["print_statements"]):
            print_node = f"Print_{i}"
            dot.node(print_node, f"Print: {statement.strip()}", shape="parallelogram", style="filled", fillcolor="lightgray")
            dot.edge(last_node, print_node)
            last_node = print_node

        dot.node("End", "End", shape="oval", style="filled", fillcolor="red")
        dot.edge(last_node, "End")

        execution_steps = []
        for i, (ret_type, func_name, params) in enumerate(parsed_data["functions"]):
            execution_steps.append({
                "node_id": f"Func_{func_name}_{i}",
                "description": f"Function: {func_name}",
                "variables": {},
                "output": None,
                "line": get_line_number(code, f"{func_name}(", i)
            })
        for i, (var_type, var_name, value) in enumerate(parsed_data["declarations"]):
            execution_steps.append({
                "node_id": f"Var_{var_name}_{i}",
                "description": f"Declare: {var_name}" if not value else f"Assignment: {var_name} = {value.strip()}",
                "variables": {var_name: value.strip() if value else "N/A"},
                "output": None,
                "line": get_line_number(code, f"{var_name} ", i)
            })
        for i, (condition_type, condition) in enumerate(parsed_data["if_else_blocks"]):
            execution_steps.append({
                "node_id": f"{condition_type}_{i}",
                "description": f"{condition_type.capitalize()}" + (f": {condition.strip('()')}" if condition else ""),
                "variables": {},
                "output": None,
                "line": get_line_number(code, f"{condition_type} ", i)
            })
        for i, (loop_type, condition) in enumerate(parsed_data["loops"]):
            execution_steps.append({
                "node_id": f"Loop_{i}",
                "description": f"{loop_type.capitalize()} Loop: {condition.strip()}",
                "variables": {},
                "output": None,
                "line": get_line_number(code, f"{loop_type} ", i)
            })
        for i, statement in enumerate(parsed_data["print_statements"]):
            execution_steps.append({
                "node_id": f"Print_{i}",
                "description": f"Print: {statement.strip()}",
                "variables": {},
                "output": statement.strip(),
                "line": get_line_number(code, "cout ", i)
            })
        if not execution_steps:
            execution_steps = [{"node_id": "default", "description": "No significant statements found", "variables": {}, "output": None, "line": -1}]

        loop_count = len(parsed_data["loops"])
        time_complexity = "O(n)" if loop_count > 0 else "O(1)"
        space_complexity = "O(1)"
        complexity_analysis = {
            "time_complexity": time_complexity,
            "space_complexity": space_complexity,
            "details": [f"Detected {loop_count} loops, leading to {'linear' if loop_count > 0 else 'constant'} time complexity."]
        }

        optimization_suggestions = {
            "suggestions": [],
            "optimized_code": code
        }

        memory_analysis = analyze_cpp_memory(code, parsed_data)

        return dot.pipe(format="svg").decode("utf-8"), execution_steps, complexity_analysis, optimization_suggestions, memory_analysis

    except Exception as e:
        return create_minimal_flowchart(f"C++ Flowchart Error: {str(e)}"), [{"node_id": "error", "description": f"C++ Flowchart Error: {str(e)}", "variables": {}, "output": None, "line": -1}], {}, {}, {}

# ✅ Optimized Java Flowchart Generator
def generate_java_flowchart(code):
    try:
        if not code.strip():
            return create_minimal_flowchart("Error: Empty Java Code"), [{"node_id": "error", "description": "Empty Java Code", "variables": {}, "output": None, "line": -1}], {}, {}, {}

        tree = javalang.parse.parse(code)
        dot = graphviz.Digraph()
        dot.node("Start", "Start", shape="oval", style="filled", fillcolor="lightgreen")
        last_node = "Start"

        methods = list(tree.filter(javalang.tree.MethodDeclaration))
        if not methods:
            dot.node("End", "End", shape="oval", style="filled", fillcolor="red")
            dot.edge(last_node, "End")
        else:
            for path, node in methods:
                method_node = f"Method_{node.name}_{id(node)}"
                dot.node(method_node, f"Method: {node.name}", shape="parallelogram", style="filled", fillcolor="lightblue")
                dot.edge(last_node, method_node)
                last_node = method_node

                if node.body:
                    for stmt in node.body:
                        last_node = process_statement(last_node, stmt, dot)

        dot.node("End", "End", shape="oval", style="filled", fillcolor="red")
        dot.edge(last_node, "End")

        execution_steps = []
        for path, node in tree.filter(javalang.tree.MethodDeclaration):
            execution_steps.append({
                "node_id": f"Method_{node.name}_{id(node)}",
                "description": f"Method: {node.name}",
                "variables": {},
                "output": None,
                "line": node.position.line if node.position else -1
            })
        for path, node in tree.filter(javalang.tree.LocalVariableDeclaration):
            for decl in node.declarators:
                execution_steps.append({
                    "node_id": f"Var_{decl.name}_{id(node)}",
                    "description": f"Declare: {decl.name}",
                    "variables": {decl.name: "N/A"},
                    "output": None,
                    "line": node.position.line if node.position else -1
                })
        for path, node in tree.filter(javalang.tree.StatementExpression):
            if hasattr(node.expression, 'member') and node.expression.member == "println":
                execution_steps.append({
                    "node_id": f"Print_{id(node)}",
                    "description": "Print Statement",
                    "variables": {},
                    "output": "N/A",
                    "line": node.position.line if node.position else -1
                })
        for path, node in tree.filter(javalang.tree.IfStatement):
            execution_steps.append({
                "node_id": f"If_{id(node)}",
                "description": "If Condition",
                "variables": {},
                "output": None,
                "line": node.position.line if node.position else -1
            })
        for path, node in tree.filter(javalang.tree.ForStatement):
            execution_steps.append({
                "node_id": f"For_{id(node)}",
                "description": "For Loop",
                "variables": {},
                "output": None,
                "line": node.position.line if node.position else -1
            })
        for path, node in tree.filter(javalang.tree.WhileStatement):
            execution_steps.append({
                "node_id": f"While_{id(node)}",
                "description": "While Loop",
                "variables": {},
                "output": None,
                "line": node.position.line if node.position else -1
            })
        if not execution_steps:
            execution_steps = [{"node_id": "default", "description": "No significant statements found", "variables": {}, "output": None, "line": -1}]

        loop_count = sum(1 for path, node in tree.filter(javalang.tree.ForStatement))
        loop_count += sum(1 for path, node in tree.filter(javalang.tree.WhileStatement))
        time_complexity = "O(n)" if loop_count > 0 else "O(1)"
        space_complexity = "O(1)"
        complexity_analysis = {
            "time_complexity": time_complexity,
            "space_complexity": space_complexity,
            "details": [f"Detected {loop_count} loops, leading to {'linear' if loop_count > 0 else 'constant'} time complexity."]
        }

        optimization_suggestions = {
            "suggestions": ["Consider using StringBuilder for string concatenation in loops."] if "String" in code else [],
            "optimized_code": code
        }

        memory_analysis = analyze_java_memory(code, tree)

        return dot.pipe(format="svg").decode("utf-8"), execution_steps, complexity_analysis, optimization_suggestions, memory_analysis

    except Exception as e:
        return create_minimal_flowchart(f"Java Flowchart Error: {str(e)}"), [{"node_id": "error", "description": f"Java Flowchart Error: {str(e)}", "variables": {}, "output": None, "line": -1}], {}, {}, {}

def process_statement(parent, stmt, dot):
    last_node = parent

    try:
        if isinstance(stmt, javalang.tree.LocalVariableDeclaration):
            for decl in stmt.declarators:
                var_node = f"Var_{decl.name}_{id(stmt)}"
                dot.node(var_node, f"Declare: {decl.name}", shape="rectangle", style="filled", fillcolor="lightblue")
                dot.edge(last_node, var_node)
                last_node = var_node

        elif isinstance(stmt, javalang.tree.TryStatement):
            try_node = f"Try_{id(stmt)}"
            dot.node(try_node, "Try Block", shape="rectangle", style="filled", fillcolor="yellow")
            dot.edge(last_node, try_node)
            last_node = try_node

            for try_stmt in stmt.block:
                last_node = process_statement(last_node, try_stmt, dot)

            for catch_clause in stmt.catches:
                catch_node = f"Catch_{id(catch_clause)}"
                dot.node(catch_node, f"Catch: {catch_clause.parameter.types[0]} {catch_clause.parameter.name}", shape="parallelogram", style="filled", fillcolor="red")
                dot.edge(try_node, catch_node)

                for catch_stmt in catch_clause.block:
                    last_node = process_statement(catch_node, catch_stmt, dot)

        elif isinstance(stmt, javalang.tree.StatementExpression):
            if hasattr(stmt.expression, 'member') and stmt.expression.member == "println":
                print_node = f"Print_{id(stmt)}"
                dot.node(print_node, "Print Statement", shape="parallelogram", style="filled", fillcolor="lightgray")
                dot.edge(last_node, print_node)
                last_node = print_node

        elif isinstance(stmt, javalang.tree.Assignment):
            assign_node = f"Assign_{id(stmt)}"
            dot.node(assign_node, f"Assign: {stmt.target.name} = {stmt.value}", shape="rectangle", style="filled", fillcolor="lightblue")
            dot.edge(last_node, assign_node)
            last_node = assign_node

        elif isinstance(stmt, javalang.tree.IfStatement):
            if_node = f"If_{id(stmt)}"
            dot.node(if_node, "If Condition", shape="diamond", style="filled", fillcolor="orange")
            dot.edge(last_node, if_node)
            last_node = if_node

            if stmt.then_statement:
                last_node = process_statement(last_node, stmt.then_statement, dot)

            if stmt.else_statement:
                else_node = f"Else_{id(stmt)}"
                dot.node(else_node, "Else", shape="diamond", style="filled", fillcolor="orange")
                dot.edge(if_node, else_node)
                last_node = process_statement(else_node, stmt.else_statement, dot)

        elif isinstance(stmt, javalang.tree.ForStatement):
            for_node = f"For_{id(stmt)}"
            dot.node(for_node, "For Loop", shape="diamond", style="filled", fillcolor="pink")
            dot.edge(last_node, for_node)
            last_node = for_node

            if stmt.body:
                for sub_stmt in (stmt.body if isinstance(stmt.body, list) else [stmt.body]):
                    last_node = process_statement(last_node, sub_stmt, dot)
                dot.edge(last_node, for_node)

        elif isinstance(stmt, javalang.tree.WhileStatement):
            while_node = f"While_{id(stmt)}"
            dot.node(while_node, "While Loop", shape="diamond", style="filled", fillcolor="pink")
            dot.edge(last_node, while_node)
            last_node = while_node

            if stmt.body:
                for sub_stmt in (stmt.body if isinstance(stmt.body, list) else [stmt.body]):
                    last_node = process_statement(last_node, sub_stmt, dot)
                dot.edge(last_node, while_node)

        return last_node

    except Exception as e:
        error_node = f"Error_{id(stmt)}"
        dot.node(error_node, f"Error in Statement: {str(e)}", shape="rectangle", style="filled", fillcolor="lightcoral")
        dot.edge(last_node, error_node)
        return error_node

# ✅ API Route
@app.route("/generate-flowchart", methods=["POST"])
def generate_flowchart():
    data = request.json

    if not data:
        return jsonify({"error": "No data received"}), 400

    code = data.get("code", "").strip()
    language = data.get("language", "").lower()

    if not code:
        return jsonify({"error": "No code provided"}), 400
    if language not in ["python", "cpp", "java"]:
        return jsonify({"error": "Unsupported language"}), 400

    flowchart_svg, execution_steps, complexity_analysis, optimization_suggestions, memory_analysis = {
        "python": generate_python_flowchart,
        "cpp": generate_cpp_flowchart,
        "java": generate_java_flowchart
    }[language](code)

    return jsonify({
        "flowchart": flowchart_svg,
        "execution_steps": execution_steps,
        "complexity_analysis": complexity_analysis,
        "optimization_suggestions": optimization_suggestions,
        "memory_analysis": memory_analysis
    })

if __name__ == "__main__":
    app.run(port=5000, debug=True)