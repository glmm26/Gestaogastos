const SESSION_STORAGE_KEY = 'gestaoGastosSessao';

const profileForm = document.getElementById('profile-form');
const passwordForm = document.getElementById('password-form');
const profileNameInput = document.getElementById('profile-name');
const profileEmailInput = document.getElementById('profile-email');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmNewPasswordInput = document.getElementById('confirm-new-password');
const profilePhoto = document.getElementById('profile-photo');
const profilePhotoInput = document.getElementById('profile-photo-input');
const changePhotoButton = document.getElementById('change-photo-button');
const removePhotoButton = document.getElementById('remove-photo-button');
const profileMessage = document.getElementById('profile-message');
const passwordMessage = document.getElementById('password-message');
const photoMessage = document.getElementById('photo-message');
const saveProfileButton = document.getElementById('save-profile-button');
const savePasswordButton = document.getElementById('save-password-button');
const backToDashboardButton = document.getElementById('back-to-dashboard');
const profileTotalExpenses = document.getElementById('profile-total-expenses');
const profileTransactionsCount = document.getElementById('profile-transactions-count');
const cropperModal = document.getElementById('cropper-modal');
const cropperImage = document.getElementById('cropper-image');
const cropSaveButton = document.getElementById('crop-save-button');
const cropCancelButton = document.getElementById('crop-cancel-button');

let cropperInstance = null;
let pendingPhotoObjectUrl = '';

function readSession() {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) || 'null');
  } catch (error) {
    return null;
  }
}

function saveSession(session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function showMessage(element, text, type = '') {
  element.textContent = text;
  element.className = type ? `message ${type}` : 'message';
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function setButtonLoading(button, isLoading, loadingText) {
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : button.dataset.defaultText;
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Erro inesperado.');
  }
  return data;
}

function updateProfilePhoto(url) {
  profilePhoto.src = url || '/avatar-default.svg';
  removePhotoButton.disabled = !url || url.includes('/avatar-default.svg');
}

function validatePhotoFile(file) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!file) {
    return 'Selecione uma imagem para enviar.';
  }
  if (!allowedTypes.includes(file.type)) {
    return 'Envie apenas imagens JPG, JPEG ou PNG.';
  }
  if (file.size > 2 * 1024 * 1024) {
    return 'A imagem deve ter no máximo 2MB.';
  }
  return '';
}

function openCropperModal(imageUrl) {
  if (typeof Cropper === 'undefined') {
    throw new Error('O editor de corte não foi carregado. Recarregue a página e tente novamente.');
  }
  cropperModal.classList.remove('hidden');
  cropperImage.src = imageUrl;
  if (cropperInstance) {
    cropperInstance.destroy();
  }
  cropperInstance = new Cropper(cropperImage, {
    aspectRatio: 1,
    viewMode: 1,
    dragMode: 'move',
    background: false,
    autoCropArea: 1,
    responsive: true,
  });
}

function closeCropperModal() {
  cropperModal.classList.add('hidden');
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
  if (pendingPhotoObjectUrl) {
    URL.revokeObjectURL(pendingPhotoObjectUrl);
    pendingPhotoObjectUrl = '';
  }
  cropperImage.removeAttribute('src');
  profilePhotoInput.value = '';
}

function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Não foi possível preparar a imagem cortada.'));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

async function uploadProfilePhoto(file) {
  const session = readSession();
  const formData = new FormData();
  formData.append('email', session.email);
  formData.append('photo', file, file.name || 'perfil.png');

  setButtonLoading(changePhotoButton, true, 'Enviando...');
  setButtonLoading(cropSaveButton, true, 'Salvando...');
  try {
    const data = await apiFetch('/perfil/foto', {
      method: 'POST',
      body: formData,
    });
    updateProfilePhoto(data.foto);
    saveSession({ ...session, foto: data.foto });
    showMessage(photoMessage, data.message, 'success');
    closeCropperModal();
  } catch (error) {
    showMessage(photoMessage, error.message, 'error');
  } finally {
    setButtonLoading(changePhotoButton, false, 'Enviando...');
    setButtonLoading(cropSaveButton, false, 'Salvando...');
  }
}

