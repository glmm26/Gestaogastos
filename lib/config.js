const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

module.exports = {
  PORTA: process.env.PORT || 3000,
  DIRETORIO_PUBLICO: path.join(ROOT_DIR, 'public'),
  DIRETORIO_UPLOADS: path.join(ROOT_DIR, 'uploads'),
  DIRETORIO_TEMPLATES: path.join(ROOT_DIR, 'templates'),
  CAMINHO_TEMPLATE_RELATORIO_PDF: path.join(ROOT_DIR, 'templates', 'relatorio-pdf.html'),
  TAMANHO_MAXIMO_FOTO_PERFIL: 2 * 1024 * 1024,
  TIPOS_PERMITIDOS_FOTO_PERFIL: {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
  },
};
