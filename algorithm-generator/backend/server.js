const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/generate_flowchart", async (req, res) => {
  try {
    const response = await axios.post("http://127.0.0.1:5001/generate_flowchart", req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate flowchart" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
