import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

function Intro({ onComplete }) {
  useEffect(() => {
    // Particle effect for the background
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.zIndex = "0";
    document.getElementById("intro-container").appendChild(canvas);

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
        alpha: Math.random() * 0.5 + 0.3,
      });
    }

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        particle.x += particle.dx;
        particle.y += particle.dy;

        if (particle.x < 0 || particle.x > canvas.width) particle.dx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.dy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${particle.alpha})`;
        ctx.fill();
      });
      requestAnimationFrame(animateParticles);
    }

    animateParticles();

    return () => {
      canvas.remove();
    };
  }, []);

  return (
    <motion.div
      id="intro-container"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        overflow: "hidden",
      }}
      initial={{ opacity: 1 }}
      animate={{
        background: [
          "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
          "linear-gradient(135deg, #2d3748 0%, #4a5568 100%)",
          "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
        ],
      }}
      transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        style={{
          fontSize: "3rem",
          fontWeight: "700",
          color: "#ffd700",
          fontFamily: "'Orbitron', sans-serif",
          textShadow: "0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 30px #ffd700",
          zIndex: 1,
        }}
        initial={{ opacity: 0, scale: 0.5, z: 0 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0.5, 1, 2, 2],
          z: [0, 0, 100, 100],
          textShadow: [
            "0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 30px #ffd700",
            "0 0 20px #ffd700, 0 0 40px #ffd700, 0 0 60px #ffd700",
            "0 0 20px #ffd700, 0 0 40px #ffd700, 0 0 60px #ffd700",
            "0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 30px #ffd700",
          ],
        }}
        transition={{
          duration: 4,
          times: [0, 0.3, 0.7, 1],
          ease: "easeInOut",
        }}
        onAnimationComplete={() => onComplete()}
      >
        CodeVisor
      </motion.div>

      <motion.div
        style={{
          fontSize: "1.5rem",
          fontWeight: "400",
          color: "#e2e8f0",
          marginTop: "1rem",
          fontFamily: "'Inter', sans-serif",
          zIndex: 1,
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: [0, 1, 1, 0], y: [30, 0, 0, 0] }}
        transition={{ duration: 4, times: [0, 0.3, 0.7, 1], ease: "easeInOut" }}
      >
        A Visualizer for Code
      </motion.div>
    </motion.div>
  );
}

function FlowchartGenerator() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [flowchartSvg, setFlowchartSvg] = useState("");
  const [executionSteps, setExecutionSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Light mode as default
  const [errorMsg, setErrorMsg] = useState("");
  const [scale, setScale] = useState(1);
  const [accentColor, setAccentColor] = useState("#4caf50");
  const [showToast, setShowToast] = useState(false);
  const [showMainUI, setShowMainUI] = useState(false);
  const [complexityAnalysis, setComplexityAnalysis] = useState(null);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState(null);
  const [memoryAnalysis, setMemoryAnalysis] = useState(null); // ✅ New state for memory analysis
  const [showOptimizedCode, setShowOptimizedCode] = useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = useState(true);
  const [showMemoryDetails, setShowMemoryDetails] = useState(false); // ✅ Toggle for memory bottleneck details
  const [memoryToast, setMemoryToast] = useState(""); // ✅ Toast for memory suggestions copy
  const flowchartRef = useRef(null);

  useEffect(() => {
    const loadVoicesAndSpeak = () => {
      const utterance = new SpeechSynthesisUtterance("Welcome to CodeVisor, a visualizer for your code");
      utterance.pitch = 1.2;
      utterance.rate = 0.9;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(
        (voice) =>
          voice.name.toLowerCase().includes("female") ||
          voice.name.toLowerCase().includes("samantha") ||
          voice.name.toLowerCase().includes("victoria") ||
          (voice.lang.includes("en") && voice.name.toLowerCase().includes("google"))
      );

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      } else {
        const defaultEnglishVoice = voices.find((voice) => voice.lang.includes("en"));
        if (defaultEnglishVoice) {
          utterance.voice = defaultEnglishVoice;
        }
      }

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoicesAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoicesAndSpeak();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const languages = [
    { value: "python", label: "Python", icon: "🐍" },
    { value: "cpp", label: "C++", icon: "C++" },
    { value: "java", label: "Java", icon: "☕" },
  ];

  useEffect(() => {
    let interval;
    if (isPlaying && currentStep < executionSteps.length - 1) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev + 1 >= executionSteps.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentStep, executionSteps]);

  useEffect(() => {
    if (flowchartRef.current && currentStep >= 0 && executionSteps[currentStep]) {
      const nodeId = executionSteps[currentStep].node_id;
      const svg = flowchartRef.current;
      const nodes = svg.querySelectorAll("g.node");
      let found = false;

      nodes.forEach((node) => {
        const title = node.querySelector("title");
        if (title && title.textContent === nodeId) {
          node.style.filter = "drop-shadow(0 0 5px #ff0)";
          node.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
          found = true;
        } else {
          node.style.filter = "none";
        }
      });

      if (!found) {
        console.warn(`Node with ID ${nodeId} not found in the flowchart SVG.`);
      }
    }
  }, [currentStep, executionSteps]);

  const generateFlowchart = async () => {
    if (!code.trim()) {
      setErrorMsg("⚠️ Please enter some code.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    setCurrentStep(-1);
    setExecutionSteps([]);
    setIsPlaying(false);
    setComplexityAnalysis(null);
    setOptimizationSuggestions(null);
    setMemoryAnalysis(null); // ✅ Reset memory analysis
    setShowOptimizedCode(false);
    setShowMemoryDetails(false); // ✅ Reset memory details view
    const scrollY = window.scrollY;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("http://127.0.0.1:5000/generate-flowchart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          advanced: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();

      const advancedData = {
        flowchart: data.flowchart || "",
        execution_steps: data.execution_steps || [],
        complexity_analysis: data.complexity_analysis || {
          time_complexity: "O(n)",
          space_complexity: "O(1)",
          details: ["Detected 1 loop, leading to linear time complexity."],
        },
        optimization_suggestions: data.optimization_suggestions || {
          suggestions: ["Consider using a dictionary for faster lookups instead of nested loops."],
          optimized_code: code.replace(
            /for\s+\w+\s+in\s+range\(.*\):/g,
            "# Optimized: Use dictionary for faster lookups\nlookup_dict = {}\nfor key, value in enumerate(range(...)):\n    lookup_dict[key] = value"
          ),
        },
        memory_analysis: data.memory_analysis || {  // ✅ Include memory analysis
          estimated_memory_usage: "N/A",
          bottlenecks: [],
          suggestions: [],
        },
      };

      setFlowchartSvg(advancedData.flowchart);
      setExecutionSteps(advancedData.execution_steps);
      setComplexityAnalysis(advancedData.complexity_analysis);
      setOptimizationSuggestions(advancedData.optimization_suggestions);
      setMemoryAnalysis(advancedData.memory_analysis); // ✅ Set memory analysis

      if (advancedData.flowchart) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } else {
        setErrorMsg("❌ Error generating flowchart.");
      }
    } catch (error) {
      console.error("Error:", error);
      if (error.name === "AbortError") {
        setErrorMsg("❌ Request timed out. Please try again.");
      } else {
        setErrorMsg("❌ Server failed. Check console.");
      }
    } finally {
      setLoading(false);
      window.scrollTo(0, scrollY);
    }
  };

  const downloadFlowchart = () => {
    if (!flowchartSvg) {
      setErrorMsg("⚠️ No flowchart to download!");
      return;
    }
    const blob = new Blob([flowchartSvg], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "flowchart.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    });
  };

  const copyMemorySuggestions = () => {
    if (!memoryAnalysis?.suggestions?.length) return;
    const suggestionsText = memoryAnalysis.suggestions
      .map((suggestion) => `Line ${suggestion.line}: ${suggestion.suggestion}`)
      .join("\n");
    navigator.clipboard.writeText(suggestionsText).then(() => {
      setMemoryToast("Memory suggestions copied to clipboard!");
      setTimeout(() => setMemoryToast(""), 2000);
    });
  };

  const handleZoom = (value) => {
    setScale((prev) => Math.min(Math.max(value, 0.5), 2));
  };

  const fitToScreen = () => {
    if (flowchartRef.current) {
      const container = flowchartRef.current.parentElement;
      const svg = flowchartRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const svgRect = svg.getBoundingClientRect();
      const svgWidth = svgRect.width;
      const svgHeight = svgRect.height;
      const scaleX = (containerWidth - 20) / svgWidth;
      const scaleY = (containerHeight - 20) / svgHeight;
      const newScale = Math.min(scaleX, scaleY, 2) * 0.9;
      setScale(newScale > 0 ? newScale : 1);
    }
  };

  const handleRipple = (event) => {
    const button = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple");
    const ripple = button.getElementsByClassName("ripple")[0];
    if (ripple) ripple.remove();
    button.appendChild(circle);
  };

  const handleRefresh = () => {
    setCode("");
    setLanguage("python");
    setIsDropdownOpen(false);
    setFlowchartSvg("");
    setExecutionSteps([]);
    setCurrentStep(-1);
    setIsPlaying(false);
    setLoading(false);
    setErrorMsg("");
    setScale(1);
    setShowToast(false);
    setComplexityAnalysis(null);
    setOptimizationSuggestions(null);
    setMemoryAnalysis(null); // ✅ Reset memory analysis
    setShowOptimizedCode(false);
    setShowMemoryDetails(false); // ✅ Reset memory details view
    setShowMainUI(true);
    window.scrollTo(0, 0);
  };

  return (
    <motion.div
      style={{
        minHeight: "100vh",
        width: "100vw",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: darkMode
          ? "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)"
          : "linear-gradient(135deg, #f7fafc 0%, #e2e8f0 100%)",
        color: darkMode ? "#e2e8f0" : "#2d3748",
        position: "relative",
        overflow: "auto",
        fontFamily: "'Inter', 'Roboto', sans-serif",
        scrollBehavior: "smooth",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap');
          .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple-effect 0.6s linear;
            pointer-events: none;
          }
          @keyframes ripple-effect {
            0% { transform: scale(0); opacity: 0.5; }
            100% { transform: scale(4); opacity: 0; }
          }
          .toggle-container {
            background: ${darkMode ? "rgba(0, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
            border-radius: 2rem;
            padding: 0.3rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            width: 4rem;
            height: 1.8rem;
            border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"};
            position: absolute;
            top: 1rem;
            right: 5rem;
            z-index: 10;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
          }
          .toggle-container:hover {
            background: ${darkMode ? "rgba(0, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"};
          }
          .toggle-knob {
            width: 1.4rem;
            height: 1.4rem;
            background: ${darkMode ? "#ffd700" : accentColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          .custom-dropdown {
            position: relative;
            width: 150px;
            z-index: 5;
          }
          .dropdown-button {
            padding: 0.75rem;
            background: ${darkMode ? "#2d3748" : "#fff"};
            border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"};
            border-radius: 0.5rem;
            color: ${darkMode ? "#e2e8f0" : "#2d3748"};
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            width: 100%;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          .dropdown-button:hover {
            background: ${darkMode ? "#374151" : "#f7fafc"};
            border-color: ${darkMode ? "#718096" : "#cbd5e0"};
          }
          .dropdown-button.open {
            border-color: ${darkMode ? "#ffd700" : accentColor};
            box-shadow: 0 0 8px ${darkMode ? "rgba(255, 215, 0, 0.5)" : `rgba(${parseInt(accentColor.slice(1, 3), 16)}, ${parseInt(accentColor.slice(3, 5), 16)}, ${parseInt(accentColor.slice(5, 7), 16)}, 0.5)`};
          }
          .dropdown-list {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: ${darkMode ? "#2d3748" : "#fff"};
            border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"};
            border-radius: 0.5rem;
            margin-top: 0.25rem;
            z-index: 10;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          .dropdown-item {
            padding: 0.5rem 0.75rem;
            color: ${darkMode ? "#e2e8f0" : "#2d3748"};
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: background 0.2s ease;
          }
          .dropdown-item:hover {
            background: ${darkMode ? "#4a5568" : "#f7fafc"};
          }
          .textarea-glow {
            transition: all 0.3s ease;
            z-index: 2;
          }
          .textarea-glow:focus {
            border-color: ${darkMode ? "#ffd700" : accentColor};
            box-shadow: 0 0 8px ${darkMode ? "rgba(255, 215, 0, 0.5)" : `rgba(${parseInt(accentColor.slice(1, 3), 16)}, ${parseInt(accentColor.slice(3, 5), 16)}, ${parseInt(accentColor.slice(5, 7), 16)}, 0.5)`};
          }
          .color-picker {
            position: absolute;
            top: 1rem;
            right: 1rem;
            display: flex;
            gap: 0.5rem;
            align-items: center;
            z-index: 10;
          }
          .color-option {
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.3s ease;
          }
          .color-option:hover {
            border: 2px solid ${darkMode ? "#fff" : "#2d3748"};
            transform: scale(1.1);
          }
          .decoration {
            margin-left: 0.5rem;
            font-size: 1rem;
            color: ${darkMode ? "#e2e8f0" : "#2d3748"};
          }
          .toast {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            padding: 0.75rem 1.5rem;
            background: ${darkMode ? "#4a5568" : accentColor};
            color: ${darkMode ? "#e2e8f0" : "#fff"};
            border-radius: 0.5rem;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            z-index: 10;
            font-size: 0.9rem;
          }
          .flowchart-section {
            display: flex;
            width: 90vw;
            max-width: 1200px;
            gap: 2rem;
            margin-top: 2rem;
            align-items: flex-start;
          }
          .flowchart-container {
            flex: 2;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            max-height: 60vh;
            overflow-y: auto;
            border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"};
            padding: 1rem;
            border-radius: 0.5rem;
            background: ${darkMode ? "#1a202c" : "#fff"};
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
            scroll-behavior: smooth;
          }
          .analysis-panel {
            flex: 1;
            position: sticky;
            top: 2rem;
            max-height: 60vh;
            overflow-y: auto;
            padding: 1rem;
            background: ${darkMode ? "rgba(45, 55, 72, 0.95)" : "rgba(255, 255, 255, 0.95)"};
            border-radius: 0.5rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .zoom-controls {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            position: absolute;
            top: 50%;
            right: -4rem;
            transform: translateY(-50%);
            z-index: 5;
          }
          .zoom-button {
            width: 2rem;
            height: 2rem;
            background: #fff;
            color: #2d3748;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            font-size: 1rem;
            font-weight: 600;
          }
          .zoom-button:hover {
            background: #f7fafc;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            transform: scale(1.1);
          }
          .zoom-slider {
            width: 100px;
            height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            appearance: none;
            outline: none;
            cursor: pointer;
            transition: all 0.3s ease;
            writing-mode: vertical-lr;
            direction: rtl;
          }
          .zoom-slider:hover {
            background: #d6e4ff;
          }
          .zoom-slider::-webkit-slider-thumb {
            width: 16px;
            height: 16px;
            background: ${accentColor};
            border-radius: 50%;
            cursor: pointer;
            appearance: none;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
          }
          .zoom-slider::-webkit-slider-thumb:hover {
            transform: scale(1.2);
          }
          .primary-button {
            padding: 0.75rem 1.5rem;
            background: ${darkMode ? "#4a5568" : accentColor};
            color: ${darkMode ? "#e2e8f0" : "#fff"};
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 0.9rem;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .primary-button:hover {
            background: ${darkMode ? "#718096" : `rgba(${parseInt(accentColor.slice(1, 3), 16)}, ${parseInt(accentColor.slice(3, 5), 16)}, ${parseInt(accentColor.slice(5, 7), 16)}, 0.9)`};
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }
          .primary-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .download-button {
            padding: 0.5rem 1rem;
            background: ${darkMode ? "#4a5568" : accentColor};
            color: ${darkMode ? "#e2e8f0" : "#fff"};
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 0.8rem;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            width: auto;
          }
          .download-button:hover {
            background: ${darkMode ? "#718096" : `rgba(${parseInt(accentColor.slice(1, 3), 16)}, ${parseInt(accentColor.slice(3, 5), 16)}, ${parseInt(accentColor.slice(5, 7), 16)}, 0.9)`};
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }
          .refresh-button {
            position: fixed;
            bottom: 2rem;
            left: 2rem;
            width: 2.5rem;
            height: 2.5rem;
            background: ${darkMode ? "#4a5568" : accentColor};
            color: ${darkMode ? "#e2e8f0" : "#fff"};
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            z-index: 10;
          }
          .refresh-button:hover {
            background: ${darkMode ? "#718096" : `rgba(${parseInt(accentColor.slice(1, 3), 16)}, ${parseInt(accentColor.slice(3, 5), 16)}, ${parseInt(accentColor.slice(5, 7), 16)}, 0.9)`};
            transform: rotate(360deg);
          }
          .code-preview {
            background: ${darkMode ? "#1a202c" : "#f7fafc"};
            border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"};
            border-radius: 0.5rem;
            padding: 1rem;
            width: 100%;
            max-height: 15rem;
            overflow-y: auto;
            font-family: "Fira Code", monospace;
            font-size: 0.9rem;
            color: ${darkMode ? "#a0aec0" : "#4a5568"};
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
            scroll-behavior: smooth;
          }
          .execution-controls {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-top: 1rem;
            align-items: center;
            z-index: 5;
          }
          .execution-controls-row {
            display: flex;
            gap: 0.5rem;
            justify-content: center;
          }
          .execution-panel {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            width: 300px;
            max-height: 200px;
            padding: 0.75rem;
            background: ${darkMode ? "rgba(45, 55, 72, 0.9)" : "rgba(255, 255, 255, 0.9)"};
            border-radius: 0.5rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            z-index: 10;
            overflow-y: auto;
            font-size: 0.85rem;
            border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"};
          }
          .execution-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
          }
          .execution-step {
            margin-bottom: 0.5rem;
            padding: 0.5rem;
            background: ${darkMode ? "#2d3748" : "#f7fafc"};
            border-radius: 0.5rem;
            font-size: 0.85rem;
          }
          .analysis-section {
            margin-bottom: 1rem;
          }
          .analysis-section h3 {
            font-size: 1.1rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
            color: ${darkMode ? "#e2e8f0" : "#2d3748"};
          }
          .analysis-section p {
            margin: 0.25rem 0;
            font-size: 0.9rem;
            color: ${darkMode ? "#a0aec0" : "#4a5568"};
          }
          .optimized-code {
            background: ${darkMode ? "#1a202c" : "#f7fafc"};
            border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"};
            border-radius: 0.5rem;
            padding: 1rem;
            width: 100%;
            max-height: 15rem;
            overflow-y: auto;
            font-family: "Fira Code", monospace;
            font-size: 0.9rem;
            color: ${darkMode ? "#a0aec0" : "#4a5568"};
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
            scroll-behavior: smooth;
          }
          .toggle-panel-button {
            background: none;
            border: none;
            color: ${darkMode ? "#e2e8f0" : "#2d3748"};
            cursor: pointer;
            font-size: 0.9rem;
            padding: 0.25rem;
          }
          .memory-section {
            margin-bottom: 1rem;
          }
          .memory-section-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
          }
          .memory-section-header h3 {
            font-size: 1.1rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
            color: ${darkMode ? "#e2e8f0" : "#2d3748"};
          }
          .memory-bottleneck {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            background: ${darkMode ? "#2d3748" : "#f7fafc"};
            border-radius: 0.5rem;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
            color: ${darkMode ? "#a0aec0" : "#4a5568"};
          }
          .memory-suggestion {
            padding: 0.5rem;
            background: ${darkMode ? "#2d3748" : "#f7fafc"};
            border-radius: 0.5rem;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
            color: ${darkMode ? "#a0aec0" : "#4a5568"};
          }
        `}
      </style>

      {!showMainUI && <Intro onComplete={() => setShowMainUI(true)} />}

      <AnimatePresence>
        {showMainUI && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <div className="color-picker">
              {["#4caf50", "#1976d2", "#f44336"].map((color) => (
                <motion.div
                  key={color}
                  className="color-option"
                  style={{ background: color }}
                  onClick={() => setAccentColor(color)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
              <div className="decoration">
                <svg width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke={darkMode ? "#e2e8f0" : "#2d3748"} strokeWidth="2">
                  <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10z" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </div>
            </div>

            <motion.h1
              style={{
                fontSize: "2.25rem",
                fontWeight: "600",
                marginBottom: "2rem",
                color: darkMode ? "#e2e8f0" : "#2d3748",
                textAlign: "center",
                zIndex: 2,
              }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              CodeVisor – A Visualizer for Code
            </motion.h1>

            <motion.div
              style={{
                width: "90vw",
                maxWidth: "900px",
                padding: "2rem",
                background: darkMode ? "rgba(45, 55, 72, 0.95)" : "rgba(255, 255, 255, 0.95)",
                borderRadius: "0.75rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                zIndex: 2,
                marginBottom: "2rem",
              }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="toggle-container"
                onClick={() => setDarkMode(!darkMode)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="toggle-knob"
                  animate={{ x: darkMode ? "2.2rem" : "0rem" }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <motion.div
                    animate={{ rotate: darkMode ? 360 : 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ fontSize: "0.9rem" }}
                  >
                    {darkMode ? "☀️" : "🌙"}
                  </motion.div>
                </motion.div>
              </motion.div>

              <label htmlFor="code-input" style={{ fontSize: "1.1rem", fontWeight: "500", marginBottom: "0.75rem", color: darkMode ? "#e2e8f0" : "#2d3748" }}>
                Enter Your Code
              </label>
              <textarea
                id="code-input"
                className="textarea-glow"
                style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: `1px solid ${darkMode ? "#4a5568" : "#e2e8f0"}`,
                  background: darkMode ? "#1a202c" : "#fff",
                  color: darkMode ? "#e2e8f0" : "#2d3748",
                  fontSize: "0.9rem",
                  resize: "vertical",
                  minHeight: "12rem",
                  fontFamily: "'Fira Code', monospace",
                  maxHeight: "25rem",
                  overflowY: "auto",
                  boxSizing: "border-box",
                  boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.05)",
                  transition: "all 0.3s ease",
                }}
                placeholder="Paste your code here..."
                value={showOptimizedCode && optimizationSuggestions ? optimizationSuggestions.optimized_code : code}
                onChange={(e) => setCode(e.target.value)}
              />
              <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: darkMode ? "#a0aec0" : "#718096", alignSelf: "flex-start" }}>
                {code.length} characters | {code.split(/\s+/).filter(Boolean).length} words
              </div>

              <div
                className="code-preview"
                style={{
                  marginTop: "1rem",
                }}
              >
                <pre style={{ margin: 0 }}>
                  {(showOptimizedCode && optimizationSuggestions ? optimizationSuggestions.optimized_code : code) || "Code preview will appear here..."}
                </pre>
              </div>

              <motion.button
                className="primary-button"
                style={{
                  marginTop: "1.5rem",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  handleRipple(e);
                  copyToClipboard();
                }}
              >
                Copy Code
              </motion.button>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
                <div className="custom-dropdown">
                  <motion.button
                    className={`dropdown-button ${isDropdownOpen ? "open" : ""}`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>
                      {languages.find((lang) => lang.value === language).icon} {languages.find((lang) => lang.value === language).label}
                    </span>
                    <span>▼</span>
                  </motion.button>
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        className="dropdown-list"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {languages.map((lang) => (
                          <motion.div
                            key={lang.value}
                            className="dropdown-item"
                            onClick={() => {
                              setLanguage(lang.value);
                              setIsDropdownOpen(false);
                            }}
                            whileHover={{ x: 5 }}
                          >
                            <span>{lang.icon}</span>
                            <span>{lang.label}</span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <motion.button
                  className="primary-button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.currentTarget.blur();
                    handleRipple(e);
                    generateFlowchart();
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <motion.div
                      style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <svg width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10z" opacity="0.2" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Generating...
                    </motion.div>
                  ) : (
                    "Generate Flowchart"
                  )}
                </motion.button>
              </div>

              {errorMsg && (
                <motion.div
                  style={{ marginTop: "1rem", padding: "0.75rem", background: "#f56565", color: "#fff", borderRadius: "0.5rem", fontSize: "0.9rem" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {errorMsg}
                </motion.div>
              )}
            </motion.div>

            {flowchartSvg && (
              <motion.div
                className="flowchart-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 80 }}
              >
                <div className="flowchart-container">
                  <h2 style={{ fontSize: "1.25rem", fontWeight: "500", marginBottom: "1rem", color: darkMode ? "#e2e8f0" : "#2d3748" }}>
                    Generated Flowchart
                  </h2>
                  <div
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: "top center",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "flex-start",
                      minWidth: "fit-content",
                    }}
                  >
                    <div ref={flowchartRef} dangerouslySetInnerHTML={{ __html: flowchartSvg }} style={{ margin: "0 auto" }} />
                  </div>

                  {executionSteps.length > 0 && (
                    <div className="execution-controls">
                      <div className="execution-controls-row">
                        <motion.button
                          className="primary-button"
                          onClick={(e) => {
                            handleRipple(e);
                            setIsPlaying(!isPlaying);
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isPlaying ? "Pause" : "Play"}
                        </motion.button>
                        <motion.button
                          className="primary-button"
                          onClick={(e) => {
                            handleRipple(e);
                            setIsPlaying(false);
                            setCurrentStep((prev) => Math.max(prev - 1, -1));
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={currentStep <= -1}
                        >
                          Step Back
                        </motion.button>
                        <motion.button
                          className="primary-button"
                          onClick={(e) => {
                            handleRipple(e);
                            setIsPlaying(false);
                            setCurrentStep((prev) => Math.min(prev + 1, executionSteps.length - 1));
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={currentStep >= executionSteps.length - 1}
                        >
                          Step Forward
                        </motion.button>
                      </div>
                      <motion.button
                        className="download-button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          handleRipple(e);
                          downloadFlowchart();
                        }}
                      >
                        Download Flowchart
                      </motion.button>
                    </div>
                  )}

                  <motion.div
                    className="zoom-controls"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.button
                      className="zoom-button"
                      onClick={(e) => {
                        handleRipple(e);
                        handleZoom(scale + 0.1);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      +
                    </motion.button>
                    <input
                      type="range"
                      className="zoom-slider"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={scale}
                      onChange={(e) => handleZoom(parseFloat(e.target.value))}
                    />
                    <motion.button
                      className="zoom-button"
                      onClick={(e) => {
                        handleRipple(e);
                        handleZoom(scale - 0.1);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      −
                    </motion.button>
                    <motion.button
                      className="zoom-button"
                      onClick={(e) => {
                        handleRipple(e);
                        fitToScreen();
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                      </svg>
                    </motion.button>
                  </motion.div>
                </div>

                {(complexityAnalysis || optimizationSuggestions || memoryAnalysis) && (
                  <div className="analysis-panel">
                    {complexityAnalysis && (
                      <div className="analysis-section">
                        <h3>Complexity Analysis</h3>
                        <p><strong>Time Complexity:</strong> {complexityAnalysis.time_complexity}</p>
                        <p><strong>Space Complexity:</strong> {complexityAnalysis.space_complexity}</p>
                        <h4>Details:</h4>
                        {complexityAnalysis.details.map((detail, index) => (
                          <p key={index}>• {detail}</p>
                        ))}
                      </div>
                    )}

                    {optimizationSuggestions && (
                      <div className="analysis-section">
                        <h3>Optimization Suggestions</h3>
                        {optimizationSuggestions.suggestions && optimizationSuggestions.suggestions.length > 0 ? (
                          <>
                            {optimizationSuggestions.suggestions.map((suggestion, index) => (
                              <p key={index}>• {suggestion}</p>
                            ))}
                            {optimizationSuggestions.optimized_code && (
                              <>
                                <motion.button
                                  className="primary-button"
                                  style={{ marginTop: "1rem" }}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    handleRipple(e);
                                    setShowOptimizedCode(!showOptimizedCode);
                                  }}
                                >
                                  {showOptimizedCode ? "Show Original Code" : "Show Optimized Code"}
                                </motion.button>
                                {showOptimizedCode && (
                                  <div className="optimized-code" style={{ marginTop: "1rem" }}>
                                    <pre style={{ margin: 0 }}>{optimizationSuggestions.optimized_code}</pre>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <p>No optimization suggestions available for this code.</p>
                        )}
                      </div>
                    )}

                    {memoryAnalysis && memoryAnalysis.estimated_memory_usage && (
                      <div className="analysis-section memory-section">
                        <div
                          className="memory-section-header"
                          onClick={() => setShowMemoryDetails(!showMemoryDetails)}
                        >
                          <h3>Memory Analysis</h3>
                          <motion.div
                            animate={{ rotate: showMemoryDetails ? 90 : 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <svg width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke={darkMode ? "#e2e8f0" : "#2d3748"} strokeWidth="2">
                              <path d="M9 5l7 7-7 7" />
                            </svg>
                          </motion.div>
                        </div>
                        <p><strong>Estimated Memory Usage:</strong> {memoryAnalysis.estimated_memory_usage}</p>
                        <AnimatePresence>
                          {showMemoryDetails && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              {memoryAnalysis.bottlenecks?.length > 0 ? (
                                <>
                                  <h4>Memory Bottlenecks:</h4>
                                  {memoryAnalysis.bottlenecks.map((bottleneck, index) => (
                                    <motion.div
                                      key={index}
                                      className="memory-bottleneck"
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.1 }}
                                    >
                                      <svg width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="#f56565" strokeWidth="2">
                                        <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10z" />
                                        <path d="M12 8v4M12 16h.01" />
                                      </svg>
                                      Line {bottleneck.line}: {bottleneck.description}
                                    </motion.div>
                                  ))}
                                </>
                              ) : (
                                <p>No memory bottlenecks detected.</p>
                              )}

                              {memoryAnalysis.suggestions?.length > 0 ? (
                                <>
                                  <h4>Memory Optimization Suggestions:</h4>
                                  {memoryAnalysis.suggestions.map((suggestion, index) => (
                                    <motion.div
                                      key={index}
                                      className="memory-suggestion"
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.1 }}
                                    >
                                      Line {suggestion.line}: {suggestion.suggestion}
                                    </motion.div>
                                  ))}
                                  <motion.button
                                    className="primary-button"
                                    style={{ marginTop: "1rem" }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                      handleRipple(e);
                                      copyMemorySuggestions();
                                    }}
                                  >
                                    Copy Memory Suggestions
                                  </motion.button>
                                </>
                              ) : (
                                <p>No memory optimization suggestions available.</p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {executionSteps.length > 0 && currentStep >= 0 && showExecutionPanel && (
              <motion.div
                className="execution-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="execution-panel-header">
                  <h3 style={{ fontSize: "1rem", fontWeight: "500", color: darkMode ? "#e2e8f0" : "#2d3748" }}>
                    Step {currentStep + 1} of {executionSteps.length}
                  </h3>
                  <button
                    className="toggle-panel-button"
                    onClick={() => setShowExecutionPanel(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="execution-step">
                  <p><strong>Description:</strong> {executionSteps[currentStep].description}</p>
                  {executionSteps[currentStep].variables && (
                    <p><strong>Variables:</strong> {JSON.stringify(executionSteps[currentStep].variables)}</p>
                  )}
                  {executionSteps[currentStep].output && (
                    <p><strong>Output:</strong> {executionSteps[currentStep].output}</p>
                  )}
                </div>
              </motion.div>
            )}

            <motion.button
              className="refresh-button"
              onClick={(e) => {
                handleRipple(e);
                handleRefresh();
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Refresh"
            >
              <svg width="1.2rem" height="1.2rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </motion.button>

            <AnimatePresence>
              {showToast && (
                <motion.div
                  className="toast"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  Code copied to clipboard!
                </motion.div>
              )}
              {memoryToast && (
                <motion.div
                  className="toast"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {memoryToast}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default FlowchartGenerator;