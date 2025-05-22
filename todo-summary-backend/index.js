const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { WebClient } = require("@slack/web-api");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory store for todos
let todos = [];

// Routes
app.get("/todos", (req, res) => {
  res.json(todos);
});

app.post("/todos", (req, res) => {
  const { text } = req.body;
  const newTodo = {
    id: Date.now().toString(),
    text,
    completed: false,
  };
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

app.delete("/todos/:id", (req, res) => {
  const { id } = req.params;
  todos = todos.filter(todo => todo.id !== id);
  res.json({ success: true });
});

app.post("/summarize", async (req, res) => {
  try {
    if (todos.length === 0) {
      return res.status(400).json({ message: "No todos to summarize." });
    }

    const summaryPrompt = `Summarize the following to-dos in a concise, friendly tone:\n\n${todos.map(t => `- ${t.text}`).join('\n')}\n\nSummary:`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: summaryPrompt }],
    });

    const summary = response.choices[0].message.content.trim();

    // Send to Slack
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    const slackResponse = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: summary }),
    });

    if (!slackResponse.ok) {
      throw new Error("Failed to send to Slack.");
    }

    res.json({ success: true, summary });
  } catch (error) {
    console.error("Error during summarization:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
// PUT /todos/:id - edit a todo
app.put("/todos/:id", (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    const todo = todos.find(t => t.id === id);
    if (!todo) return res.status(404).json({ message: "Todo not found" });
    todo.text = text;
    res.json(todo);
  });