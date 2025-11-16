const chatBox = document.getElementById("chat");
const input = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");

function addMessage(msg, sender) {
  const div = document.createElement("div");
  div.textContent = msg;
  div.className = `message ${sender}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Saludo inicial de Alejandro Ai
window.addEventListener("load", async () => {
  try {
    const res = await fetch("/");
    const greeting = await res.text();
    addMessage(greeting, "bot");
  } catch (err) {
    addMessage("⚠️ Error al cargar saludo inicial", "bot");
  }
});

async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;
  addMessage(message, "user");
  input.value = "";

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    addMessage(data.reply, "bot");
  } catch (err) {
    addMessage("⚠️ Error al enviar mensaje", "bot");
  }
}

// Botón y Enter
sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
