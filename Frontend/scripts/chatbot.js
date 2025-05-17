function toggleChat() {
  const popup = document.getElementById("chat-popup");
  popup.style.display = (popup.style.display === "none") ? "block" : "none";
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const msg = input.value;
  appendMessage("You: " + msg);
  
  const res = await fetch("/ask-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: msg })
  });

  const data = await res.json();
  appendMessage("PlantPal AI: " + data.answer);
  input.value = "";
}

function appendMessage(message) {
  const log = document.getElementById("chat-log");
  const p = document.createElement("p");
  p.textContent = message;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
}

const inputField = document.querySelector("#chat-input");
const sendButton = document.querySelector("#chat-send");
const chatBox = document.querySelector("#chat-box");
const chatPopup = document.querySelector("#chat-popup");

function toggleChat() {
  if (chatPopup.style.display === "none") {
    chatPopup.style.display = "block";
  } else {
    chatPopup.style.display = "none";
  }
}

sendButton.addEventListener("click", () => {
  const userMessage = inputField.value.trim();
  if (userMessage) {
    addMessage("You", userMessage);
    inputField.value = "";
    botReply(userMessage);
  }
});

inputField.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendButton.click();
  }
});

function addMessage(sender, message) {
  const messageElement = document.createElement("div");
  messageElement.textContent = `${sender}: ${message}`;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function botReply(message) {
  let response;
  const msg = message.toLowerCase();

  if (msg.includes("hello") || msg.includes("hi")) {
    response = "Hi there! How can I help you with your plants today?";
  } else if (msg.includes("add plant")) {
    response = "You can add a plant by clicking the 'Add New Plant' button above.";
  } else if (msg.includes("water")) {
    response = "Don't forget to check if your plant actually needs watering!";
  } else if (msg.includes("help")) {
    response = "Sure! Ask about adding, viewing, or caring for your plants.";
  } else {
    response = "Sorry, I didn't quite get that 🌱 Try asking something else!";
  }

  setTimeout(() => addMessage("PlantPal Assistant", response), 500);
}
