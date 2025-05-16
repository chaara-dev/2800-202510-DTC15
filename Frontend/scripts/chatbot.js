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
