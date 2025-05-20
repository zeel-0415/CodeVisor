import React, { useState } from "react";
import Editor from "@monaco-editor/react";

const CodeEditor = ({ onCodeChange }) => {
  const [code, setCode] = useState("");

  const handleEditorChange = (value) => {
    setCode(value);
    onCodeChange(value);
  };

  return (
    <div>
      <h2>Code Editor</h2>
      <Editor 
        height="300px"
        language="javascript"
        theme="vs-dark"
        value={code}
        onChange={handleEditorChange}
      />
    </div>
  );
};

export default CodeEditor;
