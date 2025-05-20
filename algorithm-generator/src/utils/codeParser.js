import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import nlp from "compromise"; // NLP processing

// Function to parse Python code using a backend API
export const parsePythonCode = async (code) => {
  try {
    const response = await fetch("http://localhost:5000/parse-python", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) throw new Error("Failed to parse Python code");

    const data = await response.json();
    return data.ast || ["Parsing failed"];
  } catch (error) {
    console.error("Python Parsing Error:", error);
    return ["Error parsing Python code"];
  }
};

// Function to parse JavaScript code using AST
export const parseJavaScriptCode = (code) => {
  try {
    const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
    let structure = [];

    traverse(ast, {
      enter(path) {
        structure.push(path.node.type);
      },
    });

    return structure.length > 0 ? structure : ["No significant AST nodes found"];
  } catch (error) {
    console.error("JavaScript Parsing Error:", error);
    return ["Error parsing JavaScript code"];
  }
};

// Function to process natural language algorithms using NLP
export const processAlgorithmText = (text) => {
  try {
    let doc = nlp(text);
    let steps = doc.sentences().out("array");

    // Extract key verbs and nouns for better flowchart generation
    let actions = steps.map((sentence) => ({
      text: sentence,
      verbs: nlp(sentence).verbs().out("array"),
      nouns: nlp(sentence).nouns().out("array"),
    }));

    return actions.length > 0 ? actions : ["Could not extract meaningful steps"];
  } catch (error) {
    console.error("NLP Processing Error:", error);
    return ["Error processing algorithm text"];
  }
};

// Function to fetch and display flowchart from backend
export const fetchFlowchart = async (code) => {
  try {
    const response = await fetch("http://localhost:5000/generate-flowchart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) throw new Error("Failed to generate flowchart");

    const data = await response.json();
    return data.flowchart || "Error generating flowchart";
  } catch (error) {
    console.error("Flowchart Fetch Error:", error);
    return "Error fetching flowchart";
  }
};
