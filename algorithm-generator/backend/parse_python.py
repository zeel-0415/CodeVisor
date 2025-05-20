import ast
import astor

def parse_python_code(code):
    try:
        # Parse the Python code into an AST (Abstract Syntax Tree)
        tree = ast.parse(code)

        # Convert AST to a readable format for execution steps
        ast_nodes = []

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                ast_nodes.append({
                    "node_id": f"node_{id(node)}",
                    "description": f"Function: {node.name}",
                    "variables": {},
                    "output": None
                })
            elif isinstance(node, ast.If):
                ast_nodes.append({
                    "node_id": f"node_{id(node)}",
                    "description": f"If Statement: {astor.to_source(node.test).strip()}",
                    "variables": {},
                    "output": None
                })
            elif isinstance(node, ast.For):
                ast_nodes.append({
                    "node_id": f"node_{id(node)}",
                    "description": f"For Loop: iterating over {astor.to_source(node.iter).strip()}",
                    "variables": {},
                    "output": None
                })
            elif isinstance(node, ast.While):
                ast_nodes.append({
                    "node_id": f"node_{id(node)}",
                    "description": f"While Loop: {astor.to_source(node.test).strip()}",
                    "variables": {},
                    "output": None
                })
            elif isinstance(node, ast.Assign):
                targets = [astor.to_source(t).strip() for t in node.targets]
                value = astor.to_source(node.value).strip()
                ast_nodes.append({
                    "node_id": f"node_{id(node)}",
                    "description": f"Assignment: {' = '.join(targets)} = {value}",
                    "variables": {target: value for target in targets},
                    "output": None
                })
            elif isinstance(node, ast.Expr):
                ast_nodes.append({
                    "node_id": f"node_{id(node)}",
                    "description": f"Expression: {astor.to_source(node).strip()}",
                    "variables": {},
                    "output": None
                })

        return ast_nodes

    except Exception as e:
        return [{"node_id": "error", "description": f"Error parsing Python code: {str(e)}", "variables": {}, "output": None}]

def analyze_complexity(code):
    try:
        tree = ast.parse(code)
        time_complexity = "O(1)"  # Default
        space_complexity = "O(1)"  # Default
        details = []

        # Analyze loops and recursive calls
        loop_count = 0
        nested_loops = 0
        max_nested = 0
        recursive_calls = 0

        def count_loops(node, depth=0):
            nonlocal loop_count, nested_loops, max_nested, recursive_calls
            if isinstance(node, (ast.For, ast.While)):
                loop_count += 1
                nested_loops = max(nested_loops, depth)
                max_nested = max(max_nested, depth)
                for child in ast.iter_child_nodes(node):
                    count_loops(child, depth + 1)
            elif isinstance(node, ast.Call):
                # Check for recursive calls (simplified)
                if isinstance(node.func, ast.Name):
                    for parent in ast.walk(tree):
                        if isinstance(parent, ast.FunctionDef) and parent.name == node.func.id:
                            recursive_calls += 1
            for child in ast.iter_child_nodes(node):
                count_loops(child, depth)

        count_loops(tree)

        # Determine time complexity
        if recursive_calls > 0:
            time_complexity = "O(2^n)"  # Simplified for recursion
            details.append("Detected recursive calls, leading to exponential time complexity.")
        elif nested_loops > 0:
            time_complexity = f"O(n^{nested_loops + 1})"
            details.append(f"Detected {nested_loops + 1} nested loops, leading to polynomial time complexity.")
        elif loop_count > 0:
            time_complexity = "O(n)"
            details.append("Detected a single loop, leading to linear time complexity.")
        else:
            time_complexity = "O(1)"
            details.append("No loops or recursion detected, constant time complexity.")

        # Determine space complexity (simplified)
        variables = sum(1 for node in ast.walk(tree) if isinstance(node, (ast.Name, ast.Assign)))
        if recursive_calls > 0:
            space_complexity = "O(n)"  # Stack space for recursion
            details.append("Recursive calls detected, leading to linear space complexity due to call stack.")
        elif variables > 0:
            space_complexity = "O(1)"
            details.append("Only a constant number of variables detected.")
        else:
            space_complexity = "O(1)"
            details.append("Minimal space usage detected.")

        return {
            "time_complexity": time_complexity,
            "space_complexity": space_complexity,
            "details": details
        }
    except Exception as e:
        return {
            "time_complexity": "N/A",
            "space_complexity": "N/A",
            "details": [f"Error analyzing complexity: {str(e)}"]
        }

def suggest_optimizations(code):
    try:
        tree = ast.parse(code)
        suggestions = []
        optimized_code = code

        # Rule-based optimization: Replace inefficient patterns
        for node in ast.walk(tree):
            # Example 1: Replace nested loops with list comprehension (simplified)
            if isinstance(node, ast.For):
                for child in ast.iter_child_nodes(node):
                    if isinstance(child, ast.For):
                        suggestions.append("Consider replacing nested loops with a list comprehension for better performance.")
                        # Simplified transformation (for demonstration)
                        optimized_code = optimized_code.replace(
                            "for", "Optimized: Use list comprehension", 1
                        )
                        break

            # Example 2: Suggest using sets for membership testing
            if isinstance(node, ast.If) and isinstance(node.test, ast.Compare):
                if isinstance(node.test.left, ast.Name) and isinstance(node.test.comparators[0], ast.List):
                    suggestions.append("Consider using a set instead of a list for membership testing to reduce time complexity from O(n) to O(1).")

        return {
            "suggestions": suggestions,
            "optimized_code": optimized_code
        }
    except Exception as e:
        return {
            "suggestions": [f"Error suggesting optimizations: {str(e)}"],
            "optimized_code": code
        }