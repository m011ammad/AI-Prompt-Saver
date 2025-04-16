const addBtn = document.getElementById('add-btn');
const inputBox = document.getElementById('input-box');
const saveBtn = document.getElementById('save-btn');
const nameInput = document.getElementById('prompt-name');
const textInput = document.getElementById('prompt-text');
const list = document.getElementById('prompt-list');
const deleteConfirmation = document.getElementById('delete-confirmation');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');

let editingIndex = null;
let promptToDelete = null;
let draggedItemIndex = null;

function loadPrompts() {
  chrome.storage.sync.get(['prompts'], data => {
    const prompts = data.prompts || [];
    list.innerHTML = '';
    prompts.forEach((item, index) => {
      const box = document.createElement('div');
      box.className = 'prompt-box';
      box.setAttribute('draggable', true);
      box.dataset.index = index;

      box.addEventListener('dragstart', e => {
        draggedItemIndex = index;
        e.dataTransfer.effectAllowed = 'move';
      });

      box.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      box.addEventListener('drop', e => {
        e.preventDefault();
        const targetIndex = parseInt(box.dataset.index);
        if (draggedItemIndex === targetIndex) return;

        const newPrompts = [...prompts];
        const [movedItem] = newPrompts.splice(draggedItemIndex, 1);
        newPrompts.splice(targetIndex, 0, movedItem);

        chrome.storage.sync.set({ prompts: newPrompts }, () => {
          loadPrompts();
        });
      });

      box.innerHTML = `
        <div class="title">${item.name}</div>
        <div class="actions">
          <button class="icon-btn copy-btn" data-index="${index}">📋</button>
          <button class="icon-btn edit-btn" data-index="${index}">✏️</button>
          <button class="icon-btn delete-btn" data-index="${index}">🗑️</button>
        </div>
      `;
      list.appendChild(box);
    });

    bindEventHandlers();
  });
}

function bindEventHandlers() {
  document.querySelectorAll('.copy-btn').forEach(btn =>
    btn.addEventListener('click', e => {
      const index = e.target.dataset.index;
      chrome.storage.sync.get(['prompts'], data => {
        const prompt = data.prompts[index];
        navigator.clipboard.writeText(prompt.text);
      });
    })
  );

  document.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', e => {
      editingIndex = e.target.dataset.index;
      chrome.storage.sync.get(['prompts'], data => {
        const prompt = data.prompts[editingIndex];
        nameInput.value = prompt.name;
        textInput.value = prompt.text;
        inputBox.style.display = 'block';
      });
    })
  );

  document.querySelectorAll('.delete-btn').forEach(btn =>
    btn.addEventListener('click', e => {
      promptToDelete = e.target.dataset.index;
      deleteConfirmation.style.display = 'block';
    })
  );
}

addBtn.addEventListener('click', () => {
  inputBox.style.display = 'block';
  nameInput.value = '';
  textInput.value = '';
  editingIndex = null;
});

saveBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  const text = textInput.value.trim();
  if (!name || !text) return;

  chrome.storage.sync.get(['prompts'], data => {
    const prompts = data.prompts || [];
    if (editingIndex !== null) {
      prompts[editingIndex] = { name, text };
    } else {
      prompts.push({ name, text });
    }
    chrome.storage.sync.set({ prompts }, () => {
      inputBox.style.display = 'none';
      loadPrompts();
    });
  });
});

confirmYes.addEventListener('click', () => {
  chrome.storage.sync.get(['prompts'], data => {
    const prompts = data.prompts || [];
    prompts.splice(promptToDelete, 1);
    chrome.storage.sync.set({ prompts }, () => {
      deleteConfirmation.style.display = 'none';
      loadPrompts();
    });
  });
});

confirmNo.addEventListener('click', () => {
  deleteConfirmation.style.display = 'none';
});

loadPrompts();


const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file');

// Export to JSON file
exportBtn.addEventListener('click', () => {
  chrome.storage.sync.get(['prompts'], data => {
    const blob = new Blob([JSON.stringify(data.prompts || [], null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-prompts-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });
});

// Import from JSON file
importBtn.addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const importedPrompts = JSON.parse(e.target.result);
      if (!Array.isArray(importedPrompts)) {
        alert('Invalid format. Expected an array.');
        return;
      }

      chrome.storage.sync.set({ prompts: importedPrompts }, () => {
        loadPrompts();
        alert('Prompts imported successfully.');
      });
    } catch (err) {
      alert('Error parsing JSON file.');
    }
  };
  reader.readAsText(file);
});

