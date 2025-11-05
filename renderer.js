const { qrcode, jsQR } = require('electron').remote.require({
  qrcode: 'qrcode',
  jsQR: 'jsqr',
});

// --- Helper Functions ---

/**
 * Encrypts/Decrypts text using a repeating XOR key (Vernam-style).
 * @param {string} text - The input text (plaintext or ciphertext).
 * @param {string} key - The encryption key.
 * @returns {string} - The resulting text.
 */
function vernamCipher(text, key) {
  let output = '';
  for (let i = 0; i < text.length; i++) {
    const textCharCode = text.charCodeAt(i);
    const keyCharCode = key.charCodeAt(i % key.length);
    
    // XOR the character codes
    const processedCharCode = textCharCode ^ keyCharCode;
    output += String.fromCharCode(processedCharCode);
  }
  return output;
}

function showError(id, message) {
  const errorEl = document.getElementById(id);
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function hideError(id) {
  document.getElementById(id).style.display = 'none';
}


// --- Encryption Logic ---

const encryptBtn = document.getElementById('encrypt-btn');
const qrCanvas = document.getElementById('qr-canvas');

encryptBtn.addEventListener('click', () => {
  hideError('error-message-encrypt');
  const plaintext = document.getElementById('plaintext').value;
  const key = document.getElementById('encrypt-key').value;

  if (!plaintext || !key) {
    showError('error-message-encrypt', 'Error: Text and Key must not be empty.');
    return;
  }

  // 1. Encrypt the text
  const ciphertext = vernamCipher(plaintext, key);

  // 2. IMPORTANT: Convert binary ciphertext to Base64 to make it QR-safe
  const base64Ciphertext = btoa(ciphertext);

  // 3. Generate the QR code
  qrcode.toCanvas(qrCanvas, base64Ciphertext, (error) => {
    if (error) {
      console.error(error);
      showError('error-message-encrypt', 'Error generating QR code.');
    } else {
      console.log('QR code generated!');
      qrCanvas.style.display = 'block';
    }
  });
});


// --- Decryption Logic ---

const decryptBtn = document.getElementById('decrypt-btn');
const qrUpload = document.getElementById('qr-upload');

decryptBtn.addEventListener('click', () => {
  hideError('error-message-decrypt');
  const key = document.getElementById('decrypt-key').value;
  const file = qrUpload.files[0];
  const resultText = document.getElementById('decrypted-result');

  if (!file || !key) {
    showError('error-message-decrypt', 'Error: Key and QR image file must be provided.');
    return;
  }

  const reader = new FileReader();

  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Create a temporary canvas to read the image data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      // Get the pixel data from the canvas
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      
      // 1. Read the QR code data using jsQR
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        // 2. We get the Base64 data from the QR code
        const base64Ciphertext = code.data;
        
        try {
          // 3. IMPORTANT: Decode the Base64 back into binary ciphertext
          const ciphertext = atob(base64Ciphertext);

          // 4. Decrypt the ciphertext using the same Vernam function
          const decryptedText = vernamCipher(ciphertext, key);
          
          resultText.value = decryptedText;
        } catch (err) {
          console.error(err);
          showError('error-message-decrypt', 'Error: Invalid QR code data or wrong key.');
        }

      } else {
        showError('error-message-decrypt', 'Error: Could not read a QR code from the image.');
      }
    };
    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
});
