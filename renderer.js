const QRCode = require('qrcode');
const jsQR = require('jsqr');

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

// Clear any previous QR code
qrCanvas.getContext('2d').clearRect(0, 0, qrCanvas.width, qrCanvas.height);

encryptBtn.addEventListener('click', () => {
  console.log('Encrypt button clicked');
  hideError('error-message-encrypt');
  const plaintext = document.getElementById('plaintext').value;
  const key = document.getElementById('encrypt-key').value;

  if (!plaintext || !key) {
    showError('error-message-encrypt', 'Error: Text and Key must not be empty.');
    return;
  }

  console.log('Encrypting text...');
  // 1. Encrypt the text
  const ciphertext = vernamCipher(plaintext, key);

  // 2. IMPORTANT: Convert binary ciphertext to Base64 to make it QR-safe
  const base64Ciphertext = btoa(ciphertext);
  console.log('Text encrypted and converted to Base64');

  // 3. Generate the QR code with proper options
  console.log('Generating QR code...');
  QRCode.toCanvas(qrCanvas, base64Ciphertext, {
    errorCorrectionLevel: 'H',
    margin: 4,
    scale: 4,
    width: 400,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  }, (error) => {
    if (error) {
      console.error('QR Generation Error:', error);
      showError('error-message-encrypt', 'Error generating QR code: ' + error.message);
    } else {
      console.log('QR code generated successfully!');
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
    
    img.onerror = () => {
      showError('error-message-decrypt', 'Error: Failed to load the image.');
    };
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          try {
            const base64Ciphertext = code.data;
            const ciphertext = atob(base64Ciphertext);
            const decryptedText = vernamCipher(ciphertext, key);
            resultText.value = decryptedText;
            hideError('error-message-decrypt');
          } catch (decryptError) {
            console.error('Decryption Error:', decryptError);
            showError('error-message-decrypt', 'Error: Invalid QR code data or wrong encryption key.');
          }
        } else {
          showError('error-message-decrypt', 'Error: No valid QR code found in the image.');
        }
      } catch (error) {
        console.error('QR Processing Error:', error);
        showError('error-message-decrypt', 'Error: Failed to process the QR code image.');
      }
    };
    
    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
});


