import React, { useState } from "react";
import CodeEditor from "../components/CodeEditor";
import Flowchart from "../components/FlowchartGenerator";

const Home = () => {
  const [code, setCode] = useState("");

  return (
    <div>
      <h1>Algorithm Generator</h1>
      <CodeEditor onCodeChange={setCode} />
      <Flowchart code={code} />
    </div>
  );
};

export default Home;
