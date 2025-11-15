const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

const backendURL = '/api';

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', e => { if(e.key==='Enter') sendMessage(); });

function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;
  addMessage('Tú', text);
  userInput.value = '';

  fetch(`${backendURL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text })
  })
  .then(res => res.json())
  .then(data => addMessage('Alejandro iA', data.reply))
  .catch(err => addMessage('Sistema', 'Error conectando con el servidor.'));
}

function addMessage(sender, text) {
  const div = document.createElement('div');
  div.className = sender === 'Tú' ? 'message user' : 'message bot';
  div.innerHTML = `<strong>${sender}:</strong> ${text}`;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