async function loadProfile() {
  const session = readSession();
  if (!session?.email) {
    window.location.href = '/';
    return;
  }

  const data = await apiFetch(`/perfil?email=${encodeURIComponent(session.email)}`);
  profileNameInput.value = data.name || '';
  profileEmailInput.value = data.email || session.email;
  updateProfilePhoto(data.foto);
  profileTotalExpenses.textContent = formatCurrency(data.summary?.totalExpenses || 0);
  profileTransactionsCount.textContent = String(data.summary?.transactionsCount || 0);
  saveSession({ ...session, email: data.email, name: data.name, foto: data.foto || '/avatar-default.svg' });
}

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const session = readSession();
  const name = profileNameInput.value.trim();

  if (!name) {
    showMessage(profileMessage, 'Informe um nome válido.', 'error');
    return;
  }

  setButtonLoading(saveProfileButton, true, 'Salvando...');
  try {
    const data = await apiFetch('/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: session.email, name }),
    });
    saveSession({ ...session, ...data.user, foto: data.user?.foto || session.foto });
    showMessage(profileMessage, data.message, 'success');
  } catch (error) {
    showMessage(profileMessage, error.message, 'error');
  } finally {
    setButtonLoading(saveProfileButton, false, 'Salvando...');
  }
});

passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const session = readSession();
  const currentPassword = currentPasswordInput.value;
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmNewPasswordInput.value;

  if (newPassword.length < 6) {
    showMessage(passwordMessage, 'A nova senha deve ter pelo menos 6 caracteres.', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage(passwordMessage, 'A confirmação da nova senha deve ser igual.', 'error');
    return;
  }

  setButtonLoading(savePasswordButton, true, 'Atualizando...');
  try {
    const data = await apiFetch('/perfil/senha', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: session.email,
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });
    passwordForm.reset();
    showMessage(passwordMessage, data.message, 'success');
  } catch (error) {
    showMessage(passwordMessage, error.message, 'error');
  } finally {
    setButtonLoading(savePasswordButton, false, 'Atualizando...');
  }
});

backToDashboardButton.addEventListener('click', () => {
  window.location.href = '/';
});

changePhotoButton.addEventListener('click', () => {
  profilePhotoInput.click();
});

profilePhotoInput.addEventListener('change', async () => {
  const file = profilePhotoInput.files?.[0];
  const validationError = validatePhotoFile(file);

  if (validationError) {
    showMessage(photoMessage, validationError, 'error');
    profilePhotoInput.value = '';
    return;
  }

  try {
    pendingPhotoObjectUrl = URL.createObjectURL(file);
    openCropperModal(pendingPhotoObjectUrl);
    showMessage(photoMessage, 'Ajuste o corte e confirme para salvar a nova foto.', 'success');
  } catch (error) {
    showMessage(photoMessage, error.message, 'error');
    profilePhotoInput.value = '';
  }
});

cropCancelButton.addEventListener('click', () => {
  closeCropperModal();
  showMessage(photoMessage, 'Alteração de foto cancelada.', 'success');
});

cropperModal.addEventListener('click', (event) => {
  if (event.target === cropperModal) {
    closeCropperModal();
  }
});

cropSaveButton.addEventListener('click', async () => {
  if (!cropperInstance) {
    showMessage(photoMessage, 'Selecione uma imagem para cortar.', 'error');
    return;
  }

  try {
    const canvas = cropperInstance.getCroppedCanvas({
      width: 512,
      height: 512,
      imageSmoothingQuality: 'high',
    });
    const blob = await canvasToBlob(canvas, 'image/png', 0.92);
    const croppedFile = new File([blob], `perfil-${Date.now()}.png`, { type: 'image/png' });
    await uploadProfilePhoto(croppedFile);
  } catch (error) {
    showMessage(photoMessage, error.message, 'error');
  }
});

removePhotoButton.addEventListener('click', async () => {
  const session = readSession();
  setButtonLoading(removePhotoButton, true, 'Removendo...');
  try {
    const data = await apiFetch('/perfil/foto', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: session.email }),
    });
    updateProfilePhoto(data.foto);
    saveSession({ ...session, foto: data.foto });
    showMessage(photoMessage, data.message, 'success');
  } catch (error) {
    showMessage(photoMessage, error.message, 'error');
  } finally {
    setButtonLoading(removePhotoButton, false, 'Removendo...');
    removePhotoButton.disabled = profilePhoto.src.includes('/avatar-default.svg');
  }
});

loadProfile().catch((error) => {
  showMessage(profileMessage, error.message, 'error');
});
